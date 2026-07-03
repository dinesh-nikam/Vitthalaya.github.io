/**
 * Explore Trending API
 * Returns recently added or popular compositions.
 */

import { NextResponse } from 'next/server';
import { db } from '@/src/db/client';

export async function GET(): Promise<NextResponse> {
  try {
    // Get recently added compositions (trending by recency)
    const trending = await db.composition.findMany({
      where: { reviewed: true },
      include: {
        saint: { select: { nameMarathi: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
        id: true,
        titleMarathi: true,
        slug: true,
        type: true,
        saint: { select: { nameMarathi: true } },
      },
    });

    return NextResponse.json(
      trending.map(comp => ({
        id: comp.id,
        titleMarathi: comp.titleMarathi,
        slug: comp.slug,
        type: comp.type,
        saintName: comp.saint?.nameMarathi || null,
      }))
    );
  } catch (err) {
    console.error('Explore trending error:', err);
    return NextResponse.json({ error: 'Failed to fetch trending' }, { status: 500 });
  }
}
