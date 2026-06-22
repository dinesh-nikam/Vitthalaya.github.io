/**
 * GET /api/graph/related
 *
 * Returns related compositions for a given composition.
 * Uses graph traversal: finds compositions connected via shared
 * saints, deities, festivals, or categories.
 *
 * Query params:
 *   compositionId  - Source composition UUID
 *   limit          - Max results (default: 10)
 *
 * Response:
 *   { compositions: RelatedComposition[], source: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';

interface RelatedComposition {
  id: string;
  titleMarathi: string;
  slug: string;
  type: string;
  saintName: string | null;
  relevance: number;
  via: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const compositionId = searchParams.get('compositionId');
    const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '10', 10));

    if (!compositionId) {
      return NextResponse.json({ error: '"compositionId" query param is required' }, { status: 400 });
    }

    // 1. Get the source composition
    const source = await db.composition.findUnique({
      where: { id: compositionId },
      select: { saintId: true, deityId: true },
    });

    if (!source) {
      return NextResponse.json({ error: 'Composition not found' }, { status: 404 });
    }

    // 2. Find related compositions via shared graph connections:
    //    a) Same saint (different compositions by same saint)
    //    b) Same deity (compositions dedicated to same deity)
    //    c) Same festivals (via FestivalComposition)
    //    d) Same categories (via CategoryComposition)

    const related = new Map<string, { comp: RelatedComposition; score: number; reasons: string[] }>();

    // a) Same saint
    if (source.saintId) {
      const sameSaint = await db.composition.findMany({
        where: { saintId: source.saintId, id: { not: compositionId }, reviewed: true },
        select: { id: true, titleMarathi: true, slug: true, type: true, saint: { select: { nameMarathi: true } } },
        take: limit,
      });
      for (const c of sameSaint) {
        const key = c.id;
        if (!related.has(key)) {
          related.set(key, { comp: { id: c.id, titleMarathi: c.titleMarathi, slug: c.slug, type: c.type, saintName: c.saint?.nameMarathi ?? null, relevance: 0, via: '' }, score: 0, reasons: [] });
        }
        const entry = related.get(key)!;
        entry.score += 3;
        entry.reasons.push('same-saint');
      }
    }

    // b) Same deity
    if (source.deityId) {
      const sameDeity = await db.composition.findMany({
        where: { deityId: source.deityId, id: { not: compositionId }, reviewed: true },
        select: { id: true, titleMarathi: true, slug: true, type: true, saint: { select: { nameMarathi: true } } },
        take: limit,
      });
      for (const c of sameDeity) {
        const key = c.id;
        if (!related.has(key)) {
          related.set(key, { comp: { id: c.id, titleMarathi: c.titleMarathi, slug: c.slug, type: c.type, saintName: c.saint?.nameMarathi ?? null, relevance: 0, via: '' }, score: 0, reasons: [] });
        }
        const entry = related.get(key)!;
        entry.score += 2;
        entry.reasons.push('same-deity');
      }
    }

    // c) Same festivals
    const festIds = await db.festivalComposition.findMany({
      where: { compositionId },
      select: { festivalId: true },
    });
    for (const { festivalId } of festIds) {
      const festComps = await db.festivalComposition.findMany({
        where: { festivalId, compositionId: { not: compositionId }, composition: { reviewed: true } },
        select: { composition: { select: { id: true, titleMarathi: true, slug: true, type: true, saint: { select: { nameMarathi: true } } } } },
        take: limit,
      });
      for (const { composition: c } of festComps) {
        const key = c.id;
        if (!related.has(key)) {
          related.set(key, { comp: { id: c.id, titleMarathi: c.titleMarathi, slug: c.slug, type: c.type, saintName: c.saint?.nameMarathi ?? null, relevance: 0, via: '' }, score: 0, reasons: [] });
        }
        const entry = related.get(key)!;
        entry.score += 2;
        entry.reasons.push('same-festival');
      }
    }

    // d) Same categories
    const catIds = await db.categoryComposition.findMany({
      where: { compositionId },
      select: { categoryId: true },
    });
    for (const { categoryId } of catIds) {
      const catComps = await db.categoryComposition.findMany({
        where: { categoryId, compositionId: { not: compositionId }, composition: { reviewed: true } },
        select: { composition: { select: { id: true, titleMarathi: true, slug: true, type: true, saint: { select: { nameMarathi: true } } } } },
        take: limit,
      });
      for (const { composition: c } of catComps) {
        const key = c.id;
        if (!related.has(key)) {
          related.set(key, { comp: { id: c.id, titleMarathi: c.titleMarathi, slug: c.slug, type: c.type, saintName: c.saint?.nameMarathi ?? null, relevance: 0, via: '' }, score: 0, reasons: [] });
        }
        const entry = related.get(key)!;
        entry.score += 1;
        entry.reasons.push('same-category');
      }
    }

    // Sort by score descending, take top N
    const results = [...related.entries()]
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, limit)
      .map(([id, entry]) => ({
        ...entry.comp,
        relevance: entry.score,
        via: entry.reasons[0] ?? 'related',
      }));

    return NextResponse.json({
      success: true,
      compositionId,
      compositions: results,
      total: results.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
