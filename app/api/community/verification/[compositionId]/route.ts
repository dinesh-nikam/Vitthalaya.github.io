/**
 * Digital Pandharpur — Verification API
 *
 * GET /api/community/verification/[compositionId]
 *   Get the verification record for a composition.
 *   Creates one automatically if it doesn't exist.
 *
 * POST /api/community/verification/[compositionId]
 *   Recalculate the verification / trust score.
 *   Body: { action: 'recalculate' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getVerificationRecord, recalculateVerification } from '@/src/community';

// ─── GET: Get verification record ────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ compositionId: string }> }
) {
  try {
    const { compositionId } = await params;
    const record = await getVerificationRecord(compositionId);

    return NextResponse.json(record);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch verification record';
    console.error('[Community] Verification error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST: Recalculate ───────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ compositionId: string }> }
) {
  try {
    const { compositionId } = await params;
    const body = await request.json();
    const { action } = body as { action?: string };

    if (action !== 'recalculate') {
      return NextResponse.json(
        { error: 'Invalid action. Use "recalculate".' },
        { status: 400 }
      );
    }

    const record = await recalculateVerification(compositionId);

    return NextResponse.json(record);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to recalculate verification';
    console.error('[Community] Recalculate error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
