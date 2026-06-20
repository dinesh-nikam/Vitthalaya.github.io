/**
 * Digital Pandharpur — AI Enrichment Review API
 *
 * GET  /api/ai/enrich/review
 *   List enrichment results pending review.
 *   Query: limit?, offset?
 *
 * POST /api/ai/enrich/review
 *   Process a single review action.
 *   Body: { resultId, action, reviewedBy, feedback?, edits? }
 *
 * POST /api/ai/enrich/review?batch=true
 *   Batch-approve multiple results.
 *   Body: { resultIds: string[], reviewedBy: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { processReview, batchApprove, getPendingReviews } from '@/src/ai-enrichment';

// ─── GET: List pending reviews ───────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(request.nextUrl.searchParams.get('offset') ?? '0', 10);

    const reviews = await getPendingReviews({ limit, offset });

    return NextResponse.json({
      reviews,
      count: reviews.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch pending reviews';
    console.error('[AI Enrich] Review list error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST: Process review or batch approve ──────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const isBatch = request.nextUrl.searchParams.get('batch') === 'true';

    if (isBatch) {
      // ── Batch approve ────────────────────────────────────────────────────
      const body = await request.json();
      const { resultIds, reviewedBy } = body as {
        resultIds?: string[];
        reviewedBy?: string;
      };

      if (!Array.isArray(resultIds) || resultIds.length === 0) {
        return NextResponse.json(
          { error: 'resultIds is required (non-empty array)' },
          { status: 400 }
        );
      }

      if (!reviewedBy || typeof reviewedBy !== 'string') {
        return NextResponse.json(
          { error: 'reviewedBy is required (string)' },
          { status: 400 }
        );
      }

      const result = await batchApprove(resultIds, reviewedBy);

      return NextResponse.json({
        approved: result.approved,
        errors: result.errors,
      });
    }

    // ── Single review ──────────────────────────────────────────────────────
    const body = await request.json();
    const { resultId, action, reviewedBy, feedback, edits } = body as {
      resultId?: string;
      action?: string;
      reviewedBy?: string;
      feedback?: string;
      edits?: Record<string, unknown>;
    };

    if (!resultId || !action || !reviewedBy) {
      return NextResponse.json(
        { error: 'resultId, action, and reviewedBy are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject', 'edit'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be one of: approve, reject, edit' },
        { status: 400 }
      );
    }

    const result = await processReview({
      resultId,
      action: action as 'approve' | 'reject' | 'edit',
      reviewedBy,
      feedback,
      edits: edits as any,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to process review';
    console.error('[AI Enrich] Review error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
