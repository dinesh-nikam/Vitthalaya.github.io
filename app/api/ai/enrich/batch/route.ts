/**
 * Digital Pandharpur — AI Enrichment Batch API
 *
 * POST /api/ai/enrich/batch
 *   Enqueue multiple compositions for enrichment.
 *   Body: { limit?: number, type?: string, skipEnriched?: boolean, retryFailed?: boolean }
 *
 * POST /api/ai/enrich/batch?process=true
 *   Enqueue and immediately process with concurrent workers.
 *   Body: { limit?: number, type?: string, concurrency?: number, ... }
 *
 * GET /api/ai/enrich/batch
 *   Returns batch pipeline status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { enqueueBatch, getQueueStats } from '@/src/ai-enrichment';

// ─── POST: Enqueue or enqueue+process ──────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      limit,
      type,
      skipEnriched,
      retryFailed,
      dryRun,
    } = body as {
      limit?: number;
      type?: string;
      skipEnriched?: boolean;
      retryFailed?: boolean;
      dryRun?: boolean;
    };

    const shouldProcess = request.nextUrl.searchParams.get('process') === 'true';

    if (shouldProcess) {
      // Full pipeline: enqueue + process
      const { runBatchPipeline } = await import('@/src/ai-enrichment');

      const concurrency = (body as { concurrency?: number }).concurrency ?? 1;

      const result = await runBatchPipeline({
        limit,
        type,
        skipEnriched: skipEnriched !== false,
        retryFailed: retryFailed ?? false,
        dryRun: dryRun ?? false,
        concurrency,
      });

      return NextResponse.json({
        action: 'enqueue_and_process',
        enqueued: result.enqueued,
        processed: result.processed,
        failed: result.failed,
        pendingBefore: result.pendingBefore,
        pendingAfter: result.pendingAfter,
        durationMs: result.durationMs,
      });
    }

    // Just enqueue
    const enqueued = await enqueueBatch({
      limit,
      type,
      skipEnriched: skipEnriched !== false,
      dryRun: dryRun ?? false,
    });

    return NextResponse.json({
      action: 'enqueue_only',
      enqueued,
      dryRun: dryRun ?? false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to run batch enrichment';
    console.error('[AI Enrich] Batch error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── GET: Batch status ─────────────────────────────────────────────────────

export async function GET(_request: NextRequest) {
  try {
    const stats = await getQueueStats();

    return NextResponse.json({
      queue: stats,
      ready: stats.pending > 0 || stats.failed > 0 || stats.needsReview > 0,
      summary: {
        pendingToProcess: stats.pending,
        failedRetryable: stats.failed,
        awaitingReview: stats.needsReview,
        completed: stats.completed,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch batch status';
    console.error('[AI Enrich] Batch status error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
