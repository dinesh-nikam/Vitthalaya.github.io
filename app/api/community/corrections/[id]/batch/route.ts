/**
 * Digital Pandharpur — Batch Approval API
 *
 * POST /api/community/corrections/batch
 *   Batch-approve multiple corrections.
 *   Body: { correctionIds: string[], reviewerId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { batchApproveCorrections } from '@/src/community';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { correctionIds, reviewerId } = body as {
      correctionIds?: string[];
      reviewerId?: string;
    };

    if (!Array.isArray(correctionIds) || correctionIds.length === 0) {
      return NextResponse.json(
        { error: 'correctionIds is required (non-empty array)' },
        { status: 400 }
      );
    }

    if (!reviewerId || typeof reviewerId !== 'string') {
      return NextResponse.json(
        { error: 'reviewerId is required (string)' },
        { status: 400 }
      );
    }

    const result = await batchApproveCorrections(correctionIds, reviewerId);

    return NextResponse.json({
      approved: result.approved,
      errors: result.errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to batch approve corrections';
    console.error('[Community] Batch approve error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
