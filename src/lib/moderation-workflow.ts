import { db } from '../db/client';
import { resolveFreeConfig } from '../ai-enrichment/free-provider';
import { v4 as uuidv4 } from 'uuid';

/**
 * Submits a new text composition (from OCR or volunteer edit) into the moderation queue
 */
export async function submitToModeration(
  sourceType: 'ocr' | 'suggestion',
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
    await promoteAndPublish(item);
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
    await promoteAndPublish({ ...item, consensusScore: newScore });
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
 * Promotes approved moderation items to active production tables
 */
async function promoteAndPublish(item: any): Promise<void> {
  await db.$transaction(async (tx) => {
    let compositionId: string | null = null;

    if (item.sourceType === 'ocr') {
      // Generate unique slug
      const cleanTitle = item.draftTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-');
      const slug = `${cleanTitle || 'abhang'}-${uuidv4().substring(0, 8)}`;

      // Create composition
      const comp = await tx.composition.create({
        data: {
          titleMarathi: item.draftTitle,
          titleTranslit: cleanTitle || 'Abhang',
          slug,
          type: 'अभंग',
          fullText: item.draftText,
          meaning: item.draftMeaning,
          reviewed: true,
        },
      });
      compositionId = comp.id;

      // Update upload status
      await tx.manuscriptUpload.update({
        where: { id: item.sourceId },
        data: { status: 'ocr_completed' },
      });
    } else if (item.sourceType === 'suggestion') {
      // Apply correction suggestion directly to composition
      const suggestion = await tx.correctionSuggestion.findUnique({
        where: { id: item.sourceId },
      });

      if (suggestion) {
        compositionId = suggestion.compositionId;
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
  });
}
