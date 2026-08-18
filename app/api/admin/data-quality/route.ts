/**
 * Digital Pandharpur — Admin Data Quality API
 *
 * GET /api/admin/data-quality
 *
 * Lists reviewed compositions whose lyrics are still weak after the denoise
 * pass (classifyLyrics !== 'lyrics'): fragments (< 4 Devanagari lines) and
 * noisy rows. Each item carries the current (after) text, the pre-denoise
 * original (from the latest CompositionVersion), a quality score, and
 * metadata so an editor can decide: re-acquire from a proper source, restore
 * the original, or leave flagged.
 */

import { NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { requireAdmin } from '@/src/lib/require-admin';
import {
  classifyLyrics,
  lyricsQualityScore,
  type LyricsClass,
} from '@/src/lib/lyrics-clean';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const compositions = await db.composition.findMany({
      where: { reviewed: true },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        titleMarathi: true,
        titleTranslit: true,
        type: true,
        source: true,
        fullText: true,
        createdAt: true,
        updatedAt: true,
        saint: { select: { nameMarathi: true } },
      },
    });

    const items = compositions
      .map((c) => {
        const qualityClass = classifyLyrics(c.fullText);
        const score = lyricsQualityScore(c.fullText);
        return { ...c, qualityClass, score };
      })
      .filter((c) => c.qualityClass !== 'lyrics');

    // One query for every composition's newest version (the denoise original).
    const versions = await db.compositionVersion.findMany({
      where: { compositionId: { in: items.map((i) => i.id) } },
      orderBy: { versionNumber: 'desc' },
      select: {
        compositionId: true,
        fullText: true,
        versionNumber: true,
        changeReason: true,
        createdAt: true,
      },
    });
    const newestByComposition = new Map<string, (typeof versions)[number]>();
    for (const v of versions) {
      if (!newestByComposition.has(v.compositionId)) newestByComposition.set(v.compositionId, v);
    }

    const summary: Record<LyricsClass, number> = { lyrics: 0, noisy: 0, fragment: 0 };
    for (const i of items) summary[i.qualityClass]++;

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      summary,
      total: items.length,
      items: items.map((c) => {
        const version = newestByComposition.get(c.id);
        return {
          id: c.id,
          titleMarathi: c.titleMarathi,
          titleTranslit: c.titleTranslit,
          type: c.type,
          source: c.source,
          saintName: c.saint?.nameMarathi ?? null,
          qualityClass: c.qualityClass,
          qualityScore: c.score,
          currentText: c.fullText,
          originalText: version?.fullText ?? null,
          versionReason: version?.changeReason ?? null,
          versionCreatedAt: version?.createdAt.toISOString() ?? null,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        };
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Admin Data Quality] error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
