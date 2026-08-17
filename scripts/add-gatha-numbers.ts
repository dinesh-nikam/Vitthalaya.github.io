/**
 * Vitthalaya — Add Canonical Gatha Numbers to Eknath Abhangs
 *
 * The santsahitya.in import titled Eknath abhangs with the site's own
 * section-relative krmank numbering (e.g. "Eknath Abhang 9"). The canonical
 * Eknath Gatha uses a global sequence (Gatha #1524 for that same abhang).
 * This script matches each imported abhang to its global Gatha number via
 * the first meaningful line, using the full Gatha index published at
 * abhangas.blogspot.com, and stores the canonical number in the new
 * `alternateTitles` JSON field.
 *
 * The index stores each abhang's opening as a ~30-character snippet
 * ("1524 देवकी वसूदेवाकडे पाहे । तंव तो"), so matching is PREFIX-based:
 * the normalized DB first line must start with the normalized index snippet.
 * Rows with no prefix match are reported and left untouched (never guessed).
 *
 * Usage:
 *   bun run scripts/add-gatha-numbers.ts            # report + write
 *   bun run scripts/add-gatha-numbers.ts --dry-run  # report only
 */
import { db } from '../src/db/client';
import fs from 'fs';
import { normalizeLine, firstMeaningfulLine } from './import-archive-variants';

const INDEX_FILE = process.env.GATHA_INDEX_FILE ?? '.freebuff/eknath-index.html';
const INDEX_URL = 'https://abhangas.blogspot.com/p/san.html';
const USER_AGENT = 'Vitthalaya/1.0 (content acquisition; contact@vitthalaya)';

/** Parse "N <first ~30 chars of abhang first line>" entries from the index. */
export function parseGathaIndex(text: string): Array<{ gathaNumber: number; snippet: string }> {
  const dec = text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
  const plain = dec
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
  const re = /\s(\d{1,4})\s+([\u0900-\u097F][^0-9]*?)(?=\s\d{1,4}\s|$)/g;
  const out: Array<{ gathaNumber: number; snippet: string }> = [];
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = re.exec(plain)) !== null) {
    const num = Number(m[1]);
    const snippet = normalizeLine(m[2]).slice(0, 50);
    if (snippet.length >= 8) {
      if (!seen.has(snippet)) {
        seen.add(snippet);
        out.push({ gathaNumber: num, snippet });
      } else {
        // Same opening snippet twice — the numbers are sequential duplicates
        // from the index page structure; keep the first occurrence.
      }
    }
  }
  return out;
}

export interface AddGathaNumbersResult {
  gathaEntries: number;
  eknathRows: number;
  matched: number;
  unmatched: Array<{ title: string; firstLine: string }>;
  written: number;
}

export async function addGathaNumbers(options: { dryRun?: boolean } = {}): Promise<AddGathaNumbersResult> {
  const dryRun = options.dryRun ?? false;

  // ─── Load the index (download if the cached file is missing) ──
  let html: string;
  if (fs.existsSync(INDEX_FILE)) {
    html = fs.readFileSync(INDEX_FILE, 'utf8');
  } else {
    console.log(`Downloading Gatha index from ${INDEX_URL} ...`);
    const res = await fetch(INDEX_URL, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`Index fetch HTTP ${res.status}`);
    html = await res.text();
    fs.writeFileSync(INDEX_FILE, html, 'utf8');
  }
  const gatha = parseGathaIndex(html);
  console.log(`Gatha index entries parsed: ${gatha.length}`);

  // Prefix map: sorted snippets for longest-prefix lookup.
  const byLen = gatha.map((e) => ({ ...e, len: e.snippet.length })).sort((a, b) => b.len - a.len);

  // ─── Load the numbered Eknath rows from santsahitya ──────────
  const rows = await db.composition.findMany({
    where: { source: { contains: 'santsahitya' }, titleTranslit: { startsWith: 'Eknath Abhang ' } },
    select: { id: true, titleTranslit: true, fullText: true, alternateTitles: true },
  });
  console.log(`Santsahitya numbered Eknath rows: ${rows.length}`);

  const matched: Array<{ id: string; title: string; gathaNumber: number }> = [];
  const unmatched: Array<{ title: string; firstLine: string }> = [];

  for (const row of rows) {
    const fl = firstMeaningfulLine(row.fullText);
    if (!fl) { unmatched.push({ title: row.titleTranslit, firstLine: '(none)' }); continue; }
    const key = normalizeLine(fl);
    // Find the longest index snippet that is a prefix of the DB first line.
    let gathaNumber: number | null = null;
    for (const e of byLen) {
      if (key.startsWith(e.snippet)) { gathaNumber = e.gathaNumber; break; }
    }
    if (gathaNumber === null) {
      unmatched.push({ title: row.titleTranslit, firstLine: fl.slice(0, 50) });
      continue;
    }
    matched.push({ id: row.id, title: row.titleTranslit, gathaNumber });
  }

  console.log(`\n${dryRun ? 'DRY RUN' : 'WRITE'} summary:`);
  console.log(`  Matched: ${matched.length}, unmatched: ${unmatched.length}`);
  for (const u of unmatched) console.log(`  ⚠ unmatched: ${u.title} | first: ${u.firstLine}`);
  for (const m of matched.slice(0, 8)) console.log(`  ✓ ${m.title} → Gatha ${m.gathaNumber}`);

  if (dryRun) return { gathaEntries: gatha.length, eknathRows: rows.length, matched: matched.length, unmatched, written: 0 };

  // ─── Write alternateTitles ────────────────────────────────────
  let written = 0;
  for (const m of matched) {
    await db.composition.update({
      where: { id: m.id },
      data: { alternateTitles: [`Gatha ${m.gathaNumber}`, `Eknath Gatha Abhang ${m.gathaNumber}`] },
    });
    written++;
  }
  console.log(`\n  Written: ${written} rows`);
  return { gathaEntries: gatha.length, eknathRows: rows.length, matched: matched.length, unmatched, written };
}

if (import.meta.main) {
  const dryRun = process.argv.includes('--dry-run');
  addGathaNumbers({ dryRun })
    .then(() => process.exit(0))
    .catch((e) => { console.error('Fatal:', e); process.exit(1); });
}
