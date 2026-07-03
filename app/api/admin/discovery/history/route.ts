/**
 * GET /api/admin/discovery/history
 *
 * Returns discovery job run history with optional filters.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { requireAdmin } from '@/src/lib/require-admin';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    const where: Record<string, unknown> = {};
    if (sourceId) where.sourceId = sourceId;
    if (status) where.status = status;
    if (type) where.type = type;

    const [jobs, total] = await Promise.all([
      db.discoveryJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 200),
        skip: offset,
        include: {
          source: {
            select: {
              id: true,
              name: true,
              type: true,
              url: true,
            },
          },
        },
      }),
      db.discoveryJob.count({ where }),
    ]);

    return NextResponse.json({ jobs, total, limit, offset });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Discovery History API] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
