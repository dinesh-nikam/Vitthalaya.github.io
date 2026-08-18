/**
 * Explore Recent API
 * Returns the most recently added (reviewed) compositions — real rows from
 * the catalog with real timestamps and lyric previews.
 */

import { NextResponse } from 'next/server';
import { db } from '@/src/db/client';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const recent = await db.composition.findMany({
      where: { reviewed: true },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
        id: true,
        titleMarathi: true,
        slug: true,
        type: true,
        fullText: true,
        createdAt: true,
        saint: { select: { nameMarathi: true } },
      },
    });

    return NextResponse.json(
      recent.map((comp) => ({
        id: comp.id,
        titleMarathi: comp.titleMarathi,
        slug: comp.slug,
        type: comp.type,
        saintName: comp.saint?.nameMarathi ?? null,
        createdAt: comp.createdAt.toISOString(),
        preview: comp.fullText.replace(/\s+/g, ' ').trim().slice(0, 180),
      }))
    );
  } catch (err) {
    console.error('Explore recent error:', err);
    return NextResponse.json({ error: 'Failed to fetch recent compositions' }, { status: 500 });
  }
}
