/**
 * Public API v1 — Single Saint with Compositions
 *
 * GET /api/v1/saints/:slug — Saint detail + recent compositions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    const saint = await db.saint.findUnique({
      where: { slug },
      select: {
        id: true,
        nameMarathi: true,
        nameTranslit: true,
        slug: true,
        biography: true,
        birthPlace: true,
        deathPlace: true,
        birthDate: true,
        photoUrl: true,
        compositions: {
          where: { reviewed: true },
          select: {
            id: true,
            titleMarathi: true,
            titleTranslit: true,
            type: true,
            slug: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        _count: { select: { compositions: true } },
      },
    });

    if (!saint) {
      return NextResponse.json({ error: 'Saint not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        ...saint,
        compositionCount: saint._count.compositions,
      },
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600',
      },
    });
  } catch (err) {
    console.error('[API/v1/saints/:slug] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
