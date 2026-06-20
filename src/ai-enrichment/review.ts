/**
 * Digital Pandharpur — AI Enrichment Review Workflow
 *
 * Human-in-the-loop review for AI-generated enrichment data.
 * Editors can:
 *  - Approve enrichment as-is
 *  - Reject enrichment (with feedback for re-generation)
 *  - Edit individual fields
 *  - Batch-approve multiple results
 *
 * State transitions:
 *   needs_review → (approve) → completed
 *   needs_review → (reject + feedback) → pending (re-enqueued)
 *   completed → (reject) → pending (re-enqueued)
 */

import { db } from '../db/client';
import { reEnrichWithFeedback } from './enricher';
import { enqueueComposition } from './queue';
import type { EnrichmentInput } from './enricher';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ReviewAction {
  resultId: string;
  action: 'approve' | 'reject' | 'edit';
  /** For 'reject': feedback to improve the enrichment */
  feedback?: string;
  /** For 'edit': field-level corrections */
  edits?: Partial<{
    summary: string;
    meaning: string;
    keywords: string[];
    deity: string | null;
    festivals: string[];
    categories: string[];
    tags: string[];
    difficulty: string;
    sentiment: string;
    historicalNotes: string;
  }>;
  reviewedBy: string;
}

export interface ReviewResult {
  success: boolean;
  newStatus: string;
  message: string;
}

// ─── Review Single ──────────────────────────────────────────────────────────

/**
 * Process a single review action on an enrichment result.
 */
export async function processReview(action: ReviewAction): Promise<ReviewResult> {
  const result = await db.aiEnrichmentResult.findUnique({
    where: { id: action.resultId },
    include: { job: true },
  });

  if (!result) {
    return { success: false, newStatus: 'error', message: `Result ${action.resultId} not found` };
  }

  switch (action.action) {
    case 'approve': {
      // Mark as reviewed and approved
      await db.aiEnrichmentResult.update({
        where: { id: action.resultId },
        data: {
          reviewed: true,
          reviewApproved: true,
          reviewNotes: null,
          reviewedBy: action.reviewedBy,
          reviewedAt: new Date(),
        },
      });

      // Update job status
      await db.aiEnrichmentJob.update({
        where: { id: result.jobId },
        data: { status: 'completed' },
      });

      // Apply metadata to composition
      const { applyEnrichmentResultToComposition } = await import('./queue');
      await applyEnrichmentResultToComposition(result.compositionId, action.resultId);

      return {
        success: true,
        newStatus: 'completed',
        message: 'Enrichment approved',
      };
    }

    case 'edit': {
      // Apply field-level edits
      const updateData: Record<string, unknown> = {
        reviewed: true,
        reviewApproved: true,
        reviewedBy: action.reviewedBy,
        reviewedAt: new Date(),
      };

      if (action.edits?.summary !== undefined) updateData.summary = action.edits.summary;
      if (action.edits?.meaning !== undefined) updateData.meaning = action.edits.meaning;
      
      if (action.edits?.keywords !== undefined) {
        updateData.keywords = JSON.stringify(action.edits.keywords);
      }
      
      if (action.edits?.deity !== undefined) {
        if (action.edits.deity) {
          const { resolveDeityId } = await import('./enricher');
          updateData.deityId = await resolveDeityId(action.edits.deity);
        } else {
          updateData.deityId = null;
        }
      }
      
      if (action.edits?.festivals !== undefined) {
        const { resolveFestivalIds } = await import('./enricher');
        const festivalIds = await resolveFestivalIds(action.edits.festivals);
        updateData.festivalIds = JSON.stringify(festivalIds);
      }
      
      if (action.edits?.categories !== undefined) {
        updateData.categories = JSON.stringify(action.edits.categories);
      }
      
      if (action.edits?.tags !== undefined) {
        updateData.tags = JSON.stringify(action.edits.tags);
      }
      
      if (action.edits?.difficulty !== undefined) updateData.difficulty = action.edits.difficulty;
      if (action.edits?.sentiment !== undefined) updateData.sentiment = action.edits.sentiment;
      if (action.edits?.historicalNotes !== undefined) updateData.historicalNotes = action.edits.historicalNotes;

      await db.aiEnrichmentResult.update({
        where: { id: action.resultId },
        data: updateData as any,
      });

      await db.aiEnrichmentJob.update({
        where: { id: result.jobId },
        data: { status: 'completed' },
      });

      // Apply metadata to composition
      const { applyEnrichmentResultToComposition } = await import('./queue');
      await applyEnrichmentResultToComposition(result.compositionId, action.resultId);

      return {
        success: true,
        newStatus: 'completed',
        message: 'Enrichment edited and approved',
      };
    }

    case 'reject': {
      // Mark as rejected
      await db.aiEnrichmentResult.update({
        where: { id: action.resultId },
        data: {
          reviewed: true,
          reviewApproved: false,
          reviewNotes: action.feedback ?? 'Rejected by editor',
          reviewedBy: action.reviewedBy,
          reviewedAt: new Date(),
        },
      });

      // Re-enqueue for re-processing
      await db.aiEnrichmentJob.update({
        where: { id: result.jobId },
        data: { status: 'pending', errorMessage: action.feedback ?? 'Rejected by editor' },
      });

      return {
        success: true,
        newStatus: 'pending',
        message: `Enrichment rejected: ${action.feedback ?? 'Re-enqueued for reprocessing'}`,
      };
    }

    default:
      return { success: false, newStatus: 'error', message: `Unknown action: ${action.action}` };
  }
}

// ─── Batch Review ───────────────────────────────────────────────────────────

/**
 * Batch-approve multiple enrichment results at once.
 */
export async function batchApprove(
  resultIds: string[],
  reviewedBy: string
): Promise<{ approved: number; errors: number }> {
  let approved = 0;
  let errors = 0;

  for (const id of resultIds) {
    try {
      const result = await processReview({
        resultId: id,
        action: 'approve',
        reviewedBy,
      });
      if (result.success) approved++;
      else errors++;
    } catch {
      errors++;
    }
  }

  return { approved, errors };
}

/**
 * Get all enrichment results pending review.
 */
export async function getPendingReviews(options?: {
  limit?: number;
  offset?: number;
}): Promise<
  Array<{
    resultId: string;
    compositionId: string;
    title: string;
    type: string;
    summary: string | null;
    confidenceSummary: string | null;
    difficulty: string | null;
    sentiment: string | null;
    needsReview: boolean;
  }>
> {
  const jobs = await db.aiEnrichmentJob.findMany({
    where: { status: 'needs_review' },
    include: {
      composition: { select: { id: true, titleMarathi: true, type: true } },
      result: {
        select: {
          id: true,
          summary: true,
          confidenceSummary: true,
          difficulty: true,
          sentiment: true,
        },
      },
    },
    orderBy: { updatedAt: 'asc' },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  });

  return jobs.map((j) => ({
    resultId: j.result?.id ?? '',
    compositionId: j.composition.id,
    title: j.composition.titleMarathi,
    type: j.composition.type,
    summary: j.result?.summary ?? null,
    confidenceSummary: j.result?.confidenceSummary ?? null,
    difficulty: j.result?.difficulty ?? null,
    sentiment: j.result?.sentiment ?? null,
    needsReview: j.status === 'needs_review',
  }));
}

/**
 * Re-enrich a rejected result with editor feedback.
 */
export async function reEnrichWithEditorFeedback(
  resultId: string,
  feedback: string
): Promise<ReviewResult> {
  const result = await db.aiEnrichmentResult.findUnique({
    where: { id: resultId },
    include: {
      job: { include: { composition: true } },
    },
  });

  if (!result || !result.job.composition) {
    return { success: false, newStatus: 'error', message: 'Result or composition not found' };
  }

  const comp = result.job.composition;

  const input: EnrichmentInput = {
    compositionId: comp.id,
    fullText: comp.fullText,
    title: comp.titleMarathi,
    type: comp.type,
  };

  const enrichmentResult = await reEnrichWithFeedback(
    input,
    {
      summary: result.summary,
      meaning: result.meaning,
      keywords: result.keywords,
      deity: result.deityId,
      festivals: result.festivalIds,
      categories: result.categories,
      tags: result.tags,
      difficulty: result.difficulty,
      sentiment: result.sentiment,
      historicalNotes: result.historicalNotes,
    },
    feedback
  );

  if (enrichmentResult.success && enrichmentResult.output) {
    // Update result with new data
    await db.aiEnrichmentResult.update({
      where: { id: resultId },
      data: {
        summary: enrichmentResult.output.summary,
        meaning: enrichmentResult.output.meaning,
        keywords: enrichmentResult.output.keywords,
        tags: enrichmentResult.output.tags,
        difficulty: enrichmentResult.output.difficulty,
        sentiment: enrichmentResult.output.sentiment,
        historicalNotes: enrichmentResult.output.historicalNotes,
        rawResponse: enrichmentResult.rawResponse,
        reviewed: false,
        reviewApproved: null,
      },
    });

    return {
      success: true,
      newStatus: 'needs_review',
      message: 'Re-enrichment complete, pending review',
    };
  }

  return {
    success: false,
    newStatus: 'error',
    message: enrichmentResult.error ?? 'Re-enrichment failed',
  };
}
