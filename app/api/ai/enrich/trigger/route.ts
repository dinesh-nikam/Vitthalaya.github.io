/**
 * Digital Pandharpur — AI Enrichment Trigger API
 *
 * POST /api/ai/enrich/trigger
 *   Enqueue a single composition for AI enrichment.
 *   Body: { compositionId: string, priority?: number, maxAttempts?: number }
 *
 * GET /api/ai/enrich/trigger
 *   Check if a composition already has a pending/completed job.
 *   Query: compositionId: string
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { enqueueComposition, getQueueStats } from '@/src/ai-enrichment';

// ─── POST: Enqueue ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { compositionId, priority, maxAttempts } = body as {
      compositionId?: string;
      priority?: number;
      maxAttempts?: number;
    };

    if (!compositionId || typeof compositionId !== 'string') {
      return NextResponse.json(
        { error: 'compositionId is required (string)' },
        { status: 400 }
      );
    }

    // Verify composition exists
    const composition = await db.composition.findUnique({
      where: { id: compositionId },
      select: { id: true, titleMarathi: true },
    });

    if (!composition) {
      return NextResponse.json(
        { error: `Composition ${compositionId} not found` },
        { status: 404 }
      );
    }

    const job = await enqueueComposition(compositionId, { priority, maxAttempts });

    return NextResponse.json({
      jobId: job.id,
      compositionId: job.compositionId,
      status: job.status,
      isNew: job.attemptCount === 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to enqueue composition';
    console.error('[AI Enrich] Trigger error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── GET: Check existing job ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const compositionId = request.nextUrl.searchParams.get('compositionId');

    if (compositionId) {
      const job = await db.aiEnrichmentJob.findFirst({
        where: { compositionId },
        orderBy: { createdAt: 'desc' },
        include: {
          result: {
            select: {
              id: true,
              summary: true,
              reviewed: true,
              confidenceSummary: true,
            },
          },
        },
      });

      if (!job) {
        return NextResponse.json({ exists: false, job: null });
      }

      return NextResponse.json({
        exists: true,
        job: {
          id: job.id,
          compositionId: job.compositionId,
          status: job.status,
          priority: job.priority,
          attemptCount: job.attemptCount,
          errorMessage: job.errorMessage,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
          result: job.result,
        },
      });
    }

    // No compositionId — return queue stats
    const stats = await getQueueStats();
    return NextResponse.json({ stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to check enrichment status';
    console.error('[AI Enrich] Status check error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
