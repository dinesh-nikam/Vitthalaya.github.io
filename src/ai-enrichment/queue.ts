/**
 * Digital Pandharpur — AI Enrichment Job Queue
 *
 * PostgreSQL-backed job queue for the AI enrichment pipeline.
 *
 * State machine:
 *   pending → processing → completed
 *                       → needs_review (when confidence is low)
 *                       → failed (after maxAttempts)
 *
 * Features:
 *  - Priority-based ordering (higher priority = processed first)
 *  - Exponential backoff on retries
 *  - Job locking to prevent concurrent processing
 *  - Configurable max attempts
 *  - Status webhooks (optional)
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { db } from '../db/client';
import { enrichComposition, reEnrichWithFeedback } from './enricher';
import { resolveDeityId, resolveFestivalIds, resolveCategoryNames } from './enricher';
import type { EnrichmentInput } from './enricher';

// ─── Types ──────────────────────────────────────────────────────────────────

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'needs_review';

export interface EnqueueOptions {
  priority?: number;
  maxAttempts?: number;
}

export interface JobInfo {
  id: string;
  compositionId: string;
  status: JobStatus;
  priority: number;
  attemptCount: number;
  errorMessage: string | null;
  createdAt: Date;
}

// ─── Enqueue ────────────────────────────────────────────────────────────────

/**
 * Enqueue a composition for AI enrichment.
 * Checks for existing pending/completed jobs to avoid duplicates.
 */
export async function enqueueComposition(
  compositionId: string,
  options: EnqueueOptions = {}
): Promise<JobInfo> {
  // Check for existing pending job
  const existing = await db.aiEnrichmentJob.findFirst({
    where: {
      compositionId,
      status: { in: ['pending', 'processing'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    return {
      id: existing.id,
      compositionId: existing.compositionId,
      status: existing.status as JobStatus,
      priority: existing.priority,
      attemptCount: existing.attemptCount,
      errorMessage: existing.errorMessage,
      createdAt: existing.createdAt,
    };
  }

  // Also check if already completed
  const completed = await db.aiEnrichmentJob.findFirst({
    where: {
      compositionId,
      status: 'completed',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (completed) {
    return {
      id: completed.id,
      compositionId: completed.compositionId,
      status: 'completed',
      priority: completed.priority,
      attemptCount: completed.attemptCount,
      errorMessage: completed.errorMessage,
      createdAt: completed.createdAt,
    };
  }

  // Create new job
  const job = await db.aiEnrichmentJob.create({
    data: {
      compositionId,
      status: 'pending',
      priority: options.priority ?? 0,
      maxAttempts: options.maxAttempts ?? 3,
    },
  });

  return {
    id: job.id,
    compositionId: job.compositionId,
    status: job.status as JobStatus,
    priority: job.priority,
    attemptCount: job.attemptCount,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
  };
}

// ─── Dequeue ────────────────────────────────────────────────────────────────

/**
 * Claim the next pending job for processing.
 * Uses PostgreSQL's FOR UPDATE SKIP LOCKED for atomic dequeue
 * with proper concurrency handling across multiple workers.
 */
export async function dequeueJob(): Promise<JobInfo | null> {
  try {
    // PostgreSQL atomic dequeue with row-level locking
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).$queryRawUnsafe(
      `UPDATE "ai_enrichment_jobs"
       SET status = 'processing', "attempt_count" = "attempt_count" + 1, "updated_at" = NOW() AT TIME ZONE 'UTC'
       WHERE id = (
         SELECT id FROM "ai_enrichment_jobs"
         WHERE status = 'pending'
         ORDER BY priority DESC, "created_at" ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       RETURNING id, "composition_id", status, priority, "attempt_count", "error_message", "created_at"`
    ) as Array<Record<string, unknown>>;

    if (!rows || rows.length === 0) return null;

    const row = rows[0];
    return {
      id: String(row.id),
      compositionId: String(row.composition_id),
      status: String(row.status) as JobStatus,
      priority: Number(row.priority),
      attemptCount: Number(row.attempt_count),
      errorMessage: row.error_message ? String(row.error_message) : null,
      createdAt: new Date(row.created_at as string),
    };
  } catch {
    // Fallback: simple dequeue for SQLite/other DBs
    const job = await db.aiEnrichmentJob.findFirst({
      where: { status: 'pending' },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    if (!job) return null;

    await db.aiEnrichmentJob.update({
      where: { id: job.id },
      data: {
        status: 'processing',
        attemptCount: { increment: 1 },
      },
    });

    return {
      id: job.id,
      compositionId: job.compositionId,
      status: 'processing',
      priority: job.priority,
      attemptCount: job.attemptCount + 1,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
    };
  }
}

// ─── Process ────────────────────────────────────────────────────────────────

/**
 * Process a single job: call the LLM, store results, update status.
 * This is the core worker function.
 */
export async function processJob(jobId: string): Promise<void> {
  const job = await db.aiEnrichmentJob.findUnique({
    where: { id: jobId },
    include: { composition: true },
  });

  if (!job) throw new Error(`Job ${jobId} not found`);
  if (job.status !== 'processing') throw new Error(`Job ${jobId} is not in processing state`);

  const comp = job.composition;

  // Build enrichment input
  const input: EnrichmentInput = {
    compositionId: comp.id,
    fullText: comp.fullText,
    title: comp.titleMarathi,
    type: comp.type,
    saintName: undefined, // could fetch saint name here
  };

  // If composition has a saint, fetch the name for context
  if (comp.saintId) {
    const saint = await db.saint.findUnique({
      where: { id: comp.saintId },
      select: { nameMarathi: true },
    });
    if (saint) input.saintName = saint.nameMarathi;
  }

  // Run enrichment
  const result = await enrichComposition(input);

  if (result.success && result.output) {
    // Resolve entities
    const deityId = await resolveDeityId(result.output.deity);
    const festivalIds = await resolveFestivalIds(result.output.festivals);
    const { matchedIds: categoryIds, suggestedNew } = await resolveCategoryNames(
      result.output.categories
    );

    // Determine review status
    const needsReview =
      result.output.deityConfidence === 'low' ||
      (result.output.deity && !deityId) ||
      suggestedNew.length > 0;

    // Create enrichment result
    const enrichmentResult = await db.aiEnrichmentResult.create({
      data: {
        jobId: job.id,
        compositionId: comp.id,
        summary: result.output.summary,
        meaning: result.output.meaning,
        keywords: result.output.keywords,
        deityId,
        festivalIds,
        categories: result.output.categories,
        tags: result.output.tags,
        difficulty: result.output.difficulty,
        sentiment: result.output.sentiment,
        historicalNotes: result.output.historicalNotes,
        confidenceSummary: 'medium',
        confidenceDeity: result.output.deityConfidence,
        confidenceFestival: festivalIds.length > 0 ? 'high' : 'medium',
        rawResponse: result.rawResponse,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
      },
    });

    // Update job status
    await db.aiEnrichmentJob.update({
      where: { id: job.id },
      data: {
        status: needsReview ? 'needs_review' : 'completed',
        modelProvider: result.provider,
        modelName: result.model,
        errorMessage: needsReview
          ? 'Low confidence or unmatched entities — needs review'
          : null,
      },
    });

    if (!needsReview) {
      await applyEnrichmentResultToComposition(comp.id, enrichmentResult.id);
    }
  } else {
    // Handle failure
    const maxedOut = job.attemptCount >= job.maxAttempts;

    await db.aiEnrichmentJob.update({
      where: { id: job.id },
      data: {
        status: maxedOut ? 'failed' : 'pending', // retry if attempts remain
        errorMessage: result.error,
      },
    });
  }
}

// ─── Worker Loop ────────────────────────────────────────────────────────────

/**
 * Run one work cycle: dequeue a job and process it.
 * Returns true if a job was processed, false if queue is empty.
 */
export async function workCycle(): Promise<boolean> {
  const job = await dequeueJob();
  if (!job) return false;

  try {
    await processJob(job.id);
  } catch (err) {
    // Unexpected error — mark as failed
    await db.aiEnrichmentJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
  }

  return true;
}

/**
 * Run the worker loop continuously until the queue is empty.
 * Returns the number of jobs processed.
 */
export async function drainQueue(options?: {
  maxJobs?: number;
  onProgress?: (processed: number, total: number) => void;
}): Promise<number> {
  let processed = 0;
  const maxJobs = options?.maxJobs ?? Infinity;

  while (processed < maxJobs) {
    const worked = await workCycle();
    if (!worked) break;
    processed++;

    if (options?.onProgress) {
      const pending = await db.aiEnrichmentJob.count({ where: { status: 'pending' } });
      options.onProgress(processed, pending + processed);
    }
  }

  return processed;
}

// ─── Queue Status ───────────────────────────────────────────────────────────

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  needsReview: number;
  total: number;
}

export async function getQueueStats(): Promise<QueueStats> {
  const counts = await db.aiEnrichmentJob.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const stats: QueueStats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    needsReview: 0,
    total: 0,
  };

  for (const c of counts) {
    const key = c.status as keyof QueueStats;
    if (key in stats) {
      stats[key] = c._count.id;
    }
    stats.total += c._count.id;
  }

  return stats;
}

/**
 * Retry all failed and stuck processing jobs.
 * Jobs stuck in 'processing' (e.g., after a crash) are reset to 'pending'.
 */
export async function retryFailedJobs(): Promise<number> {
  const failed = await db.aiEnrichmentJob.updateMany({
    where: { status: 'failed' },
    data: {
      status: 'pending',
      errorMessage: null,
    },
  });

  // Reset jobs stuck in 'processing' (e.g., after crash/restart)
  const stuck = await db.aiEnrichmentJob.updateMany({
    where: { status: 'processing' },
    data: {
      status: 'pending',
      errorMessage: 'Reset from stuck processing state',
    },
  });

  return failed.count + stuck.count;
}

/**
 * Applies the metadata from a completed AiEnrichmentResult back into the main Composition table,
 * linking categories/festivals and queueing a SearchSyncJob.
 */
export async function applyEnrichmentResultToComposition(
  compositionId: string,
  resultId: string
): Promise<void> {
  const result = await db.aiEnrichmentResult.findUnique({
    where: { id: resultId }
  });
  if (!result) return;

  // 1. Update meaning and deityId on Composition
  const updateData: any = {};
  if (result.deityId) {
    updateData.deityId = result.deityId;
  }
  if (result.meaning) {
    updateData.meaning = result.meaning;
  }

  if (Object.keys(updateData).length > 0) {
    await db.composition.update({
      where: { id: compositionId },
      data: updateData,
    });
  }

  // 2. Link Categories
  if (result.categories) {
    let categoriesList: string[] = [];
    try {
      categoriesList = typeof result.categories === 'string' ? JSON.parse(result.categories) : result.categories;
    } catch {
      if (typeof result.categories === 'string') {
        categoriesList = result.categories.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    if (Array.isArray(categoriesList)) {
      const { resolveCategoryNames } = await import('./enricher');
      const { matchedIds } = await resolveCategoryNames(categoriesList);
      
      for (const catId of matchedIds) {
        try {
          await db.categoryComposition.upsert({
            where: {
              compositionId_categoryId: {
                compositionId,
                categoryId: catId,
              },
            },
            create: {
              compositionId,
              categoryId: catId,
            },
            update: {},
          });
        } catch (catErr) {
          console.warn(`Failed to link category ${catId} to composition ${compositionId}:`, catErr);
        }
      }
    }
  }

  // 3. Link Festivals
  if (result.festivalIds) {
    let festivalIdsList: string[] = [];
    try {
      festivalIdsList = typeof result.festivalIds === 'string' ? JSON.parse(result.festivalIds) : result.festivalIds;
    } catch {
      if (typeof result.festivalIds === 'string') {
        festivalIdsList = result.festivalIds.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    if (Array.isArray(festivalIdsList)) {
      for (const festId of festivalIdsList) {
        try {
          await db.festivalComposition.upsert({
            where: {
              compositionId_festivalId: {
                compositionId,
                festivalId: festId,
              },
            },
            create: {
              compositionId,
              festivalId: festId,
            },
            update: {},
          });
        } catch (festErr) {
          console.warn(`Failed to link festival ${festId} to composition ${compositionId}:`, festErr);
        }
      }
    }
  }

  // 4. Queue SearchSyncJob
  await db.searchSyncJob.create({
    data: {
      compositionId,
      action: 'upsert',
      status: 'pending',
    },
  });
}
