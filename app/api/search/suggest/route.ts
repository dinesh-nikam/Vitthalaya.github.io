import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { transliterateLatinToMarathi } from '@/src/lib/opensearch-client';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const hasLatin = /[a-zA-Z]/.test(query);
    const expandedQuery = hasLatin ? transliterateLatinToMarathi(query) : query;

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
        slug: true
      },
      take: 3
    });

    // 2. Fetch matching Categories
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

    // 3. Fetch matching Compositions
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
        slug: true,
        type: true
      },
      take: 5
    });

    // Combine suggestions
    const suggestions = [
      ...saints.map(s => ({
        type: 'saint',
        label: `${s.nameMarathi} (संत)`,
        url: `/sant/${s.slug}`
      })),
      ...categories.map(c => ({
        type: 'category',
        label: `${c.nameMarathi} (श्रेणी)`,
        url: `/category/${c.slug}`
      })),
      ...compositions.map(comp => ({
        type: 'composition',
        label: `${comp.titleMarathi} (${comp.type})`,
        url: `/abhang/${comp.slug}`
      }))
    ];

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error('Failed to get search suggestions:', err);
    return NextResponse.json({ suggestions: [] });
  }
}
