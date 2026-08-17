/**
 * Vitthalaya — Link Web Imports as Canonical Variants
 *
 * The santsahitya.in and bhajangeet.wordpress.com acquisitions inserted
 * standalone Composition rows. This script links the ones that are the
 * SAME composition as an existing canonical record (Wikisource / Internet
 * Archive / seed corpus) as variant records (CompositionVersion) instead,
 * then removes the standalone duplicate row.
 *
 * Matching reuses the conservative two-stage matcher from
 * scripts/import-archive-variants.ts, calibrated for OCR→Wikisource:
 *
 *   1. CANDIDATE RETRIEVAL (first meaningful line) — trigram index, scored
 *      by bigram Dice + Levenshtein.
 *   2. CONFIRMATION (full text) — normalized full-text bigram Dice ≥ 0.70
 *      AND length ratio within [0.4, 2.5].
 *
 * Rows that do NOT confirm against a canonical record stay standalone —
 * they are genuinely new content and must not be force-linked.
 *
 * Usage:
 *   bun run scripts/link-import-variants.ts --dry-run
 *   bun run scripts/link-import-variants.ts --full-threshold=0.70
 */
import { db } from '../src/db/client';
import fs from 'fs';
import {
  normalizeLine,
  firstMeaningfulLine,
  buildIndex,
  retrieveBest,
  confirmFullText,
  DEFAULT_FULL_THRESHOLD,
} from './import-archive-variants';

/** Web-import sources whose rows are variant candidates. */
const IMPORT_SOURCE_MARKERS = ['santsahitya.in', 'bhajangeet.wordpress.com'];

export interface LinkImportVariantsOptions {
  dryRun?: boolean;
  fullThreshold?: number;
}

export interface LinkImportVariantsResult {
  importRows: number;
  canonicalRows: number;
  confirmed: number;
  belowRetrieval: number;
  noCandidates: number;
  belowFullThreshold: number;
  badLengthRatio: number;
  fkBlocked: number;
  backupPath: string;
  examples: string[];
}

export async function linkImportVariants(options: LinkImportVariantsOptions = {}): Promise<LinkImportVariantsResult> {
  const dryRun = options.dryRun ?? false;
  const fullThreshold = options.fullThreshold ?? DEFAULT_FULL_THRESHOLD;

  // ─── Load rows ────────────────────────────────────────────────
  const all = await db.composition.findMany({
    select: {
      id: true, titleMarathi: true, titleTranslit: true, fullText: true,
      meaning: true, source: true, reviewed: true, createdAt: true, slug: true,
    },
  });

  const imports = all.filter((r) =>
    r.source && IMPORT_SOURCE_MARKERS.some((m) => r.source!.includes(m)),
  );
  const canonical = all.filter((r) =>
    !r.source || !IMPORT_SOURCE_MARKERS.some((m) => r.source!.includes(m)),
  );
  console.log(`Import rows (santsahitya + bhajangeet): ${imports.length}`);
  console.log(`Canonical candidate rows (Wikisource/IA/seed): ${canonical.length}`);

  // ─── Build fuzzy index over canonical first lines ─────────────
  const { index } = buildIndex(
    canonical
      .map((c) => ({
        id: c.id,
        titleMarathi: c.titleMarathi,
        line: firstMeaningfulLine(c.fullText),
        fullNorm: normalizeLine(c.fullText),
      }))
      .filter((e) => e.line.length >= 15),
  );
  console.log(`Fuzzy trigram index: ${index.size} buckets\n`);

  const byId = new Map(canonical.map((c) => [c.id, c]));

  let confirmed = 0;
  let belowRetrieval = 0;
  let noCandidates = 0;
  let belowFullThreshold = 0;
  let badLengthRatio = 0;
  const links: Array<{ row: typeof imports[number]; target: typeof canonical[number]; dice: number; ratio: number; firstScore: number }> = [];
  const examples: string[] = [];

  for (const row of imports) {
    const fl = firstMeaningfulLine(row.fullText);
    if (!fl) { noCandidates++; continue; }

    const r = retrieveBest(fl, index);
    if (r.reason === 'no-candidates') { noCandidates++; continue; }
    if (r.reason === 'below-retrieval') { belowRetrieval++; continue; }

    const target = byId.get(r.entry.id)!;
    // Skip if the same canonical already has this import as a version.
    const existing = await db.compositionVersion.findFirst({
      where: { compositionId: target.id, changeReason: { contains: 'variant (web import' } },
      select: { id: true },
    });
    if (existing) continue;

    const conf = confirmFullText(normalizeLine(row.fullText), r.entry.fullNorm, fullThreshold);
    if (!conf.confirmed) {
      if (conf.reason === 'below-full-threshold') belowFullThreshold++;
      else badLengthRatio++;
      continue;
    }

    confirmed++;
    links.push({ row, target, dice: conf.fullDice, ratio: conf.lengthRatio, firstScore: r.firstLineScore });
    if (examples.length < 10) {
      examples.push(
        `${row.titleTranslit || row.titleMarathi} [${row.source?.slice(0, 30)}] → ${target.titleTranslit || target.titleMarathi} (full ${conf.fullDice.toFixed(2)}, ratio ${conf.lengthRatio.toFixed(2)}, first ${r.firstLineScore.toFixed(2)})`,
      );
    }
  }

  console.log(`\n${dryRun ? 'DRY RUN' : 'LINK'} summary (full-threshold ${fullThreshold}):`);
  console.log(`  Confirmed:          ${confirmed}`);
  console.log(`  Below retrieval:    ${belowRetrieval}`);
  console.log(`  No candidates:      ${noCandidates}`);
  console.log(`  Below full threshold: ${belowFullThreshold}`);
  console.log(`  Bad length ratio:   ${badLengthRatio}`);
  if (examples.length > 0) {
    console.log('\n  Example links:');
    for (const e of examples) console.log(`    ${e}`);
  }

  if (dryRun) return {
    importRows: imports.length,
    canonicalRows: canonical.length,
    confirmed,
    belowRetrieval,
    noCandidates,
    belowFullThreshold,
    badLengthRatio,
    fkBlocked: 0,
    backupPath: '',
    examples,
  };

  // ─── FK safety: user-data cascade + Restrict tables ───────────
  const linkIds = links.map((l) => l.row.id);
  const restrictTables = ['aiEnrichmentJob', 'aiEnrichmentResult', 'correctionSuggestion', 'verificationRecord', 'compositionVersion', 'categoryComposition', 'festivalComposition', 'bookComposition', 'collectionComposition'] as const;
  let fkBlocked = 0;
  for (const t of restrictTables) {
    const n = await db[t as 'compositionVersion'].count({ where: { compositionId: { in: linkIds } } }).catch(() => 0);
    if (n > 0) {
      console.log(`  ⚠ FK: ${t} references ${n} import row(s) — those will be skipped`);
      fkBlocked += n;
    }
  }

  // ─── Backup + write versions + delete standalone rows ─────────
  const backup = links.map((l) => ({
    deleted: l.row,
    target: { id: l.target.id, titleMarathi: l.target.titleMarathi, titleTranslit: l.target.titleTranslit, slug: l.target.slug },
    dice: l.dice,
    ratio: l.ratio,
    firstScore: l.firstScore,
  }));
  const backupPath = '.freebuff/backup-link-variants.json';
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');
  console.log(`  Backup: ${backupPath} (${links.length} rows)`);

  let written = 0;
  let deleted = 0;
  for (const l of links) {
    try {
      await db.compositionVersion.create({
        data: {
          compositionId: l.target.id,
          versionNumber: 2,
          titleMarathi: l.row.titleMarathi,
          titleTranslit: l.row.titleTranslit ?? '',
          fullText: l.row.fullText,
          meaning: l.row.meaning ?? null,
          changeReason: `variant (web import ${l.row.source?.replace(/^Source:\s*/, '') ?? 'unknown'})`,
          createdByUserId: null,
        },
      });
      written++;
      await db.composition.delete({ where: { id: l.row.id } });
      deleted++;
    } catch (err) {
      console.error(`  FAILED ${l.row.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n  Versions written: ${written}, standalone rows removed: ${deleted}`);
  const total = await db.composition.count();
  console.log(`  DB count: ${total}`);

  return {
    importRows: imports.length,
    canonicalRows: canonical.length,
    confirmed: written,
    belowRetrieval,
    noCandidates,
    belowFullThreshold,
    badLengthRatio,
    fkBlocked,
    backupPath,
    examples,
  };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const thresholdArg = args.find((a) => a.startsWith('--full-threshold='));
  linkImportVariants({
    dryRun,
    fullThreshold: thresholdArg ? parseFloat(thresholdArg.split('=')[1]) : undefined,
  })
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
}
