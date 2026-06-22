import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { expandTransliteration } from '@/src/lib/search-transliteration';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';

    if (!query || query.length < 1) {
      return NextResponse.json({ suggestions: [] });
    }

    const expandedQuery = expandTransliteration(query);

    // 1. Fetch matching Saints
    const saints = await db.saint.findMany({
      where: {
        OR: [
          { nameMarathi: { contains: query } },
          { nameMarathi: { contains: expandedQuery } },
          { nameTranslit: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        nameMarathi: true,
        nameTranslit: true,
        slug: true
      },
      take: 3
    });

    // 2. Fetch matching Deities
    const deities = await db.deity.findMany({
      where: {
        OR: [
          { nameMarathi: { contains: query } },
          { nameMarathi: { contains: expandedQuery } },
          { nameTranslit: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        nameMarathi: true,
        nameTranslit: true,
        slug: true
      },
      take: 3
    });

    // 3. Fetch matching Categories
    const categories = await db.category.findMany({
      where: {
        OR: [
          { nameMarathi: { contains: query } },
          { nameMarathi: { contains: expandedQuery } },
          { nameTranslit: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        nameMarathi: true,
        slug: true
      },
      take: 3
    });

    // 4. Fetch matching Festivals
    const festivals = await db.festival.findMany({
      where: {
        OR: [
          { nameMarathi: { contains: query } },
          { name: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        nameMarathi: true,
        slug: true
      },
      take: 3
    });

    // 5. Fetch matching Compositions (types distinct)
    const compositionTypes = await db.composition.findMany({
      where: {
        reviewed: true,
        type: { contains: query, mode: 'insensitive' }
      },
      select: { type: true },
      distinct: ['type'],
      take: 3
    });

    // 6. Fetch matching Composition titles
    const compositions = await db.composition.findMany({
      where: {
        reviewed: true,
        OR: [
          { titleMarathi: { contains: query } },
          { titleMarathi: { contains: expandedQuery } },
          { titleTranslit: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        titleMarathi: true,
        titleTranslit: true,
        slug: true,
        type: true
      },
      take: 5
    });

    // Combine suggestions hierarchically
    const suggestions: {
      type: string;
      label: string;
      labelTranslit?: string;
      url: string;
    }[] = [
      ...saints.map(s => ({
        type: 'saint' as const,
        label: `${s.nameMarathi} (संत)`,
        labelTranslit: s.nameTranslit || undefined,
        url: `/sant/${s.slug}`
      })),
      ...deities.map(d => ({
        type: 'deity' as const,
        label: `${d.nameMarathi} (देवता)`,
        labelTranslit: d.nameTranslit || undefined,
        url: `/deity/${d.slug}`
      })),
      ...categories.map(c => ({
        type: 'category' as const,
        label: `${c.nameMarathi} (श्रेणी)`,
        url: `/category/${c.slug}`
      })),
      ...festivals.map(f => ({
        type: 'festival' as const,
        label: `${f.nameMarathi} (सण)`,
        url: `/festival/${f.slug}`
      })),
      ...compositionTypes.map(t => ({
        type: 'type' as const,
        label: `${t.type} (प्रकार)`,
        url: `/search?type=${encodeURIComponent(t.type)}`
      })),
      ...compositions.map(comp => ({
        type: 'composition' as const,
        label: `${comp.titleMarathi} (${comp.type})`,
        labelTranslit: comp.titleTranslit || undefined,
        url: `/abhang/${comp.slug}`
      }))
    ];

    return NextResponse.json({ suggestions: suggestions.slice(0, 15) });
  } catch (err) {
    console.error('Failed to get search suggestions:', err);
    return NextResponse.json({ suggestions: [] });
  }
}
