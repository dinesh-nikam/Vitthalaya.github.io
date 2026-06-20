import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { redis } from '@/src/lib/redis';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType')?.trim() || '';
    const entityId = searchParams.get('entityId')?.trim() || '';
    const limit = parseInt(searchParams.get('limit') || '5', 10);

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'Parameters "entityType" and "entityId" are required.' }, { status: 400 });
    }

    if (!['composition', 'saint', 'festival', 'deity'].includes(entityType)) {
      return NextResponse.json({ error: 'Invalid entityType. Must be composition, saint, festival, or deity.' }, { status: 400 });
    }

    const cacheKey = `dp:rec:${entityType}:${entityId}:${limit}`;

    // Try to resolve from cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return NextResponse.json({ ...parsed, cached: true }, {
          headers: { 'X-Cache': 'HIT' }
        });
      }
    } catch (cacheErr) {
      console.warn('Failed to read recommendation cache from Redis:', cacheErr);
    }

    // Initialize return buckets
    let relatedAbhangs: any[] = [];
    let relatedSaints: any[] = [];
    let relatedFestivals: any[] = [];
    let relatedDeities: any[] = [];

    if (entityType === 'composition') {
      // 1. Fetch source composition metadata
      const comp = await db.composition.findUnique({
        where: { id: entityId },
        select: { id: true, titleMarathi: true, slug: true, saintId: true, deityId: true, type: true }
      });

      if (comp) {
        // Related Abhangs: Same Saint + Same Deity
        const saintComps = comp.saintId
          ? await db.composition.findMany({
              where: { saintId: comp.saintId, id: { not: comp.id }, reviewed: true },
              select: { id: true, titleMarathi: true, slug: true, type: true },
              take: limit
            })
          : [];

        const deityComps = comp.deityId
          ? await db.composition.findMany({
              where: { deityId: comp.deityId, id: { not: comp.id }, saintId: { not: comp.saintId || undefined }, reviewed: true },
              select: { id: true, titleMarathi: true, slug: true, type: true },
              take: limit - saintComps.length
            })
          : [];

        relatedAbhangs = [...saintComps, ...deityComps].slice(0, limit);

        // Related Saint: Source composition's saint
        if (comp.saintId) {
          const saint = await db.saint.findUnique({
            where: { id: comp.saintId },
            select: { id: true, nameMarathi: true, slug: true }
          });
          if (saint) {
            relatedSaints.push(saint);
          }
        }

        // Related Deity: Source composition's deity
        if (comp.deityId) {
          const deity = await db.deity.findUnique({
            where: { id: comp.deityId },
            select: { id: true, nameMarathi: true, nameTranslit: true }
          });
          if (deity) {
            relatedDeities.push(deity);
          }
        }

        // Related Festivals: Associated via composition_festivals join table
        const festComps = await db.festivalComposition.findMany({
          where: { compositionId: comp.id },
          include: {
            festival: {
              select: { id: true, nameMarathi: true, nameTranslit: true }
            }
          },
          take: limit
        });
        relatedFestivals = festComps.map((fc: any) => fc.festival);
      }
    } else if (entityType === 'saint') {
      // 1. Related Abhangs: Compositions by this Saint
      relatedAbhangs = await db.composition.findMany({
        where: { saintId: entityId, reviewed: true },
        select: { id: true, titleMarathi: true, slug: true, type: true },
        take: limit
      });

      // 2. Related Saints: Relationships defined in SaintRelation
      const relations = await db.saintRelation.findMany({
        where: { saintId: entityId },
        include: {
          related: {
            select: { id: true, nameMarathi: true, slug: true }
          }
        },
        take: limit
      });
      relatedSaints = relations.map((r: any) => r.related);

      // 3. Related Deities: Deities mentioned in this Saint's compositions
      const saintCompsWithDeity = await db.composition.findMany({
        where: { saintId: entityId, deityId: { not: null }, reviewed: true },
        select: {
          deity: {
            select: { id: true, nameMarathi: true, nameTranslit: true }
          }
        },
        take: limit
      });
      const uniqueDeities = new Map<string, any>();
      saintCompsWithDeity.forEach((c: any) => {
        if (c.deity) {
          uniqueDeities.set(c.deity.id, c.deity);
        }
      });
      relatedDeities = Array.from(uniqueDeities.values()).slice(0, limit);
    } else if (entityType === 'festival') {
      // 1. Related Abhangs: Compositions tagged under this Festival
      const festComps = await db.festivalComposition.findMany({
        where: { festivalId: entityId },
        include: {
          composition: {
            select: { id: true, titleMarathi: true, slug: true, type: true }
          }
        },
        take: limit
      });
      relatedAbhangs = festComps.map((fc: any) => fc.composition);

      // 2. Related Saints: Saints who composed abhangs associated with this festival
      const uniqueSaints = new Map<string, any>();
      const compsWithSaint = await db.festivalComposition.findMany({
        where: { festivalId: entityId },
        include: {
          composition: {
            include: {
              saint: {
                select: { id: true, nameMarathi: true, slug: true }
              }
            }
          }
        },
        take: limit * 2
      });
      compsWithSaint.forEach((fc: any) => {
        if (fc.composition?.saint) {
          uniqueSaints.set(fc.composition.saint.id, fc.composition.saint);
        }
      });
      relatedSaints = Array.from(uniqueSaints.values()).slice(0, limit);
    } else if (entityType === 'deity') {
      // 1. Related Abhangs: Compositions dedicated to this Deity
      relatedAbhangs = await db.composition.findMany({
        where: { deityId: entityId, reviewed: true },
        select: { id: true, titleMarathi: true, slug: true, type: true },
        take: limit
      });

      // 2. Related Saints: Saints who composed abhangs for this Deity
      const uniqueSaints = new Map<string, any>();
      const compsWithSaint = await db.composition.findMany({
        where: { deityId: entityId, saintId: { not: null }, reviewed: true },
        include: {
          saint: {
            select: { id: true, nameMarathi: true, slug: true }
          }
        },
        take: limit * 3
      });
      compsWithSaint.forEach((c: any) => {
        if (c.saint) {
          uniqueSaints.set(c.saint.id, c.saint);
        }
      });
      relatedSaints = Array.from(uniqueSaints.values()).slice(0, limit);
    }

    // 3. Knowledge Graph fallbacks: Query EntityGraphEdge table if we need more related links
    if (relatedAbhangs.length < limit || relatedSaints.length === 0) {
      const edges = await db.entityGraphEdge.findMany({
        where: { sourceId: entityId, sourceType: entityType },
        orderBy: { weight: 'desc' },
        take: limit * 2
      });

      for (const edge of edges) {
        if (edge.targetType === 'composition' && relatedAbhangs.length < limit) {
          if (!relatedAbhangs.some((a) => a.id === edge.targetId)) {
            const comp = await db.composition.findUnique({
              where: { id: edge.targetId },
              select: { id: true, titleMarathi: true, slug: true, type: true }
            });
            if (comp) relatedAbhangs.push(comp);
          }
        } else if (edge.targetType === 'saint' && relatedSaints.length < limit) {
          if (!relatedSaints.some((s) => s.id === edge.targetId)) {
            const saint = await db.saint.findUnique({
              where: { id: edge.targetId },
              select: { id: true, nameMarathi: true, slug: true }
            });
            if (saint) relatedSaints.push(saint);
          }
        } else if (edge.targetType === 'festival' && relatedFestivals.length < limit) {
          if (!relatedFestivals.some((f) => f.id === edge.targetId)) {
            const fest = await db.festival.findUnique({
              where: { id: edge.targetId },
              select: { id: true, nameMarathi: true, nameTranslit: true }
            });
            if (fest) relatedFestivals.push(fest);
          }
        } else if (edge.targetType === 'deity' && relatedDeities.length < limit) {
          if (!relatedDeities.some((d) => d.id === edge.targetId)) {
            const deity = await db.deity.findUnique({
              where: { id: edge.targetId },
              select: { id: true, nameMarathi: true, nameTranslit: true }
            });
            if (deity) relatedDeities.push(deity);
          }
        }
      }
    }

    const responseBody = {
      relatedAbhangs,
      relatedSaints,
      relatedFestivals,
      relatedDeities
    };

    // Cache results for 24 hours (86400 seconds)
    try {
      await redis.set(cacheKey, JSON.stringify(responseBody), { ex: 86400 });
    } catch (cacheErr) {
      console.warn('Failed to write recommendation results to Redis cache:', cacheErr);
    }

    return NextResponse.json({ ...responseBody, cached: false }, {
      headers: { 'X-Cache': 'MISS' }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Unhandled recommendations API error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
