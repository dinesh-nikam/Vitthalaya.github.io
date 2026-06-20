/**
 * Digital Pandharpur — AI Enrichment Batch Processor
 *
 * Batch enrichment pipeline that processes compositions in bulk.
 * Handles:
 *  - Enqueueing all unmatched compositions
 *  - Throttled concurrent processing
 *  - Progress tracking with callbacks
 *  - Graceful shutdown on interrupt
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { db } from '../db/client';
import { enqueueComposition, drainQueue, getQueueStats, retryFailedJobs } from './queue';
import { workCycle } from './queue';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BatchEnrichOptions {
  /** Max compositions to enqueue */
  limit?: number;
  /** Only process compositions without any enrichment */
  skipEnriched?: boolean;
  /** Composition type filter */
  type?: string;
  /** Number of concurrent workers */
  concurrency?: number;
  /** Dry run (don't actually process) */
  dryRun?: boolean;
  /** Also retry failed jobs first */
  retryFailed?: boolean;
  /** Callback for progress updates */
  onProgress?: (stats: { processed: number; total: number; failed?: number }) => void;
}

export interface BatchEnrichResult {
  enqueued: number;
  processed: number;
  failed: number;
  pendingBefore: number;
  pendingAfter: number;
  durationMs: number;
}

// ─── Enqueue Batch ──────────────────────────────────────────────────────────

/**
 * Find compositions that need enrichment and enqueue them.
 */
export async function enqueueBatch(options: BatchEnrichOptions = {}): Promise<number> {
  const where: Record<string, unknown> = {};

  if (options.skipEnriched !== false) {
    // Find compositions that don't have a completed enrichment result
    const enrichedIds = await db.aiEnrichmentResult.findMany({
      select: { compositionId: true },
      distinct: ['compositionId'],
    });
    where.id = { notIn: enrichedIds.map((r) => r.compositionId) };
  }

  if (options.type) {
    where.type = options.type;
  }

  const compositions = await db.composition.findMany({
    where: where as any,
    select: { id: true },
    take: options.limit ?? 500,
    orderBy: { createdAt: 'asc' },
  });

  let enqueued = 0;

  for (const comp of compositions) {
    try {
      if (!options.dryRun) {
        await enqueueComposition(comp.id);
      }
      enqueued++;
    } catch {
      // Skip if already enqueued
    }
  }

  return enqueued;
}

// ─── Process With Concurrency ───────────────────────────────────────────────

/**
 * Process the enrichment queue with N concurrent workers.
 * Each worker pulls jobs from the queue and processes them.
 */
export async function processWithConcurrency(
  concurrency: number = 1,
  options?: {
    maxJobs?: number;
    onProgress?: (stats: { processed: number; total: number; failed?: number }) => void;
  }
): Promise<number> {
  let totalProcessed = 0;
  const maxJobs = options?.maxJobs ?? Infinity;

  // Initial queue state
  const initialStats = await getQueueStats();
  let pending = initialStats.pending;

  if (pending === 0) return 0;

  // Launch workers
  const workers: Promise<void>[] = [];

  for (let i = 0; i < concurrency; i++) {
    workers.push(
      (async () => {
        while (totalProcessed < maxJobs) {
          const worked = await workCycle();
          if (!worked) break;
          totalProcessed++;
          pending--;

          if (options?.onProgress) {
            options.onProgress({ processed: totalProcessed, total: initialStats.pending });
          }
        }
      })()
    );
  }

  await Promise.all(workers);
  return totalProcessed;
}

// ─── Full Batch Pipeline ────────────────────────────────────────────────────

/**
 * Run a complete batch enrichment pipeline:
 *  1. (optional) Retry failed jobs
 *  2. Enqueue pending compositions
 *  3. Process with concurrency
 *  4. Return stats
 */
export async function runBatchPipeline(
  options: BatchEnrichOptions = {}
): Promise<BatchEnrichResult> {
  const startTime = Date.now();

  const statsBefore = await getQueueStats();

  // Step 1: Retry failed jobs
  if (options.retryFailed) {
    const retried = await retryFailedJobs();
    if (!options.dryRun && retried > 0) {
      console.log(`  Retried ${retried} failed jobs`);
    }
  }

  // Step 2: Enqueue
  const enqueued = await enqueueBatch(options);
  if (!options.dryRun && enqueued > 0) {
    console.log(`  Enqueued ${enqueued} compositions`);
  }

  if (options.dryRun) {
    return {
      enqueued,
      processed: 0,
      failed: 0,
      pendingBefore: statsBefore.pending,
      pendingAfter: statsBefore.pending + enqueued,
      durationMs: Date.now() - startTime,
    };
  }

  // Step 3: Process
  const concurrency = options.concurrency ?? 1;
  const processed = await processWithConcurrency(concurrency, {
    onProgress: options.onProgress,
  });

  const statsAfter = await getQueueStats();

  return {
    enqueued,
    processed,
    failed: statsAfter.failed,
    pendingBefore: statsBefore.pending,
    pendingAfter: statsAfter.pending,
    durationMs: Date.now() - startTime,
  };
}
