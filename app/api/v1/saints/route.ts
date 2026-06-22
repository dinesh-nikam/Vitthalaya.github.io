/**
 * Public API v1 — Saints
 *
 * GET /api/v1/saints — List all saints.
 * GET /api/v1/saints/:slug — Single saint with compositions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

  try {
    const [saints, total] = await Promise.all([
      db.saint.findMany({
        select: {
          id: true,
          nameMarathi: true,
          nameTranslit: true,
          slug: true,
          birthPlace: true,
          photoUrl: true,
          _count: { select: { compositions: true } },
        },
        orderBy: { nameMarathi: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.saint.count(),
    ]);

    return NextResponse.json({
      data: saints.map((s) => ({
        id: s.id,
        nameMarathi: s.nameMarathi,
        nameTranslit: s.nameTranslit,
        slug: s.slug,
        birthPlace: s.birthPlace,
        photoUrl: s.photoUrl,
        compositionCount: s._count.compositions,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600',
      },
    });
  } catch (err) {
    console.error('[API/v1/saints] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
