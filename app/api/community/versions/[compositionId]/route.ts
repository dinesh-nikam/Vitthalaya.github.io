/**
 * Digital Pandharpur — Composition Versions API
 *
 * GET /api/community/versions/[compositionId]
 *   List all versions of a composition.
 *   Query: limit?, offset?
 *
 * POST /api/community/versions/[compositionId]
 *   Create an initial version or an editorial version.
 *   Body: { action: 'seed-initial' | 'create-editorial', createdByUserId?, changeReason? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { listCompositionVersions, seedInitialVersion } from '@/src/community';

// ─── GET: List versions ──────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ compositionId: string }> }
) {
  try {
    const { compositionId } = await params;
    const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(request.nextUrl.searchParams.get('offset') ?? '0', 10);

    const result = await listCompositionVersions(compositionId, { limit, offset });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list versions';
    console.error('[Community] List versions error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST: Seed initial version ──────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ compositionId: string }> }
) {
  try {
    const { compositionId } = await params;
    const body = await request.json();
    const { action } = body as { action?: string };

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        { error: 'action is required (string)' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'seed-initial': {
        const result = await seedInitialVersion(compositionId);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          {
            error: `Unknown action "${action}". Valid actions: seed-initial`,
          },
          { status: 400 }
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to process version action';
    console.error('[Community] Version action error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
