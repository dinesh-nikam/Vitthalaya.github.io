/**
 * Public API v1 — Single Composition
 *
 * GET /api/v1/compositions/:id — Full composition detail with text.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const composition = await db.composition.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        reviewed: true,
      },
      select: {
        id: true,
        titleMarathi: true,
        titleTranslit: true,
        type: true,
        slug: true,
        fullText: true,
        meaning: true,
        saint: { select: { id: true, nameMarathi: true, slug: true } },
        deity: { select: { id: true, nameMarathi: true, nameTranslit: true } },
        audio: { select: { id: true, url: true, duration: true } },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!composition) {
      return NextResponse.json({ error: 'Composition not found' }, { status: 404 });
    }

    return NextResponse.json({ data: composition }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600',
      },
    });
  } catch (err) {
    console.error('[API/v1/compositions/:id] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
