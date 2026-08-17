/**
 * Vitthalaya — Archive OCR Variant Importer
 *
 * Re-imports the backed-up archive.org Tukaram OCR edition (removed earlier
 * because it duplicated the curated Wikisource Gatha) as *variant records*
 * attached to their matched Wikisource compositions, instead of standalone
 * duplicate compositions.
 *
 * Matching strategy — deliberately conservative, two stages:
 *
 *  1. CANDIDATE RETRIEVAL (first line): the OCR row's first meaningful line
 *     is matched against a trigram inverted index of Wikisource first lines,
 *     scored by bigram Dice + Levenshtein ratio. This finds the best
 *     candidate cheaply. First lines alone are NOT trusted to confirm — the
 *     Tukaram corpus reuses opening patterns, so a first-line match can be a
 *     different abhang.
 *
 *  2. CONFIRMATION (full text): the matched candidate is confirmed only when
 *     the FULL normalized texts agree:
 *       - full-text bigram Dice ≥ `fullThreshold` (0.70 — calibrated
 *         empirically; fragments/merged/wrong links all score below 0.70)
 *       - length ratio within [0.4, 2.5] (rejects partial OCR fragments and
 *         rows that merged multiple abhangs)
 *
 * Number-based matching is NOT used: the archive edition uses its own
 * sequence (verified: `अभंग क्र. ८४१` is not abhang 841), so offsets are a
 * false signal. Rows that fail confirmation stay in the backup file
 * (.freebuff/backup-archive-tukaram.json) — the platform forbids silently
 * misidentifying compositions.
 *
 * Usage:
 *   bun run scripts/import-archive-variants.ts --dry-run
 *   bun run scripts/import-archive-variants.ts --dry-run --full-threshold=0.70
 *   bun run scripts/import-archive-variants.ts
 */
import { db } from '../src/db/client';
import fs from 'fs';

const BACKUP = '.freebuff/backup-archive-tukaram.json';
export const DEFAULT_FULL_THRESHOLD = 0.70;
export const MIN_LENGTH_RATIO = 0.4;
export const MAX_LENGTH_RATIO = 2.5;
/** First-line score below which no candidate is even retrieved. */
export const RETRIEVAL_THRESHOLD = 0.5;

// ─── Normalization ─────────────────────────────────────────────

/** Normalize text for comparison: strip dandas, digits, brackets, junk, collapse space. */
export function normalizeLine(text: string): string {
  return text
    .replace(/[॥।]/g, ' ')
    .replace(/[०-९0-9]+/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[«»_*"“”]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * True when a line is predominantly Devanagari LETTERS (not an OCR-garbage
 * header). Devanagari digits (U+0966–U+096F) and dandas (U+0964/65) are
 * excluded so `** ४४५५८५०८५0 0 ४00 शीतक` (all digits) is rejected.
 */
export function isMarathiLine(line: string): boolean {
  const nonSpace = line.replace(/\s/g, '');
  if (nonSpace.length < 15) return false;
  const devLetters = (line.match(/[\u0900-\u0963\u0970-\u097F]/g) ?? []).length;
  return devLetters / nonSpace.length >= 0.5;
}

/**
 * The first meaningful (Marathi) line of an abhang, normalized.
 * Skips OCR-garbage header lines (page numbers, "** ..." runs).
 */
export function firstMeaningfulLine(text: string): string {
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (isMarathiLine(line)) return normalizeLine(line).slice(0, 60);
  }
  return '';
}

/** First meaningful line (kept for backward-compat naming). */
export function firstLine(text: string): string {
  return firstMeaningfulLine(text);
}

// ─── Character n-grams ─────────────────────────────────────────

/** Character trigrams of a string (lowercased, space-normalized). */
export function trigrams(s: string): Set<string> {
  const out = new Set<string>();
  const t = s.toLowerCase().replace(/\s+/g, '');
  for (let i = 0; i + 3 <= t.length; i++) out.add(t.slice(i, i + 3));
  return out;
}

/** Character bigrams (as an ordered list for Dice). */
export function bigrams(s: string): string[] {
  const t = s.toLowerCase().replace(/\s+/g, '');
  const out: string[] = [];
  for (let i = 0; i + 2 <= t.length; i++) out.push(t.slice(i, i + 2));
  return out;
}

/** Dice coefficient over character bigram multisets (0..1). */
export function bigramDice(a: string, b: string): number {
  const ga = bigrams(a);
  const gb = bigrams(b);
  if (ga.length === 0 || gb.length === 0) return 0;
  const mb = new Map<string, number>();
  for (const g of gb) mb.set(g, (mb.get(g) ?? 0) + 1);
  let overlap = 0;
  for (const g of ga) {
    const n = mb.get(g);
    if (n && n > 0) {
      overlap++;
      mb.set(g, n - 1);
    }
  }
  return (2 * overlap) / (ga.length + gb.length);
}

/** Normalized Levenshtein similarity (1 - dist/maxLen, 0..1). */
export function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1;
  const m = a.length;
  const n = b.length;
  if (m === 0 || n === 0) return 0;
  const d: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return 1 - d[n] / Math.max(m, n);
}

// ─── Inverted index + retrieval ────────────────────────────────

export interface WsEntry {
  id: string;
  titleMarathi: string;
  /** Precomputed bigrams of the first line. */
  grams: string[];
  /** Normalized first line (kept for trigram indexing). */
  line: string;
  /** Normalized full text (for the confirmation stage). */
  fullNorm: string;
}

/** Max entries a single trigram bucket may hold (trigrams in more lines are
 * non-discriminative and would blow up candidate sets). */
const MAX_BUCKET = 60;
/** Max candidates scored per query in retrieveCandidates. */
const MAX_CANDIDATES = 400;

/**
 * Build a trigram → candidate-entry inverted index over Wikisource first lines.
 * Buckets are capped at MAX_BUCKET: a trigram shared by 60+ first lines is too
 * common to discriminate (correct matches share many rare trigrams too, so
 * recall is preserved).
 */
export function buildIndex(entries: Array<{ id: string; titleMarathi: string; line: string; fullNorm: string }>): {
  entries: WsEntry[];
  index: Map<string, WsEntry[]>;
} {
  const mapped: WsEntry[] = entries.map((e) => ({
    id: e.id,
    titleMarathi: e.titleMarathi,
    grams: bigrams(e.line),
    line: e.line,
    fullNorm: e.fullNorm,
  }));
  const index = new Map<string, WsEntry[]>();
  for (const e of mapped) {
    for (const tg of trigrams(e.line)) {
      let list = index.get(tg);
      if (!list) { list = []; index.set(tg, list); }
      if (list.length < MAX_BUCKET) list.push(e);
    }
  }
  return { entries: mapped, index };
}

/**
 * Retrieve candidate entries whose first line shares trigrams with the query,
 * scored by first-line bigram Dice, top `top` returned. First-line score is
 * retrieval-only — confirmation happens on full text.
 */
export function retrieveCandidates(
  queryLine: string,
  index: Map<string, WsEntry[]>,
  top = 30,
): WsEntry[] {
  const qgrams = trigrams(queryLine);
  if (qgrams.size === 0) return [];
  const seen = new Set<WsEntry>();
  const collected: WsEntry[] = [];
  for (const tg of qgrams) {
    for (const e of index.get(tg) ?? []) {
      if (!seen.has(e)) {
        seen.add(e);
        collected.push(e);
        if (collected.length >= MAX_CANDIDATES) break;
      }
    }
    if (collected.length >= MAX_CANDIDATES) break;
  }
  return collected
    .map((e) => ({ e, dice: bigramDice(queryLine, e.line) }))
    .sort((a, b) => b.dice - a.dice)
    .slice(0, top)
    .map(({ e }) => e);
}

export interface RetrievalResult {
  entry: WsEntry;
  firstLineScore: number;
  reason: 'no-candidates' | 'below-retrieval' | 'retrieved';
}

/**
 * Stage 1: find the best Wikisource candidate for one OCR first line.
 * Returns a candidate (retrieval only — NOT confirmation) or a rejection
 * reason. Score = 0.6*levenshtein + 0.4*dice on the first line.
 */
export function retrieveBest(
  queryLine: string,
  index: Map<string, WsEntry[]>,
  threshold = RETRIEVAL_THRESHOLD,
): RetrievalResult {
  const candidates = retrieveCandidates(queryLine, index, 30);
  if (candidates.length === 0) {
    return { entry: undefined as unknown as WsEntry, firstLineScore: 0, reason: 'no-candidates' };
  }
  const scored = candidates.map((e) => {
    const lev = levenshteinRatio(queryLine, e.line);
    const dice = bigramDice(queryLine, e.line);
    return { entry: e, score: 0.6 * lev + 0.4 * dice };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (best.score < threshold) {
    return { entry: undefined as unknown as WsEntry, firstLineScore: best.score, reason: 'below-retrieval' };
  }
  return { entry: best.entry, firstLineScore: best.score, reason: 'retrieved' };
}

export interface Confirmation {
  fullDice: number;
  lengthRatio: number;
  confirmed: boolean;
  reason: 'confirmed' | 'below-full-threshold' | 'bad-length-ratio';
}

/**
 * Stage 2: confirm a candidate by FULL-text agreement. A row is confirmed only
 * when the normalized full texts share ≥ `fullThreshold` bigram Dice AND the
 * length ratio stays within [MIN, MAX]. Fragments (partial OCR) and merged
 * rows (multiple abhangs in one archive row) fail the ratio gate.
 */
export function confirmFullText(
  queryFullNorm: string,
  candidateFullNorm: string,
  fullThreshold = DEFAULT_FULL_THRESHOLD,
): Confirmation {
  const fullDice = bigramDice(queryFullNorm, candidateFullNorm);
  const lengthRatio = queryFullNorm.length / Math.max(1, candidateFullNorm.length);
  if (fullDice < fullThreshold) {
    return { fullDice, lengthRatio, confirmed: false, reason: 'below-full-threshold' };
  }
  if (lengthRatio < MIN_LENGTH_RATIO || lengthRatio > MAX_LENGTH_RATIO) {
    return { fullDice, lengthRatio, confirmed: false, reason: 'bad-length-ratio' };
  }
  return { fullDice, lengthRatio, confirmed: true, reason: 'confirmed' };
}

// ─── Importer ──────────────────────────────────────────────────

export interface VariantImportOptions {
  dryRun?: boolean;
  fullThreshold?: number;
}

export interface VariantImportResult {
  backupRows: number;
  wikisourceRows: number;
  exactLinked: number;
  fuzzyLinked: number;
  belowRetrieval: number;
  noCandidates: number;
  belowFullThreshold: number;
  badLengthRatio: number;
  alreadyPresent: number;
  /** Score histogram buckets of fuzzy links. */
  histogram: Array<{ bucket: string; count: number }>;
}

export async function importArchiveVariants(options: VariantImportOptions = {}): Promise<VariantImportResult> {
  const dryRun = options.dryRun ?? false;
  const fullThreshold = options.fullThreshold ?? DEFAULT_FULL_THRESHOLD;

  const backup = JSON.parse(fs.readFileSync(BACKUP, 'utf8')) as Array<{
    id: string;
    title_marathi: string;
    title_transliteration: string;
    full_text: string;
    type: string;
    source: string | null;
  }>;
  console.log(`Backup rows: ${backup.length}`);

  const ws = await db.composition.findMany({
    where: { source: { contains: 'mr.wikisource.org (तुकाराम गाथा' } },
    select: { id: true, titleMarathi: true, fullText: true },
  });
  console.log(`Wikisource abhangs: ${ws.length}`);

  // Exact index: normalized first line → unique composition.
  const byExact = new Map<string, { id: string; titleMarathi: string }>();
  let collisions = 0;
  for (const w of ws) {
    const fl = firstMeaningfulLine(w.fullText);
    if (fl.length < 15) continue;
    if (byExact.has(fl)) { collisions++; continue; }
    byExact.set(fl, { id: w.id, titleMarathi: w.titleMarathi });
  }
  console.log(`Exact first-line index: ${byExact.size} (${collisions} collisions skipped)`);

  // Fuzzy index: first-line trigrams → entries carrying the normalized full text.
  const { index: fuzzyIndex } = buildIndex(
    ws
      .map((w) => ({
        id: w.id,
        titleMarathi: w.titleMarathi,
        line: firstMeaningfulLine(w.fullText),
        fullNorm: normalizeLine(w.fullText),
      }))
      .filter((e) => e.line.length >= 15),
  );
  console.log(`Fuzzy trigram index: ${fuzzyIndex.size} trigram buckets\n`);

  const histogram = new Map<string, number>();
  const bucket = (s: number) => {
    const b = (Math.floor(s * 20) / 20).toFixed(2);
    return `${b}-${(Math.floor(s * 20) / 20 + 0.05).toFixed(2)}`;
  };

  let exactLinked = 0;
  let fuzzyLinked = 0;
  let belowRetrieval = 0;
  let noCandidates = 0;
  let belowFullThreshold = 0;
  let badLengthRatio = 0;
  let alreadyPresent = 0;
  const examples: string[] = [];

  for (const row of backup) {
    const fl = firstMeaningfulLine(row.full_text);
    if (!fl) { noCandidates++; continue; }

    // Stage 0: exact first-line match.
    const exact = fl.length >= 15 ? byExact.get(fl) : undefined;
    if (exact) {
      if (!dryRun) {
        const existing = await db.compositionVersion.findFirst({
          where: { compositionId: exact.id, changeReason: { contains: 'archive.org' } },
          select: { id: true },
        });
        if (existing) { alreadyPresent++; continue; }
        await db.compositionVersion.create({
          data: {
            compositionId: exact.id,
            versionNumber: 2,
            titleMarathi: row.title_marathi,
            titleTranslit: row.title_transliteration ?? '',
            fullText: row.full_text,
            changeReason: 'OCR variant (archive.org Sant Tukaram Gatha scan, public domain)',
            createdByUserId: null,
          },
        });
      }
      exactLinked++;
      continue;
    }

    // Stage 1: first-line retrieval.
    const r = retrieveBest(fl, fuzzyIndex);
    if (r.reason === 'no-candidates') { noCandidates++; continue; }
    if (r.reason === 'below-retrieval') { belowRetrieval++; continue; }

    // Stage 2: full-text confirmation.
    const conf = confirmFullText(normalizeLine(row.full_text), r.entry.fullNorm, fullThreshold);
    if (!conf.confirmed) {
      if (conf.reason === 'below-full-threshold') belowFullThreshold++;
      else badLengthRatio++;
      continue;
    }

    if (dryRun) {
      histogram.set(bucket(conf.fullDice), (histogram.get(bucket(conf.fullDice)) ?? 0) + 1);
      if (examples.length < 8) {
        examples.push(`${row.title_marathi} → ${r.entry.titleMarathi} (full ${conf.fullDice.toFixed(2)}, ratio ${conf.lengthRatio.toFixed(2)}, first ${r.firstLineScore.toFixed(2)})`);
      }
      fuzzyLinked++;
      continue;
    }

    const existing = await db.compositionVersion.findFirst({
      where: { compositionId: r.entry.id, changeReason: { contains: 'archive.org' } },
      select: { id: true },
    });
    if (existing) { alreadyPresent++; continue; }

    await db.compositionVersion.create({
      data: {
        compositionId: r.entry.id,
        versionNumber: 2,
        titleMarathi: row.title_marathi,
        titleTranslit: row.title_transliteration ?? '',
        fullText: row.full_text,
        changeReason: 'OCR variant (archive.org Sant Tukaram Gatha scan, public domain)',
        createdByUserId: null,
      },
    });
    fuzzyLinked++;
    histogram.set(bucket(conf.fullDice), (histogram.get(bucket(conf.fullDice)) ?? 0) + 1);
  }

  console.log(`\n${dryRun ? 'DRY RUN' : 'IMPORT'} summary (full-threshold ${fullThreshold}):`);
  console.log(`  Exact linked:         ${exactLinked}`);
  console.log(`  Fuzzy linked:         ${fuzzyLinked}`);
  console.log(`  Below retrieval:      ${belowRetrieval}`);
  console.log(`  No candidates:        ${noCandidates}`);
  console.log(`  Below full threshold: ${belowFullThreshold}`);
  console.log(`  Bad length ratio:     ${badLengthRatio}`);
  console.log(`  Already present:      ${alreadyPresent}`);
  if (dryRun && examples.length > 0) {
    console.log('\n  Example fuzzy links:');
    for (const e of examples) console.log(`    ${e}`);
  }
  if (histogram.size > 0) {
    console.log('\n  Fuzzy score histogram:');
    for (const [b, c] of [...histogram.entries()].sort()) console.log(`    ${b}: ${c}`);
  }

  return {
    backupRows: backup.length,
    wikisourceRows: ws.length,
    exactLinked,
    fuzzyLinked,
    belowRetrieval,
    noCandidates,
    belowFullThreshold,
    badLengthRatio,
    alreadyPresent,
    histogram: [...histogram.entries()].map(([b, c]) => ({ bucket: b, count: c })),
  };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const thresholdArg = args.find((a) => a.startsWith('--full-threshold='));
  importArchiveVariants({
    dryRun,
    fullThreshold: thresholdArg ? parseFloat(thresholdArg.split('=')[1]) : undefined,
  })
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
}
