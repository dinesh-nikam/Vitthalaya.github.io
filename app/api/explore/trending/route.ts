/**
 * Explore Trending API
 *
 * Real behavioral ranking: compositions with the most reader/listener
 * interactions (view, complete, listen, bookmark, share) in the last 30 days
 * rank first. When there is no interaction data yet, it falls back to
 * recency (newest first) — honest, never fabricated popularity.
 */

import { NextResponse } from 'next/server';
import { db } from '@/src/db/client';

export const dynamic = 'force-dynamic';

const TRENDING_WINDOW_DAYS = 30;
const TRENDING_WEIGHTS: Record<string, number> = {
  listen: 3,
  complete: 2,
  view: 1,
  bookmark: 2,
  share: 2,
};

export async function GET(): Promise<NextResponse> {
  try {
    const since = new Date(Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const interactionRows = await db.userInteraction.groupBy({
      by: ['compositionId', 'interaction'],
      where: {
        createdAt: { gte: since },
        interaction: { in: Object.keys(TRENDING_WEIGHTS) },
      },
      _count: { _all: true },
    });

    // Score each composition by weighted interactions in the window.
    const scores = new Map<string, number>();
    for (const row of interactionRows) {
      const weight = TRENDING_WEIGHTS[row.interaction] ?? 1;
      scores.set(row.compositionId, (scores.get(row.compositionId) ?? 0) + row._count._all * weight);
    }

    const compositions = await db.composition.findMany({
      where: { reviewed: true },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: {
        id: true,
        titleMarathi: true,
        slug: true,
        type: true,
        createdAt: true,
        saint: { select: { nameMarathi: true } },
      },
    });

    const ranked = compositions
      .map((comp) => ({
        id: comp.id,
        titleMarathi: comp.titleMarathi,
        slug: comp.slug,
        type: comp.type,
        saintName: comp.saint?.nameMarathi ?? null,
        createdAt: comp.createdAt.toISOString(),
        interactionScore: scores.get(comp.id) ?? 0,
      }))
      // Weighted score first, recency as tiebreaker — and as the fallback
      // signal when no interactions exist at all.
      .sort(
        (a, b) =>
          b.interactionScore - a.interactionScore ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 12);

    const hasInteractions = scores.size > 0;

    return NextResponse.json({
      windowDays: TRENDING_WINDOW_DAYS,
      signal: hasInteractions ? 'interactions' : 'recency',
      trending: ranked,
    });
  } catch (err) {
    console.error('Explore trending error:', err);
    return NextResponse.json({ error: 'Failed to fetch trending' }, { status: 500 });
  }
}
