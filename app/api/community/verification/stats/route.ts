/**
 * Digital Pandharpur — Verification Stats API
 *
 * GET /api/community/verification/stats
 *   Get verification stats across all compositions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getVerificationStats } from '@/src/community';

export async function GET(_request: NextRequest) {
  try {
    const stats = await getVerificationStats();
    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch verification stats';
    console.error('[Community] Verification stats error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
