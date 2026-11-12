/**
 * Vitthalaya — Wikisource Bulk Importer
 *
 * Imports complete gatha-format books and single-page devotional texts from
 * Marathi Wikisource (public domain, CC-BY-SA):
 *
 *   - तुकाराम गाथा — 4,583 abhangs across 16 pages of ~300 each
 *     ("तुकाराम गाथा/गाथा १ ते ३००" … "गाथा ४२०१ ते ४५८३"). Each page is
 *     fetched as wikitext via the MediaWiki API and split on standalone
 *     Devanagari number lines into individual abhangs.
 *   - Single-page categories (स्तोत्रे, भजने, हरिपाठ) — each page becomes one
 *     composition titled by its page name.
 *
 * Every extracted composition runs through the standard acquisition pipeline
 * (normalize → content-hash dedup → quality score → persist → search index),
 * the same path used by acquire-internet-archive.ts.
 *
 * Usage:
 *   bun run scripts/acquire-wikisource-bulk.ts --dry-run        # preview splits
 *   bun run scripts/acquire-wikisource-bulk.ts --limit=300      # first page only
 *   bun run scripts/acquire-wikisource-bulk.ts --books=gatha         # gatha only
 *   bun run scripts/acquire-wikisource-bulk.ts --books=tail          # categories only
 *   bun run scripts/acquire-wikisource-bulk.ts --books=haripath      # 5-saint Haripaths
 *   bun run scripts/acquire-wikisource-bulk.ts --books=dnyaneshwari  # 18 chapters
 *   bun run scripts/acquire-wikisource-bulk.ts                       # everything
 *   bun run scripts/acquire-wikisource-bulk.ts --incremental   # skip pages whose wikitext
 *                                                              # is unchanged since the last run
 *   bun run scripts/acquire-wikisource-bulk.ts --since=2026-08-01T00:00:00Z
 *                                                              # only pages revised since then
 *
 * Incremental state (per-page last-seen revision ID) is persisted in
 * .freebuff/wikisource-bulk-state.json. The scheduled DiscoveryJob passes
 * `incremental` so daily cycles only re-crawl pages whose wikitext changed,
 * instead of re-fetching every page every run.
 */

import { db } from '../src/db/client';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isMarathiText } from '../src/canonical/normalization';
import { AcquisitionPipeline } from '../src/crawl4ai/pipeline';
import { ContentExtractor } from '../src/crawl4ai/content-extractor';
import { ContentSegmenter } from '../src/crawl4ai/content-segmenter';
import { MetadataExtractor } from '../src/crawl4ai/metadata-extractor';
import { QualityScorer } from '../src/crawl4ai/quality-scorer';
import type { CrawlerEngine, ExtractedComposition } from '../src/crawl4ai/types';

// ─── Wikisource API ─────────────────────────────────────────────

const WIKISOURCE_API = 'https://mr.wikisource.org/w/api.php';
const USER_AGENT = 'Vitthalaya/1.0 (content acquisition; contact@vitthalaya)';

/** Devanagari digit → ASCII digit */
const DEVANAGARI_DIGITS: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};
function toAscii(s: string): string {
  return [...s].map((c) => DEVANAGARI_DIGITS[c] ?? c).join('');
}

/** ASCII digit → Devanagari digit (for Marathi titles). */
const ASCII_TO_DEVANAGARI: Record<string, string> = {
  '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
  '5': '५', '6': '६', '7': '७', '8': '८', '9': '९',
};
function toDevanagari(s: string): string {
  return [...s].map((c) => ASCII_TO_DEVANAGARI[c] ?? c).join('');
}

async function apiGet(params: Record<string, string>): Promise<any> {
  const url = `${WIKISOURCE_API}?${new URLSearchParams(params)}`;
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(60_000),
      });
      if (res.status === 429) {
        const wait = 2000 * Math.pow(2, attempt + 1);
        console.log(`  ⏳ 429, waiting ${wait / 1000}s...`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // MediaWiki rate limiting returns HTTP 200 with an error body
      // (e.g. {"error":{"code":"ratelimited"}}) — treat as a retry.
      if (data?.error) {
        const wait = 3000 * Math.pow(2, attempt + 1);
        console.log(`  ⏳ API error (${data.error.code}), waiting ${wait / 1000}s...`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      return data;
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Fetch the raw wikitext of a page. */
async function fetchWikitext(title: string): Promise<string> {
  const data = await apiGet({
    action: 'parse',
    format: 'json',
    formatversion: '2',
    page: title,
    prop: 'wikitext',
  });
  if (!data?.parse?.wikitext) {
    throw new Error(`No wikitext returned for ${title}`);
  }
  return data.parse.wikitext;
}

/** List mainspace pages in a category (paged). */
async function listCategoryPages(category: string): Promise<string[]> {
  const pages: string[] = [];
  let cmcontinue: string | undefined;
  do {
    const data = await apiGet({
      action: 'query',
      format: 'json',
      list: 'categorymembers',
      cmtitle: `Category:${category}`,
      cmlimit: '500',
      cmtype: 'page',
      ...(cmcontinue ? { cmcontinue } : {}),
    });
    for (const m of data?.query?.categorymembers ?? []) {
      if (m.ns === 0) pages.push(m.title);
    }
    cmcontinue = data?.continue?.cmcontinue;
    await new Promise((r) => setTimeout(r, 400));
  } while (cmcontinue);
  return pages;
}

// ─── Incremental state (per-page revision tracking) ──────────────

/** Persisted per-page revision state for incremental re-crawls. */
export interface PageCrawlState {
  revId?: number;
  fetchedAt?: string;
}

export type BulkCrawlState = Record<string, PageCrawlState>;

/** Latest revision info for a page, from the MediaWiki API. */
export interface PageRevision {
  revId: number;
  timestamp: string;
}

function getStateFilePath(): string {
  return path.join(process.cwd(), '.freebuff', 'wikisource-bulk-state.json');
}

/** Load the persisted per-page revision state (missing/corrupt → empty). */
export async function loadBulkState(): Promise<BulkCrawlState> {
  try {
    const raw = await readFile(getStateFilePath(), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Persist per-page revision state atomically (tmp file + rename). */
export async function saveBulkState(state: BulkCrawlState): Promise<void> {
  const filePath = getStateFilePath();
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tmp = path.join(dir, 'wikisource-bulk-state.json.tmp');
  await writeFile(tmp, JSON.stringify(state, null, 2));
  await rename(tmp, filePath);
}

/**
 * Fetch the latest revision of each page. Two strategies, both verified
 * against the live API:
 *
 *  - incremental mode (no `since`): a single batch `prop=info` call per 50
 *    titles returns `lastrevid` per page — the exact "wikitext changed"
 *    signal — so the whole catalog's freshness check is 1–2 cheap requests.
 *  - `since` mode: `rvstart`/`rvdir=newer` may only be used on a SINGLE page
 *    (`invalidparammix` on multi-title), so query per title; only pages with a
 *    revision newer than the timestamp appear in the result at all.
 */
async function fetchLatestRevids(titles: string[], since?: string): Promise<Map<string, PageRevision>> {
  const out = new Map<string, PageRevision>();

  if (since) {
    for (const title of titles) {
      const data = await apiGet({
        action: 'query',
        format: 'json',
        formatversion: '2',
        prop: 'revisions',
        rvprop: 'ids|timestamp',
        rvlimit: '1',
        rvstart: since,
        rvdir: 'newer',
        titles: title,
      });
      const rev = data?.query?.pages?.[0]?.revisions?.[0];
      if (rev?.revid) {
        out.set(title, { revId: rev.revid, timestamp: rev.timestamp });
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    return out;
  }

  for (let i = 0; i < titles.length; i += 50) {
    const chunk = titles.slice(i, i + 50);
    const data = await apiGet({
      action: 'query',
      format: 'json',
      formatversion: '2',
      prop: 'info',
      titles: chunk.join('|'),
    });
    for (const page of data?.query?.pages ?? []) {
      if (page?.lastrevid) {
        out.set(page.title, { revId: page.lastrevid, timestamp: page.touched });
      }
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return out;
}

/**
 * Pure decision: which titles to crawl, given the latest revisions and the
 * persisted state. Exported for unit tests.
 *
 *  - `since` mode: crawl iff the page has a revision newer than `since`.
 *  - incremental mode: crawl iff the latest revId differs from the stored one
 *    (or the page was never fetched).
 *  - neither: crawl everything (full run).
 */
export function decideIncremental(
  titles: string[],
  revids: Map<string, PageRevision>,
  state: BulkCrawlState,
  since?: string,
): { crawl: Set<string>; skipped: number } {
  const crawl = new Set<string>();
  let skipped = 0;
  for (const title of titles) {
    const rev = revids.get(title);
    let unchanged = false;
    if (since) {
      unchanged = !rev; // no revision newer than `since` → nothing new
    } else if (rev) {
      unchanged = state[title]?.revId === rev.revId;
    }
    if (unchanged) skipped++;
    else crawl.add(title);
  }
  return { crawl, skipped };
}

/**
 * Network + decision wrapper used by the importer. Always fetches the latest
 * revids (1–2 batch requests) so a successful fetch can record the exact
 * lastrevid as state — even on full runs, which builds the baseline the next
 * scheduled incremental cycle skips against.
 */
async function resolveIncrementalTitles(
  titles: string[],
  opts: { incremental?: boolean; since?: string; state: BulkCrawlState },
): Promise<{ crawl: Set<string>; skipped: number; revids: Map<string, PageRevision> }> {
  const revids = await fetchLatestRevids(titles, opts.since);
  if (!opts.incremental && !opts.since) {
    return { crawl: new Set(titles), skipped: 0, revids };
  }
  const { crawl, skipped } = decideIncremental(titles, revids, opts.state, opts.since);
  return { crawl, skipped, revids };
}

/**
 * Record a successful fetch in the incremental state. In `since` mode the
 * per-title revision query only exposes the OLDEST revision newer than the
 * timestamp, which is not a trustworthy baseline — so preserve any existing
 * revId and only refresh fetchedAt (the incremental cycle re-records exact
 * lastrevids on its next pass).
 */
function recordFetch(state: BulkCrawlState, title: string, revId: number | undefined, since: boolean): void {
  state[title] = {
    ...state[title],
    ...(since ? {} : { revId }),
    fetchedAt: new Date().toISOString(),
  };
}

// ─── Noop engine (pipeline needs one; runForExtractedCompositions skips crawl) ─

function createNoopEngine(): CrawlerEngine {
  return {
    initialize: async () => {},
    crawl: async () => ({
      id: '', url: '', status: 'completed' as const, strategy: 'ocr' as const,
      compositions: [], startedAt: new Date().toISOString(),
    }),
    crawlBatch: async () => [],
    crawlDeep: async () => [],
    destroy: async () => {},
    getStats: () => ({ pagesCrawled: 0, uptimeMs: 0 }),
  };
}

// ─── Gatha page splitting ───────────────────────────────────────

/**
 * Clean MediaWiki markup from a page's wikitext: templates, category links,
 * wikilinks (keep the label), refs, and HTML tags.
 */
export function cleanWikitext(wikitext: string): string {
  return wikitext
    .replace(/<poem>/g, '\n')
    .replace(/<\/poem>/g, '\n')
    .replace(/\{\{[^{}]*\}\}/g, ' ') // simple (non-nested) templates
    .replace(/\[\[(?:वर्ग|श्रेणी|Category):[^\]]*\]\]/g, '')
    .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/'''/g, '')
    .replace(/''/g, '')
    .replace(/^[=]+\s*(.+?)\s*[=]+$/gm, '$1') // == heading == → plain line
    .split('\n')
    .map((l) => l.trim())
    .join('\n');
}

/**
 * Split a cleaned gatha page into individual abhangs. A new abhang starts at a
 * standalone Devanagari number line (e.g. `१`, `४५८३`). Verse-end markers like
 * `॥१॥` are inline and never split.
 */
export function splitGathaPage(cleaned: string): Array<{ number: string; text: string }> {
  const lines = cleaned.split('\n');
  const segments: Array<{ number: string; lines: string[] }> = [];
  let current: { number: string; lines: string[] } | null = null;

  for (const line of lines) {
    // Gatha pages use Devanagari digits (१, ३०१) up to ~600 and ASCII digits
    // (1201, 4583) from 601 onward — accept both.
    const num = line.match(/^([०१२३४५६७८९0-9]{1,5})$/);
    if (num) {
      if (current && current.lines.length > 0) {
        segments.push(current);
      }
      current = { number: num[1], lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current && current.lines.length > 0) segments.push(current);

  return segments
    .map((s) => ({ number: s.number, text: s.lines.join('\n').trim() }))
    .filter((s) => isValidAbhang(s.text));
}

/** A segment is a real abhang: Marathi verse text, no template remnants. */
export function isValidAbhang(text: string): boolean {
  const t = text.trim();
  if (t.length < 40) return false;
  if (!isMarathiText(t)) return false;
  if (t.includes('{{') || t.includes('}}') || t.includes('<')) return false;
  // Verse text carries at least one danda or an author line.
  return t.includes('॥') || /(म्हणे|ह्मणे|ध्रुव|ध्रु\.)/.test(t);
}

// ─── Haripath splitting ─────────────────────────────────────────

/**
 * Strip `{इ}`-style variant annotations that OCR/source texts use to mark
 * alternate glyphs inside a word (e.g. `जा{इ}जे` → `जाजे`). Keeps the base
 * character and drops the braces.
 */
export function stripVariantAnnotations(text: string): string {
  return text.replace(/\{([^}]{1,4})\}/g, '$1');
}

/**
 * Split a cleaned Haripath page into individual abhangs. Two known styles:
 *
 *  1. Word-number markers (ज्ञानदेव): standalone `॥ एक ॥`, `॥ दोन ॥` lines.
 *  2. Standalone Devanagari digit lines (एकनाथ, नामदेव, तुकाराम): a line
 *     containing only `१`, `२`, … starts a new abhang. Verse-end markers
 *     inside abhangs look like `.. १..` (period-danda), not `॥१॥`.
 */
export function splitHaripathPage(cleaned: string): Array<{ number: string; text: string }> {
  const lines = cleaned.split('\n');
  const segments: Array<{ number: string; lines: string[] }> = [];
  let current: { number: string; lines: string[] } | null = null;

  const WORD_NUMS =
    'एक|दोन|तिन|चार|पाच|सहा|सात|आठ|नऊ|दहा|अकरा|बारा|तेरा|चौदा|पंधरा|सोळा|सतरा|अठरा|एकोणीस|वीस|एकवीस|बावीस|तेवीस|चोवीस|पंचवीस|सव्वीस|सत्तावीस|अठ्ठावीस|एकोणतीस|तीस|एकतीस|बत्तीस|तेहतीस|चौतीस|पस्तीस|छत्तीस|सदतीस|अडतीस|एकोणचाळीस|चाळीस';
  const wordMarker = new RegExp(`^[॥।]\\s*(${WORD_NUMS}|[०-९]{1,2})\\s*[॥।]\\s*$`);

  for (const raw of lines) {
    const line = stripVariantAnnotations(raw).trim();
    if (!line) continue;

    const digitNum = line.match(/^([०१२३४५६७८९]{1,3})$/);
    const wordNum = line.match(wordMarker);
    const isBoundary = digitNum || wordNum;
    if (isBoundary) {
      if (current && current.lines.length > 0) segments.push(current);
      current = {
        number: digitNum ? digitNum[1] : (wordNum ? wordNum[1] : ''),
        lines: [],
      };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current && current.lines.length > 0) segments.push(current);

  return segments
    .map((s) => ({ number: s.number, text: s.lines.join('\n').trim() }))
    .filter((s) => isValidHaripathAbhang(s.text));
}

/** A Haripath abhang: Marathi verse with danda/period-danda markers or a म्हणे line. */
export function isValidHaripathAbhang(text: string): boolean {
  const t = text.trim();
  if (t.length < 40) return false;
  if (!isMarathiText(t)) return false;
  if (t.includes('{{') || t.includes('}}') || t.includes('<')) return false;
  return t.includes('॥') || /\.\s*[०-९]{1,2}\s*\.\./.test(t) || /(म्हणे|ह्मणे)/.test(t);
}

// ─── Book registry ──────────────────────────────────────────────

const GATHA_CATEGORY = 'गाथा';
const GATHA_PREFIX = 'तुकाराम गाथा/गाथा ';

/** Single-page devotional categories — each page becomes one composition. */
const TAIL_CATEGORIES = ['स्तोत्रे', 'भजने', 'हरिपाठ'] as const;

/** Haripath saint subpages under हरिपाठ/ — each abhang becomes a composition. */
const HARIPATH_PAGES = [
  { title: 'हरिपाठ/श्री ज्ञानदेव हरिपाठ', saint: 'ज्ञानदेव', translit: 'Dnyandev' },
  { title: 'हरिपाठ/श्री निवृत्तिनाथ हरिपाठ', saint: 'निवृत्तिनाथ', translit: 'Nivruttinath' },
  { title: 'हरिपाठ/श्री एकनाथ हरिपाठ', saint: 'एकनाथ', translit: 'Eknath' },
  { title: 'हरिपाठ/श्री नामदेव हरिपाठ', saint: 'नामदेव', translit: 'Namdev' },
  { title: 'हरिपाठ/श्री तुकाराम हरिपाठ', saint: 'तुकाराम', translit: 'Tukaram' },
] as const;

/** Dnyaneshwari chapter pages (18) — each chapter becomes one composition. */
const DNYANESHWARI_CHAPTERS = [
  'ज्ञानेश्वरी/अध्याय पहिला',
  'ज्ञानेश्वरी/अध्याय दुसरा',
  'ज्ञानेश्वरी/अध्याय तिसरा',
  'ज्ञानेश्वरी/अध्याय चौथा',
  'ज्ञानेश्वरी/अध्याय पांचवा',
  'ज्ञानेश्वरी/अध्याय सहावा',
  'ज्ञानेश्वरी/अध्याय सातवा',
  'ज्ञानेश्वरी/अध्याय आठवा',
  'ज्ञानेश्वरी/अध्याय नववा',
  'ज्ञानेश्वरी/अध्याय दहावा',
  'ज्ञानेश्वरी/अध्याय अकरावा',
  'ज्ञानेश्वरी/अध्याय बारावा',
  'ज्ञानेश्वरी/अध्याय तेरावा',
  'ज्ञानेश्वरी/अध्याय चौदावा',
  'ज्ञानेश्वरी/अध्याय पंधरावा',
  'ज्ञानेश्वरी/अध्याय सोळावा',
  'ज्ञानेश्वरी/अध्याय सतरावा',
  'ज्ञानेश्वरी/अध्याय अठरावा',
] as const;

// ─── Main acquisition ───────────────────────────────────────────

export interface BulkAcquireOptions {
  dryRun?: boolean;
  /** Which source group to process: 'gatha' | 'tail' | 'haripath' | 'dnyaneshwari' | undefined (all). */
  books?: 'gatha' | 'tail' | 'haripath' | 'dnyaneshwari';
  /** Cap on gatha pages crawled (default: all). */
  maxPages?: number;
  /** Cap on compositions processed total. */
  maxCompositions?: number;
  quiet?: boolean;
  /**
   * Incremental mode: skip pages whose latest revision ID matches the last
   * successfully fetched one (persisted in .freebuff/wikisource-bulk-state.json).
   * The scheduled DiscoveryJob passes this so unchanged pages aren't re-crawled.
   */
  incremental?: boolean;
  /** One-shot time window: only fetch pages with a revision newer than this ISO timestamp. */
  since?: string;
}

export interface BulkAcquireResult {
  pagesFound: number;
  pagesProcessed: number;
  pagesSkipped: number;
  abhangsSplit: number;
  itemsNew: number;
  itemsDuplicates: number;
  itemsErrored: number;
  durationMs: number;
}

/**
 * Run the Wikisource bulk acquisition end-to-end and return real counts.
 */
export async function acquireWikisourceBulk(options: BulkAcquireOptions = {}): Promise<BulkAcquireResult> {
  const dryRun = options.dryRun ?? false;
  const books = options.books;
  const maxPages = options.maxPages ?? Infinity;
  const maxCompositions = options.maxCompositions ?? Infinity;
  const incremental = options.incremental ?? false;
  const since = options.since;

  if (!options.quiet) {
    console.log('═'.repeat(60));
    console.log('  Vitthalaya — Wikisource Bulk Importer');
    console.log('═'.repeat(60));
    console.log(`  Dry run: ${dryRun ? 'YES' : 'NO'}`);
    console.log(`  Books:   ${books ?? 'gatha + tail + haripath + dnyaneshwari'}`);
    console.log(`  Mode:    ${since ? `crawl only pages revised since ${since}` : incremental ? 'incremental (skip unchanged pages)' : 'full crawl'}`);
    console.log();
  }

  const all: ExtractedComposition[] = [];
  let pagesFound = 0;
  let pagesProcessed = 0;
  let pagesSkipped = 0;
  let abhangsSplit = 0;
  const state = await loadBulkState();

  // ─── Gatha: discover subpages, fetch, split ─────────────────
  if (!books || books === 'gatha') {
    if (!options.quiet) console.log(`📡 Discovering गाथा pages from Category:${GATHA_CATEGORY}...`);
    let gathaPages: string[] = [];
    try {
      gathaPages = (await listCategoryPages(GATHA_CATEGORY))
        .filter((t) => t.startsWith(GATHA_PREFIX))
        .sort((a, b) => {
          const na = parseInt(toAscii(a.split('/').pop() ?? '').match(/\d+/)?.[0] ?? '0', 10);
          const nb = parseInt(toAscii(b.split('/').pop() ?? '').match(/\d+/)?.[0] ?? '0', 10);
          return na - nb;
        });
    } catch (err) {
      console.error(`  ❌ Failed to discover गाथा pages: ${err instanceof Error ? err.message : err}`);
    }
    pagesFound += gathaPages.length;

    let toCrawl = maxPages < Infinity ? gathaPages.slice(0, maxPages) : gathaPages;
    const gathaResolved = await resolveIncrementalTitles(toCrawl, { incremental, since, state });
    toCrawl = gathaPages.filter((t) => gathaResolved.crawl.has(t));
    pagesSkipped += gathaResolved.skipped;
    if (!options.quiet) {
      console.log(`  ${toCrawl.length} gatha pages to import (of ${gathaPages.length} discovered)${incremental || since ? ` — ${gathaResolved.skipped} unchanged skipped` : ''}\n`);
    }

    for (let i = 0; i < toCrawl.length; i++) {
      const title = toCrawl[i];
      const progress = `[${i + 1}/${toCrawl.length}]`;
      console.log(`${progress} 📄 ${title}`);

      try {
        const wikitext = await fetchWikitext(title);
        const abhangs = splitGathaPage(cleanWikitext(wikitext));
        abhangsSplit += abhangs.length;
        pagesProcessed++;
        recordFetch(state, title, gathaResolved.revids.get(title)?.revId, since !== undefined);

        for (const ab of abhangs) {
          all.push({
            titleMarathi: `तुकाराम अभंग ${toDevanagari(toAscii(ab.number))}`,
            titleTranslit: `Tukaram Abhang ${toAscii(ab.number)}`,
            fullText: ab.text,
            type: 'abhang',
            sourceAttribution: `Source: mr.wikisource.org (${title}) — CC-BY-SA 4.0`,
            sourceUrl: `https://mr.wikisource.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
            language: 'mr',
            confidence: 0.95,
            saintNameMarathi: 'तुकाराम महाराज',
            bookReference: title,
            verseNumbers: ab.number,
          });
        }
        console.log(`  ✅ ${abhangs.length} abhangs split`);
      } catch (err) {
        console.error(`  ❌ Failed: ${err instanceof Error ? err.message : err}`);
      }
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  // ─── Haripath: each saint's abhangs → HARIPATH compositions ─
  if (!books || books === 'haripath') {
    if (!options.quiet) console.log('\n📖 Haripath (5 saints)…');
    const haripathResolved = await resolveIncrementalTitles(
      HARIPATH_PAGES.map((p) => p.title),
      { incremental, since, state },
    );
    pagesSkipped += haripathResolved.skipped;
    if (!options.quiet && (incremental || since)) {
      console.log(`  ${haripathResolved.skipped} unchanged, ${haripathResolved.crawl.size} to fetch`);
    }
    for (const page of HARIPATH_PAGES) {
      if (!haripathResolved.crawl.has(page.title)) continue;
      console.log(`  📄 ${page.title}`);
      try {
        const wikitext = await fetchWikitext(page.title);
        const abhangs = splitHaripathPage(cleanWikitext(wikitext));
        pagesProcessed++;
        abhangsSplit += abhangs.length;
        recordFetch(state, page.title, haripathResolved.revids.get(page.title)?.revId, since !== undefined);
        for (const ab of abhangs) {
          const num = ab.number ? ` (${ab.number})` : '';
          all.push({
            titleMarathi: `हरिपाठ — ${page.saint}${num}`,
            titleTranslit: `${page.translit.toLowerCase()}-haripath-${toAscii(ab.number) || ab.number}`,
            fullText: ab.text,
            type: 'haripath',
            sourceAttribution: `Source: mr.wikisource.org (${page.title}) — CC-BY-SA 4.0`,
            sourceUrl: `https://mr.wikisource.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
            language: 'mr',
            confidence: 0.95,
            saintNameMarathi: page.saint,
            bookReference: page.title,
            verseNumbers: ab.number,
          });
        }
        console.log(`  ✅ ${abhangs.length} abhangs split`);
      } catch (err) {
        console.error(`  ❌ Failed: ${err instanceof Error ? err.message : err}`);
      }
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  // ─── Dnyaneshwari: each chapter = one composition ───────────
  if (!books || books === 'dnyaneshwari') {
    if (!options.quiet) console.log('\n📖 Dnyaneshwari (18 chapters)…');
    const dnyanResolved = await resolveIncrementalTitles(
      [...DNYANESHWARI_CHAPTERS],
      { incremental, since, state },
    );
    pagesSkipped += dnyanResolved.skipped;
    if (!options.quiet && (incremental || since)) {
      console.log(`  ${dnyanResolved.skipped} unchanged, ${dnyanResolved.crawl.size} to fetch`);
    }
    for (const title of DNYANESHWARI_CHAPTERS) {
      if (!dnyanResolved.crawl.has(title)) continue;
      console.log(`  📄 ${title}`);
      try {
        const wikitext = await fetchWikitext(title);
        const text = stripVariantAnnotations(cleanWikitext(wikitext)).replace(/\n{3,}/g, '\n\n').trim();
        if (text.length < 100 || !isMarathiText(text)) {
          console.log('    ⏭️  too short / not Marathi — skipped');
          continue;
        }
        pagesProcessed++;
        recordFetch(state, title, dnyanResolved.revids.get(title)?.revId, since !== undefined);
        all.push({
          titleMarathi: title.replace(/\//g, ' — '),
          titleTranslit: `dnyaneshwari-${title.split('/').pop()}`,
          fullText: text,
          type: 'ovi',
          sourceAttribution: `Source: mr.wikisource.org (${title}) — CC-BY-SA 4.0`,
          sourceUrl: `https://mr.wikisource.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
          language: 'mr',
          confidence: 0.95,
          saintNameMarathi: 'ज्ञानेश्वर',
          bookReference: title,
        });
      } catch (err) {
        console.error(`  ❌ Failed: ${err instanceof Error ? err.message : err}`);
      }
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  // ─── Tail categories: each page = one composition ───────────
  if (!books || books === 'tail') {
    for (const category of TAIL_CATEGORIES) {
      if (!options.quiet) console.log(`\n📂 Category: ${category}`);
      let pages: string[] = [];
      try {
        pages = await listCategoryPages(category);
      } catch (err) {
        console.error(`  ❌ Failed to list ${category}: ${err instanceof Error ? err.message : err}`);
        continue;
      }
      pagesFound += pages.length;
      const tailResolved = await resolveIncrementalTitles(pages, { incremental, since, state });
      pagesSkipped += tailResolved.skipped;
      if (!options.quiet && (incremental || since)) {
        console.log(`  ${tailResolved.skipped} unchanged, ${tailResolved.crawl.size} to fetch`);
      }

      for (const title of pages) {
        if (!tailResolved.crawl.has(title)) continue;
        console.log(`  📄 ${title}`);
        try {
          const wikitext = await fetchWikitext(title);
          const text = cleanWikitext(wikitext).replace(/\n{3,}/g, '\n\n').trim();
          if (text.length < 40 || !isMarathiText(text)) {
            console.log('    ⏭️  too short / not Marathi — skipped');
            continue;
          }
          pagesProcessed++;
          recordFetch(state, title, tailResolved.revids.get(title)?.revId, since !== undefined);
          all.push({
            titleMarathi: title.replace(/^\//, ''),
            titleTranslit: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || undefined,
            fullText: text,
            type: category === 'स्तोत्रे' ? 'stotra' : category === 'भजने' ? 'bhajan' : 'abhang',
            sourceAttribution: `Source: mr.wikisource.org (${title}) — CC-BY-SA 4.0`,
            sourceUrl: `https://mr.wikisource.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
            language: 'mr',
            confidence: 0.95,
          });
        } catch (err) {
          console.error(`    ❌ Failed: ${err instanceof Error ? err.message : err}`);
        }
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  }

  // ─── Dry run: report what WOULD be imported ─────────────────
  if (dryRun) {
    console.log('\n' + '─'.repeat(50));
    console.log(`  DRY RUN — ${all.length} compositions would be processed:`);
    for (const c of all.slice(0, 8)) {
      const preview = c.fullText.replace(/\s+/g, ' ').slice(0, 110);
      console.log(`  • ${c.titleMarathi} [${c.type}]: ${preview}…`);
    }
    if (all.length > 8) console.log(`  …and ${all.length - 8} more`);
    return {
      pagesFound,
      pagesProcessed,
      pagesSkipped,
      abhangsSplit,
      itemsNew: all.length,
      itemsDuplicates: 0,
      itemsErrored: 0,
      durationMs: 0,
    };
  }

  // ─── Cap + run through the pipeline ──────────────────────────
  const toProcess = maxCompositions < Infinity ? all.slice(0, maxCompositions) : all;
  if (toProcess.length === 0) {
    console.log('\n⚠️  Nothing to import.');
    if (!dryRun) await saveBulkState(state);
    return { pagesFound, pagesProcessed, pagesSkipped, abhangsSplit, itemsNew: 0, itemsDuplicates: 0, itemsErrored: 0, durationMs: 0 };
  }

  console.log(`\n⚙️  Sending ${toProcess.length} compositions through the acquisition pipeline...`);
  const pipeline = new AcquisitionPipeline(
    createNoopEngine(),
    new ContentExtractor(),
    new ContentSegmenter(),
    new MetadataExtractor(),
    new QualityScorer(),
    { dryRun: false, maxCompositionsPerSource: 10_000, autoApproveThreshold: 0.70, enableEnrichment: false },
  );

  const startTime = Date.now();
  const result = await pipeline.runForExtractedCompositions(toProcess, 'Marathi Wikisource (bulk)', {
    sourceUrl: 'https://mr.wikisource.org',
    sourceTrustScore: 0.95,
    dryRun: false,
  });
  const durationMs = Date.now() - startTime;

  // ─── Report ─────────────────────────────────────────────────
  if (!options.quiet) {
    const finalCount = await db.composition.count();
    console.log('═'.repeat(60));
    console.log('  ACQUISITION COMPLETE');
    console.log('═'.repeat(60));
    console.log(`  Pages found:    ${pagesFound}`);
    console.log(`  Pages processed:${pagesProcessed}`);
    console.log(`  Unchanged skip: ${pagesSkipped}`);
    console.log(`  Abhangs split:  ${abhangsSplit}`);
    console.log(`  New:            ${result.compositionsExtracted}`);
    console.log(`  Duplicate:      ${result.duplicatesFound}`);
    console.log(`  Errors:         ${result.errors.length}`);
    console.log(`  Auto-approved:  ${result.autoApproved} | To moderation: ${result.sentToModeration}`);
    console.log(`  Time:           ${(durationMs / 1000).toFixed(1)}s`);
    console.log(`  DB count:       ${finalCount} total`);
    console.log();
  }

  if (!dryRun) await saveBulkState(state);

  return {
    pagesFound,
    pagesProcessed,
    pagesSkipped,
    abhangsSplit,
    itemsNew: result.compositionsExtracted,
    itemsDuplicates: result.duplicatesFound,
    itemsErrored: result.errors.length,
    durationMs,
  };
}

// ─── CLI ────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('--dryrun');
  const incremental = args.includes('--incremental');
  const booksArg = args.find((a) => a.startsWith('--books='));
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const maxCompArg = args.find((a) => a.startsWith('--max-compositions='));
  const sinceArg = args.find((a) => a.startsWith('--since='));

  await acquireWikisourceBulk({
    dryRun,
    incremental,
    since: sinceArg ? sinceArg.split('=')[1] : undefined,
    books: booksArg ? (booksArg.split('=')[1] as 'gatha' | 'tail' | 'haripath' | 'dnyaneshwari') : undefined,
    maxPages: limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined,
    maxCompositions: maxCompArg ? parseInt(maxCompArg.split('=')[1], 10) : undefined,
  });
}

if (import.meta.main) {
  main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}
