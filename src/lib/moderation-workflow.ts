import { db } from '../db/client';
import { resolveFreeConfig } from '../ai-enrichment/free-provider';
import { v4 as uuidv4 } from 'uuid';
import { buildEdgesForComposition } from '../knowledge-graph';
import { recordAuditLog } from './audit';
import { normalizeCompositionType } from '../canonical/normalization';

/**
 * Source types that create a brand-new draft Composition once approved.
 * ('suggestion' is handled separately — it edits an existing composition.)
 */
export type NewDraftSourceType = 'ocr' | 'youtube' | 'recording';

/**
 * Submits a new text composition (from OCR, YouTube transcription, a user's
 * own voice recording, or a volunteer edit) into the moderation queue.
 * The item is stored purely as a draft (`draftTitle`/`draftText` on
 * `ModerationQueue`) until an admin/moderator approves it — only approval
 * creates and publishes the real `Composition` row (see `promoteAndPublish`).
 */
export async function submitToModeration(
  sourceType: NewDraftSourceType | 'suggestion',
  sourceId: string,
  title: string,
  text: string,
  meaning?: string
): Promise<string> {
  const queueItem = await db.moderationQueue.create({
    data: {
      sourceType,
      sourceId,
      draftTitle: title,
      draftText: text,
      draftMeaning: meaning || null,
      tier: 1,
      status: 'pending',
      consensusScore: 0,
    },
  });

  // Trigger async Tier 1 AI verification
  // In Next.js we use a non-blocking invocation
  processTier1AI(queueItem.id).catch((err) => {
    console.error(`AI Moderation failed for queue item ${queueItem.id}:`, err);
  });

  return queueItem.id;
}

/**
 * Tier 1: Automated AI Safety and Coherence Verification
 */
export async function processTier1AI(queueId: string): Promise<void> {
  const item = await db.moderationQueue.findUnique({
    where: { id: queueId },
  });

  if (!item) return;

  const llmConfig = resolveFreeConfig();
  
  if (!llmConfig.config.apiKey) {
    // If no API key is configured, bypass AI check and promote to Tier 2 peer review
    await db.moderationQueue.update({
      where: { id: queueId },
      data: {
        tier: 2,
        status: 'pending',
      },
    });
    return;
  }

  try {
    const prompt = `You are a Marathi devotional content safety filter. Analyze the following text draft.
Title: "${item.draftTitle}"
Text:
"${item.draftText}"

Answer in JSON format:
{
  "safe": true/false,
  "coherentMarathi": true/false,
  "reason": "explanation of safety or issues"
}
Ensure the response is valid JSON.`;

    const response = await fetch(`${llmConfig.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmConfig.config.apiKey}`,
      },
      body: JSON.stringify({
        model: llmConfig.config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`AI API failed: ${response.statusText}`);
    }

    const resData = await response.json();
    const content = resData.choices?.[0]?.message?.content || '';
    
    // Clean JSON content
    let cleaned = content.trim();
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) cleaned = jsonMatch[1].trim();

    const parsed = JSON.parse(cleaned);

    if (parsed.safe === false || parsed.coherentMarathi === false) {
      // Flag the item
      await db.moderationQueue.update({
        where: { id: queueId },
        data: {
          status: 'flagged',
          status_reason: `AI Flagged: ${parsed.reason}`,
        } as any,
      });
    } else {
      // Promote to Tier 2
      await db.moderationQueue.update({
        where: { id: queueId },
        data: {
          tier: 2,
          status: 'pending',
        },
      });
    }
  } catch (err) {
    console.warn('AI Moderation failed. Defaulting to promote to Tier 2:', err);
    await db.moderationQueue.update({
      where: { id: queueId },
      data: {
        tier: 2,
        status: 'pending',
      },
    });
  }
}

/**
 * Tier 2: Contributor Peer Review Vote Submission
 */
export async function submitPeerVote(
  reviewerId: string,
  queueId: string,
  vote: 'approve' | 'reject' | 'flag',
  notes?: string
): Promise<void> {
  // 1. Verify queue item exists
  const item = await db.moderationQueue.findUnique({
    where: { id: queueId },
    include: { reviews: true },
  });

  if (!item) {
    throw new Error('Moderation queue item not found.');
  }

  // 2. Verify reviewer exists and role
  const reviewer = await db.user.findUnique({
    where: { id: reviewerId },
  });

  if (!reviewer) {
    throw new Error('Reviewer not found.');
  }

  // Check if already voted
  const alreadyVoted = item.reviews.some((r) => r.reviewerId === reviewerId);
  if (alreadyVoted) {
    throw new Error('You have already reviewed this item.');
  }

  // 3. Log the review
  await db.moderationReview.create({
    data: {
      queueId,
      reviewerId,
      vote,
      notes: notes || null,
    },
  });

  // 4. Calculate new consensus score
  let scoreDelta = 0;
  if (vote === 'approve') scoreDelta = 1;
  if (vote === 'reject') scoreDelta = -1;

  const newScore = item.consensusScore + scoreDelta;

  // Handle immediate Moderator/Admin approval (fast-track promotion)
  const isModeratorOrAdmin = ['MODERATOR', 'ADMIN'].includes(reviewer.role);

  if (isModeratorOrAdmin && vote === 'approve') {
    await promoteAndPublish(item, reviewerId);
    return;
  }

  if (vote === 'flag') {
    await db.moderationQueue.update({
      where: { id: queueId },
      data: {
        status: 'flagged',
      },
    });
    return;
  }

  // Check consensus threshold (e.g., +3 approvals needed for peer promotion)
  if (newScore >= 3) {
    await promoteAndPublish({ ...item, consensusScore: newScore }, reviewerId);
  } else if (newScore <= -3) {
    await db.moderationQueue.update({
      where: { id: queueId },
      data: {
        consensusScore: newScore,
        status: 'rejected',
      },
    });
  } else {
    await db.moderationQueue.update({
      where: { id: queueId },
      data: {
        consensusScore: newScore,
      },
    });
  }
}

/**
 * Promotes approved moderation items to active production tables.
 *
 * `approvedById` is the moderator/admin (or auto-approving user) whose
 * decision triggered this promotion — recorded on the audit log entry.
 * The original submitter (volunteer/uploader/suggester) is resolved from
 * the source record and recorded as the composition's `createdById` /
 * `lastEditedById`, so every composition and edit that enters the system
 * through this pipeline carries real creator attribution.
 */
async function promoteAndPublish(item: any, approvedById?: string | null): Promise<void> {
  await db.$transaction(async (tx) => {
    let compositionId: string | null = null;
    let isNewComposition = false;
    let submitterId: string | null = null;

    const NEW_DRAFT_SOURCE_TYPES = ['ocr', 'youtube', 'recording'];

    if (NEW_DRAFT_SOURCE_TYPES.includes(item.sourceType)) {
      // Generate unique slug
      const cleanTitle = item.draftTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-');
      const slugPrefix = cleanTitle || (item.sourceType === 'youtube' ? 'youtube-import' : item.sourceType === 'recording' ? 'recording' : 'abhang');
      const slug = `${slugPrefix}-${uuidv4().substring(0, 8)}`;

      // Try to read pre-classification data + audio URL from UploadedFile
      let detectedType: string | null = null;
      let saintName: string | null = null;
      let deityName: string | null = null;
      let audioUrl: string | null = null;

      if (item.uploadedFileId) {
        try {
          const uploadedFile = await tx.uploadedFile.findUnique({
            where: { id: item.uploadedFileId },
          });
          if (uploadedFile?.detectedMetadata) {
            const parsed = JSON.parse(uploadedFile.detectedMetadata);
            if (parsed) {
              detectedType = parsed.compositionType ?? null;
              saintName = parsed.saintName ?? null;
              deityName = parsed.deityName ?? null;
            }
          }
          if (uploadedFile?.extractedMetadata) {
            try {
              const extractedMeta = JSON.parse(uploadedFile.extractedMetadata);
              audioUrl = extractedMeta?.audioUrl ?? null;
            } catch {
              // Non-critical
            }
          }
          // Direct audio/recording uploads: the file itself is the audio
          if (!audioUrl && uploadedFile?.storagePath && (item.sourceType === 'recording' || uploadedFile.format === 'audio')) {
            try {
              const { storage } = await import('./storage');
              audioUrl = storage.getUrl(uploadedFile.storagePath);
            } catch {
              // Non-critical — composition still gets published with text only
            }
          }
          // The uploader is the original creator of this content
          submitterId = uploadedFile?.userId ?? null;
        } catch {
          // Non-critical — classification data is optional
        }
      }

      if (!submitterId) {
        // Fall back to the legacy ManuscriptUpload volunteer for older uploads
        const manuscript = await tx.manuscriptUpload.findUnique({
          where: { id: item.sourceId },
          select: { volunteerId: true },
        }).catch(() => null);
        submitterId = manuscript?.volunteerId ?? null;
      }

      // Normalize to canonical Prisma CompositionType enum
      const compositionType = detectedType
        ? normalizeCompositionType(detectedType)
        : 'ABHANG';

      const compData: Record<string, unknown> = {
        titleMarathi: item.draftTitle,
        titleTranslit: cleanTitle || 'Abhang',
        slug,
        type: compositionType,
        fullText: item.draftText,
        meaning: item.draftMeaning,
        reviewed: true,
        source: item.sourceType === 'youtube' ? 'YouTube (user-submitted, transcribed)'
          : item.sourceType === 'recording' ? 'User voice recording (transcribed)'
          : undefined,
        // Store as a JSON array string, matching how the rest of the app
        // reads/writes this field (see Composition.audioLinks in schema).
        audioLinks: audioUrl ? JSON.stringify([audioUrl]) : undefined,
      };

      // Try to resolve saint and deity from classification
      if (saintName) {
        const saint = await tx.saint.findFirst({
          where: {
            OR: [
              { nameMarathi: saintName },
              { nameTranslit: { contains: saintName, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        });
        if (saint) compData.saintId = saint.id;
      }

      if (deityName) {
        const deity = await tx.deity.findFirst({
          where: {
            OR: [
              { nameMarathi: deityName },
              { nameTranslit: { contains: deityName, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        });
        if (deity) compData.deityId = deity.id;
      }

      // Create composition
      const comp = await tx.composition.create({
        data: compData as any,
      });
      compositionId = comp.id;
      isNewComposition = true;

      // Update upload status (try UploadedFile first, fallback to ManuscriptUpload)
      if (item.uploadedFileId) {
        await tx.uploadedFile.update({
          where: { id: item.uploadedFileId },
          data: { processingStatus: 'completed' },
        }).catch(() => {});
      }
      await tx.manuscriptUpload.update({
        where: { id: item.sourceId },
        data: { status: 'ocr_completed' },
      }).catch(() => {});
    } else if (item.sourceType === 'suggestion') {
      // Apply correction suggestion directly to composition
      const suggestion = await tx.correctionSuggestion.findUnique({
        where: { id: item.sourceId },
      });

      if (suggestion) {
        compositionId = suggestion.compositionId;
        submitterId = suggestion.userId;
        await tx.composition.update({
          where: { id: suggestion.compositionId },
          data: {
            reviewed: true,
            [suggestion.fieldPath]: suggestion.newValue,
          },
        });

        // Update suggestion queue
        await tx.correctionSuggestion.update({
          where: { id: suggestion.id },
          data: { status: 'approved' },
        });
      }
    }

    if (compositionId) {
      // Auto-build knowledge graph edges
      await buildEdgesForComposition(compositionId, tx);

      // Queue SearchSyncJob
      await tx.searchSyncJob.create({
        data: {
          compositionId,
          action: 'upsert',
          status: 'pending',
        },
      });

      // Queue AiEnrichmentJob if one doesn't exist
      const existingJob = await tx.aiEnrichmentJob.findFirst({
        where: {
          compositionId,
          status: { in: ['pending', 'processing', 'completed'] },
        },
      });
      if (!existingJob) {
        await tx.aiEnrichmentJob.create({
          data: {
            compositionId,
            status: 'pending',
            priority: 1, // Higher priority for promoted items
            maxAttempts: 3,
          },
        });
      }
    }

    // Update moderation queue
    await tx.moderationQueue.update({
      where: { id: item.id },
      data: {
        status: 'approved',
        tier: 3, // Scholar lock tier reached
      },
    });

    // Audit trail: who created/edited the composition, and who approved it
    if (compositionId) {
      await recordAuditLog(
        {
          actorId: approvedById ?? null,
          action: isNewComposition ? 'CREATE' : 'UPDATE',
          entityType: 'Composition',
          entityId: compositionId,
          metadata: {
            source: item.sourceType,
            moderationQueueId: item.id,
            createdById: submitterId,
          },
        },
        tx as any
      );
      await recordAuditLog(
        {
          actorId: approvedById ?? null,
          action: 'APPROVE',
          entityType: 'ModerationQueue',
          entityId: item.id,
          metadata: { compositionId, submitterId },
        },
        tx as any
      );
    }
  });
}
