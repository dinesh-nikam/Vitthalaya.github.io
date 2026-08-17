/**
 * Vitthalaya — Denoise Composition Lyrics
 *
 * Scans every reviewed composition, removes YouTube/import metadata lines from
 * the lyrics field (timestamps, ► markers, URLs, hashtags, credit/boilerplate
 * lines, English-only description lines) and — with --apply — persists the
 * cleaned text as a NEW CompositionVersion (so the change is auditable and
 * reversible) and updates fullText. Devanagari lines are never rewritten.
 *
 * Usage:
 *   bun run scripts/denoise-compositions.ts            # dry run (report only)
 *   bun run scripts/denoise-compositions.ts --apply    # persist changes
 *   bun run scripts/denoise-compositions.ts --type=abhang
 */

import { db } from '../src/db/client';
import {
  cleanLyrics,
  classifyLyrics,
  lyricsQualityScore,
  type LyricsClass,
} from '../src/lib/lyrics-clean';

const APPLY = process.argv.includes('--apply');
const typeFilter = process.argv
  .find((a) => a.startsWith('--type='))
  ?.split('=')[1];

async function main() {
  const compositions = await db.composition.findMany({
    where: {
      reviewed: true,
      ...(typeFilter ? { type: typeFilter } : {}),
    },
    select: { id: true, titleMarathi: true, type: true, fullText: true },
    orderBy: { type: 'asc' },
  });

  let changedCount = 0;
  let removedTotal = 0;
  const stillWeak: { title: string; type: string; score: number; class: LyricsClass }[] = [];
  const byReason: Record<string, number> = {};

  for (const comp of compositions) {
    const result = cleanLyrics(comp.fullText);
    const afterClass = classifyLyrics(result.cleaned || comp.fullText);

    if (result.changed) {
      changedCount++;
      removedTotal += result.removedLines.length;
      for (const r of result.removedLines) {
        byReason[r.reason.split(':')[0]] = (byReason[r.reason.split(':')[0]] ?? 0) + 1;
      }
      console.log(
        `[${comp.type}] ${comp.titleMarathi.slice(0, 60)} — removed ${result.removedLines.length} line(s) → ${afterClass}`
      );

      if (APPLY) {
        await applyClean(comp.id, comp.fullText, result.cleaned, result.removedLines.length);
      }
    }

    // After cleaning, flag anything still unlikely to be real lyrics.
    const score = lyricsQualityScore(result.cleaned || comp.fullText);
    if (afterClass !== 'lyrics') {
      stillWeak.push({ title: comp.titleMarathi, type: comp.type, score, class: afterClass });
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Scanned: ${compositions.length}`);
  console.log(`Changed: ${changedCount}${APPLY ? ' (persisted as new versions)' : ' (dry run — re-run with --apply)'}`);
  console.log(`Removed lines: ${removedTotal}`);
  console.log('Removal reasons:', JSON.stringify(byReason, null, 2));

  console.log(`\nStill weak after cleaning (${stillWeak.length}):`);
  for (const w of stillWeak.slice(0, 40)) {
    console.log(`  [${w.class}] (${(w.score * 100).toFixed(0)}%) ${w.title.slice(0, 70)}`);
  }
  if (stillWeak.length > 40) {
    console.log(`  … and ${stillWeak.length - 40} more`);
  }

  await db.$disconnect();
}

async function applyClean(
  compositionId: string,
  original: string,
  cleaned: string,
  removedLineCount: number
) {
  await db.$transaction(async (tx) => {
    const current = await tx.composition.findUnique({
      where: { id: compositionId },
      select: { id: true, titleMarathi: true, titleTranslit: true, meaning: true },
    });
    if (!current) return;

    const lastVersion = await tx.compositionVersion.findFirst({
      where: { compositionId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });

    await tx.compositionVersion.create({
      data: {
        compositionId,
        versionNumber: (lastVersion?.versionNumber ?? 0) + 1,
        titleMarathi: current.titleMarathi,
        titleTranslit: current.titleTranslit,
        fullText: original,
        meaning: current.meaning,
        changeReason: `Denoise: removed ${removedLineCount} YouTube/import metadata line(s). Original preserved in this version.`,
      },
    });

    await tx.composition.update({
      where: { id: compositionId },
      data: { fullText: cleaned },
    });
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Denoise failed:', err);
    process.exit(1);
  });
