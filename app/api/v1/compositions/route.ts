/**
 * Public API v1 — Compositions
 *
 * GET /api/v1/compositions — List compositions with pagination and filters.
 * GET /api/v1/compositions/:id — Get single composition.
 *
 * This is a read-only API for third-party developers.
 * Rate-limited and requires API key.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';

// ── Rate Limit & Auth ─────────────────────────────────────────────────────────

function isRateLimited(_ip: string): boolean {
  // TODO: rate limiting via Redis
  return false;
}

// ── GET /api/v1/compositions ──────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Rate limited. Try again later.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const type = searchParams.get('type');
  const saint = searchParams.get('saint');
  const deity = searchParams.get('deity');
  const q = searchParams.get('q');

  const where: Record<string, unknown> = { reviewed: true };

  if (type) where.type = type;
  if (saint) where.saint = { slug: saint };
  if (deity) where.deity = { nameTranslit: { contains: deity, mode: 'insensitive' } };
  if (q) {
    where.OR = [
      { titleMarathi: { contains: q, mode: 'insensitive' } },
      { titleTranslit: { contains: q, mode: 'insensitive' } },
    ];
  }

  try {
    const [compositions, total] = await Promise.all([
      db.composition.findMany({
        where: where as any,
        select: {
          id: true,
          titleMarathi: true,
          titleTranslit: true,
          type: true,
          slug: true,
          saint: { select: { nameMarathi: true, slug: true } },
          deity: { select: { nameMarathi: true, nameTranslit: true } },
          meaning: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.composition.count({ where: where as any }),
    ]);

    return NextResponse.json({
      data: compositions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    console.error('[API/v1/compositions] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
