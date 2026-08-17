/**
 * Vitthalaya — Verify SantSahitya Import Against Live Pages
 *
 * Reusable audit script: for every santsahitya.in composition in the DB,
 * resolves the live WordPress post (by reconstructing the slug from the
 * stored title, with a first-line search fallback), re-extracts verse +
 * अर्थ with the importer's exact parser, and reports whether the stored
 * text still matches the live page.
 *
 * Designed for batches: `--limit` + `--offset` for windowed runs, and a
 * `--report` JSONL file that doubles as a resume checkpoint — rows already
 * in the report are skipped, so an interrupted run can be continued.
 *
 * Status per row:
 *   PASS        — verse + meaning identical to live page
 *   DIFF        — verse differs (or meaning missing/mismatched)
 *   NOT_FOUND   — no live post matched
 *   SKIP        — row already in the report (resume)
 *   ERROR       — network/parse failure (retryable)
 *
 * Usage:
 *   bun run scripts/verify-santsahitya.ts --limit=100
 *   bun run scripts/verify-santsahitya.ts --offset=100 --limit=100
 *   bun run scripts/verify-santsahitya.ts --limit=500 --report=.freebuff/santsahitya-verify.jsonl
 *   bun run scripts/verify-santsahitya.ts --report=.freebuff/santsahitya-verify.jsonl  # resume
 */
import { db } from '../src/db/client';
import fs from 'fs';
import { normalizeForComparison } from '../src/canonical/normalization';
import { parsePostContent } from './acquire-santsahitya';
import { normalizeLine, firstMeaningfulLine } from './import-archive-variants';
import type { WpPost } from './acquire-santsahitya';

const API_BASE = 'https://www.santsahitya.in/wp-json/wp/v2';
const USER_AGENT = 'Vitthalaya/1.0 (content acquisition; contact@vitthalaya)';
const REQUEST_DELAY_MS = 350;
const PAGE_FIELDS = '_fields=slug,link,title,content,categories';

// ─── HTTP helpers ──────────────────────────────────────────────

async function wpFetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Slug reconstruction ───────────────────────────────────────

/**
 * Reverse the importer's `slugToTranslit`/`canonicalTitleFromSlug` naming
 * to produce the likely WordPress slug(s) for a stored titleTranslit.
 * Returns several candidates; the verifier tries each until one resolves.
 */
export function candidateSlugs(titleTranslit: string): string[] {
  const t = titleTranslit.trim();
  const out: string[] = [];

  // "Eknath Abhang 9" / "Tukaram Abhang 163" → numbered gatha patterns.
  const numMatch = t.match(/^(.+?)\s+Abhang\s+(\d+)$/i);
  if (numMatch) {
    const saint = numMatch[1].toLowerCase().replace(/\s+/g, '-');
    const n = numMatch[2];
    out.push(`sant-${saint}-gatha-abhang-krmank-${n}`);
    out.push(`sant-${saint}-gatha-abhang-${n}`);
    out.push(`sant-${saint}-abhang-${n}`);
  }

  // "Chokhoba Abhang 39" — already slug-like, lowercase + dashes.
  const slugified = t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (slugified) out.push(slugified);

  // Range pages: "Abhang 3013 To 3220" → abhang-3013-to-3220
  const rangeMatch = t.match(/^Abhang\s+(\d+)\s+To\s+(\d+)$/i);
  if (rangeMatch) out.push(`abhang-${rangeMatch[1]}-to-${rangeMatch[2]}`);

  return [...new Set(out)];
}

/** Resolve a post by slug (returns undefined when the slug does not exist). */
async function fetchPostBySlug(slug: string): Promise<WpPost | undefined> {
  const arr = await wpFetchJson<WpPost[]>(`/posts?slug=${encodeURIComponent(slug)}&${PAGE_FIELDS}`);
  return arr[0];
}

/** First-line search fallback: find posts whose content matches the opening. */
async function searchByFirstLine(firstLine: string): Promise<WpPost[]> {
  const q = encodeURIComponent(firstLine.replace(/[॥।]/g, ' ').trim().slice(0, 60));
  const arr = await wpFetchJson<WpPost[]>(`/posts?search=${q}&per_page=3&${PAGE_FIELDS}`);
  return arr;
}

/** Best live-post match for a DB row: exact slug first, then first-line search scored by Dice. */
export async function resolveLivePost(
  row: { titleTranslit: string; fullText: string },
  delayMs = REQUEST_DELAY_MS,
): Promise<{ post: WpPost; method: 'slug' | 'search'; dice: number } | null> {
  for (const slug of candidateSlugs(row.titleTranslit)) {
    try {
      const post = await fetchPostBySlug(slug);
      if (post) {
        const parsed = parsePostContent(post);
        const dice = parsed
          ? bigramDice(normalizeLine(parsed.verse), normalizeLine(row.fullText))
          : 0;
        return { post, method: 'slug', dice };
      }
    } catch {
      // keep trying candidates
    }
    await sleep(delayMs);
  }

  // Fallback: first-line search, score candidates, pick best.
  const fl = firstMeaningfulLine(row.fullText);
  if (fl) {
    try {
      const hits = await searchByFirstLine(fl);
      let best: WpPost | null = null;
      let bestDice = 0;
      for (const post of hits) {
        const parsed = parsePostContent(post);
        if (!parsed) continue;
        const dice = bigramDice(normalizeLine(parsed.verse), normalizeLine(row.fullText));
        if (dice > bestDice) { bestDice = dice; best = post; }
        await sleep(delayMs);
      }
      if (best && bestDice >= 0.5) return { post: best, method: 'search', dice: bestDice };
    } catch {
      // fall through to null
    }
  }
  return null;
}

function bigramDice(a: string, b: string): number {
  const ga = bigrams(a);
  const gb = bigrams(b);
  if (ga.length === 0 || gb.length === 0) return 0;
  const mb = new Map<string, number>();
  for (const g of gb) mb.set(g, (mb.get(g) ?? 0) + 1);
  let overlap = 0;
  for (const g of ga) {
    const n = mb.get(g);
    if (n && n > 0) { overlap++; mb.set(g, n - 1); }
  }
  return (2 * overlap) / (ga.length + gb.length);
}
function bigrams(s: string): string[] {
  const t = s.toLowerCase().replace(/\s+/g, '');
  const out: string[] = [];
  for (let i = 0; i + 2 <= t.length; i++) out.push(t.slice(i, i + 2));
  return out;
}

// ─── Verifier ──────────────────────────────────────────────────

export interface VerifyOptions {
  limit?: number;
  offset?: number;
  reportPath?: string;
  /** Delay between live-site requests (ms). Default 350. */
  delayMs?: number;
  quiet?: boolean;
}

export interface VerifyResult {
  total: number;
  pass: number;
  diff: number;
  notFound: number;
  skipped: number;
  errors: number;
  diffs: Array<{ id: string; title: string; detail: string }>;
}

export async function verifySantSahitya(options: VerifyOptions = {}): Promise<VerifyResult> {
  const { limit, offset = 0, reportPath, quiet = false } = options;
  const delayMs = options.delayMs ?? REQUEST_DELAY_MS;

  // Existing report = resume checkpoint (rows already verified).
  const done = new Set<string>();
  if (reportPath && fs.existsSync(reportPath)) {
    for (const line of fs.readFileSync(reportPath, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const rec = JSON.parse(line) as { id: string };
        done.add(rec.id);
      } catch { /* skip malformed line */ }
    }
  }
  if (!quiet) console.log(`Resume checkpoint: ${done.size} rows already verified`);

  const rows = await db.composition.findMany({
    where: { source: { contains: 'santsahitya' } },
    select: { id: true, titleTranslit: true, titleMarathi: true, fullText: true, meaning: true },
    orderBy: { createdAt: 'asc' },
    skip: offset,
    take: limit ?? 1000,
  });

  const reportStream = reportPath ? fs.createWriteStream(reportPath, { flags: 'a' }) : null;
  const record = (rec: unknown) => {
    if (reportStream) reportStream.write(`${JSON.stringify(rec)}\n`);
  };

  let pass = 0;
  let diff = 0;
  let notFound = 0;
  let skipped = 0;
  let errors = 0;
  const diffs: Array<{ id: string; title: string; detail: string }> = [];

  if (!quiet) console.log(`Verifying ${rows.length} rows (offset ${offset})...\n`);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (done.has(row.id)) { skipped++; continue; }

    const label = `${row.titleTranslit || row.titleMarathi}`;
    try {
      const resolved = await resolveLivePost(row, delayMs);
      if (!resolved) {
        notFound++;
        record({ id: row.id, status: 'NOT_FOUND', title: label, at: new Date().toISOString() });
        if (!quiet) console.log(`  ✗ NOT_FOUND  ${label}`);
        continue;
      }

      const parsed = parsePostContent(resolved.post);
      if (!parsed) {
        errors++;
        record({ id: row.id, status: 'ERROR', title: label, detail: 'live post unparseable', at: new Date().toISOString() });
        if (!quiet) console.log(`  ✗ ERROR      ${label} (unparseable live post)`);
        continue;
      }

      const verseSame = normalizeForComparison(row.fullText) === normalizeForComparison(parsed.verse);
      const meaningSame = normalizeForComparison(row.meaning ?? '') === normalizeForComparison(parsed.meaning ?? '');

      if (verseSame && meaningSame) {
        pass++;
        record({ id: row.id, status: 'PASS', title: label, method: resolved.method, at: new Date().toISOString() });
        if (!quiet) console.log(`  ✓ PASS       ${label}`);
      } else {
        diff++;
        const dbWords = normalizeForComparison(row.fullText).split(/\s+/).filter(Boolean);
        const liveWords = normalizeForComparison(parsed.verse).split(/\s+/).filter(Boolean);
        const liveSet = new Set(liveWords);
        const missing = dbWords.filter((w) => !liveSet.has(w)).slice(0, 6).join(' ');
        const detail = `verse ${verseSame ? 'OK' : 'DIFFERS'} (${dbWords.length}w vs ${liveWords.length}w${missing ? `; db-only: ${missing}` : ''}), meaning ${meaningSame ? 'OK' : (parsed.meaning ? 'DIFFERS' : 'MISSING in live')}, dice ${resolved.dice.toFixed(2)}`;
        diffs.push({ id: row.id, title: label, detail });
        record({ id: row.id, status: 'DIFF', title: label, detail, at: new Date().toISOString() });
        if (!quiet) console.log(`  ⚠ DIFF      ${label} — ${detail}`);
      }
    } catch (err) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      record({ id: row.id, status: 'ERROR', title: label, detail: msg, at: new Date().toISOString() });
      if (!quiet) console.log(`  ✗ ERROR      ${label} — ${msg}`);
    }
    await sleep(delayMs);
  }

  if (reportStream) reportStream.end();

  if (!quiet) {
    console.log('\n═══ VERIFICATION SUMMARY ═══');
    console.log(`  Total:    ${rows.length}`);
    console.log(`  Pass:     ${pass}`);
    console.log(`  Diff:     ${diff}`);
    console.log(`  NotFound: ${notFound}`);
    console.log(`  Skipped:  ${skipped}`);
    console.log(`  Errors:   ${errors}`);
  }

  return { total: rows.length, pass, diff, notFound, skipped, errors, diffs };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const arg = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
  const limitArg = arg('limit');
  const offsetArg = arg('offset');
  const delayArg = arg('delay');
  verifySantSahitya({
    limit: limitArg ? parseInt(limitArg, 10) : undefined,
    offset: offsetArg ? parseInt(offsetArg, 10) : undefined,
    reportPath: arg('report'),
    delayMs: delayArg ? parseInt(delayArg, 10) : undefined,
  })
    .then((r) => process.exit(r.errors > 0 ? 2 : r.diff > 0 ? 1 : 0))
    .catch((e) => { console.error('Fatal:', e); process.exit(3); });
}
