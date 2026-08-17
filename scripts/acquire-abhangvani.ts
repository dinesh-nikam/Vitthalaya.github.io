/**
 * Vitthalaya — Abhangvani.com Acquisition
 *
 * Imports Marathi devotional literature from abhangvani.com (a Next.js
 * "gadkilla" platform). Lyrics live in the `__NEXT_DATA__` JSON payload:
 *
 *   props.pageProps.parent           → page metadata (title, seoSlug)
 *   props.pageProps.parentContents[] → content blocks; dataTypeId === 2
 *                                      is the rich-text HTML lyrics block
 *   props.pageProps.parentChildrens[] → landing-page sub-pages (each a
 *                                      separate lyric page)
 *
 * Content shapes handled:
 *   - Multi-verse pages  (ओवी १०१: / अभंग: १ / क्र. १ markers) → split
 *     into individual compositions (Eknath Bhagwat ovyas, Dnyaneshwar
 *     Gatha abhangs, Gita/Ramayan adhyay shlokas).
 *   - Single-composition pages (aarti, stotra, chalisa, palana, bhajan).
 *   - Landing pages with `parentChildrens` → walk children (bounded).
 *
 * Non-lyric pages (kahani/stories, temple info, festival articles,
 * horoscope) are skipped unless they contain verse text.
 *
 * Deduplication:
 *   1. Cross-source canonical titles ("Eknath Bhagwat Adhyay 2 Ovi 101"
 *      etc.) checked against the DB before persist.
 *   2. In-batch content-hash dedup.
 *   3. Pipeline content-hash check at persist time.
 *
 * Usage:
 *   bun run scripts/acquire-abhangvani.ts            # all pages
 *   bun run scripts/acquire-abhangvani.ts --dry-run
 *   bun run scripts/acquire-abhangvani.ts --limit=20
 *   bun run scripts/acquire-abhangvani.ts --slug=sukhakarta-dukharta-ganapati-aarti-jai-dev-jai-dev
 */

import { db } from '../src/db/client';
import { contentHash, isMarathiText, normalizeForComparison } from '../src/canonical/normalization';
import { AcquisitionPipeline } from '../src/crawl4ai/pipeline';
import { ContentExtractor } from '../src/crawl4ai/content-extractor';
import { ContentSegmenter } from '../src/crawl4ai/content-segmenter';
import { MetadataExtractor } from '../src/crawl4ai/metadata-extractor';
import { QualityScorer } from '../src/crawl4ai/quality-scorer';
import { htmlToText } from '../src/lib/html-text';
import type { CrawlerEngine, ExtractedComposition } from '../src/crawl4ai/types';

// ─── Noop Crawler Engine (same pattern as santsahitya importer) ──
function createNoopEngine(): CrawlerEngine {
  return {
    initialize: async () => {},
    crawl: async () => ({
      id: '', url: '', status: 'completed' as const, strategy: 'sitemap' as const,
      compositions: [], startedAt: new Date().toISOString(),
    }),
    crawlBatch: async () => [],
    crawlDeep: async () => [],
    destroy: async () => {},
    getStats: () => ({ pagesCrawled: 0, uptimeMs: 0 }),
  };
}

// ─── Configuration ───────────────────────────────────────────────

const SITE = 'https://abhangvani.com';
const USER_AGENT = 'Vitthalaya/1.0 (content acquisition; contact@vitthalaya)';
const REQUEST_DELAY_MS = 350;
const MAX_CHILD_DEPTH = 2;
/** Persist + checkpoint every N content pages, so long runs survive. */
const FLUSH_EVERY = 120;

/** Sitemap index → per-sitemap files (fixed set from sitemap_index.xml). */
const SITEMAP_FILES = [
  'abhangvani-1.xml',
  'abhangvani-2.xml',
  'abhangvani-3.xml',
  'abhangvani-4.xml',
  'abhangvani-5.xml',
];

/** Devanagari digit → ASCII digit. */
const DEV_DIGITS: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

function devToAscii(s: string): string {
  return s.replace(/[०-९]/g, (d) => DEV_DIGITS[d] ?? d);
}

function asciiToDev(n: number): string {
  const map = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return String(n).replace(/\d/g, (d) => map[Number(d)]);
}

// ─── Types ───────────────────────────────────────────────────────

interface PageProps {
  parent?: { title?: string; seoSlug?: string; content?: string } | null;
  parentContents?: Array<{ dataTypeId?: number; src?: string }>;
  parentChildrens?: Array<{ seoSlug?: string; title?: string }>;
}

interface VerseSegment {
  /** Marker number as string (e.g. "101", "1"). */
  number: string;
  /** Verse text. */
  verse: string;
  /** अर्थ meaning block, if any. */
  meaning: string | null;
}

// ─── Fetch helpers ───────────────────────────────────────────────

async function fetchPageProps(url: string): Promise<PageProps | null> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`GET ${url} → HTTP ${res.status}`);
  }
  const html = await res.text();
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    const data = JSON.parse(m[1]);
    return data?.props?.pageProps ?? null;
  } catch {
    return null;
  }
}

async function fetchSitemapUrls(): Promise<string[]> {
  const urls: string[] = [];
  for (const file of SITEMAP_FILES) {
    const res = await fetch(`${SITE}/${file}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) continue;
    const xml = await res.text();
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const u = m[1].trim();
      if (u.startsWith(SITE) && !u.includes('play.google')) urls.push(u);
    }
    await sleep(REQUEST_DELAY_MS);
  }
  return [...new Set(urls)];
}

// ─── Content extraction ──────────────────────────────────────────

/** Extract the lyrics HTML block (dataTypeId === 2) from pageProps. */
function lyricsHtml(pp: PageProps): string | null {
  const item = (pp.parentContents ?? []).find((c) => c.dataTypeId === 2);
  return item?.src && item.src.length > 0 ? item.src : null;
}

/** Landing page (no lyrics itself) → child slugs to walk. */
function childSlugs(pp: PageProps): string[] {
  return (pp.parentChildrens ?? [])
    .map((c) => c.seoSlug)
    .filter((s): s is string => Boolean(s));
}

/**
 * Split the lyrics HTML into verse segments.
 *
 * Supported marker patterns (with Devanagari or ASCII digits):
 *   - `ओवी १०१:` / `ओवी 101:`   (Eknath Bhagwat, Ramayan, Gita)
 *   - `अभंग: १` / `अभंग: 1`      (Dnyaneshwar Gatha, Santaji)
 *   - `क्र. १` / `क्र. 1`         (Santaji abhangs)
 *
 * Returns one segment per marker; pages without markers return a single
 * segment with number "0".
 */
export function splitVerseHtml(html: string): VerseSegment[] {
  // Normalize for splitting: keep <br> so verse lines survive, then convert.
  // Marker patterns, matching Devanagari digits (१-९) or ASCII.
  const markerRe = /(?:<strong>\s*)?(ओवी|अभंग|क्र\.?)\s*[:.\s]*([०-९\d]+)\s*[:.\s]*(?:<\/strong>)?/g;

  // Find marker positions in the raw HTML.
  const positions: Array<{ index: number; kind: string; number: string }> = [];
  for (const m of html.matchAll(markerRe)) {
    positions.push({
      index: m.index,
      kind: m[1],
      number: devToAscii(m[2]),
    });
  }

  if (positions.length === 0) {
    // No markers → single composition (aarti/stotra/chalisa/single abhang).
    // Require verse structure so prose pages (saint bios, book intros) are
    // not treated as compositions. Verse lines are short lines ending in a
    // danda (।, ॥) or ASCII pipe (||) — prose paragraphs are long and don't.
    const text = htmlToText(html).replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\n{2,}/g, '\n').trim();
    if (text.length < 40 || !isMarathiText(text)) return [];
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const verseLike = lines.filter((l) => /[।॥]|\|\|/.test(l) && l.length < 160).length;
    const hasDanda = /[।॥]|\|\|/.test(text);
    const hasMeaning = /(^|\n)\s*अर्थ\s*[:.]/u.test(text);
    const isVerse = verseLike >= 3 || (hasMeaning && hasDanda) || (hasDanda && lines.length <= 40 && verseLike >= lines.length * 0.5);
    if (!isVerse) return [];
    return [{ number: '0', verse: text, meaning: null }];
  }

  const segments: VerseSegment[] = [];
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index;
    const end = i + 1 < positions.length ? positions[i + 1].index : html.length;
    const chunk = html.slice(start, end);
    // Remove the marker line itself from the chunk text.
    const text = htmlToText(chunk)
      .replace(new RegExp(`^(?:${positions[i].kind})\\s*[:.\\s]*[०-९\\d]+\\s*[:.\\s]*`, 'u'), '')
      .trim();

    // Split verse vs अर्थ.
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    let meaningStart = -1;
    for (let j = 0; j < lines.length; j++) {
      const n = normalizeForComparison(lines[j]);
      if (n === 'अर्थ' || (n.startsWith('अर्थ') && n.length <= 12)) {
        meaningStart = j;
        break;
      }
    }
    const verseLines = meaningStart === -1 ? lines : lines.slice(0, meaningStart);
    const meaningLines = meaningStart === -1 ? [] : lines.slice(meaningStart + 1);

    const verse = verseLines
      .join('\n')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')  // zero-width / BOM
      .replace(/^(?:अर्थ|मराठी|संस्कृत)\s*[:.]/u, '')
      .replace(/\n{2,}/g, '\n')
      .trim();
    const meaning = meaningLines.join('\n').replace(/\n{2,}/g, '\n').trim();

    if (verse.length < 40 || !isMarathiText(verse)) continue;
    segments.push({
      number: positions[i].number,
      verse,
      meaning: meaning.length > 0 ? meaning : null,
    });
  }
  return segments;
}

// ─── Title building & type detection ─────────────────────────────

interface PageContext {
  title: string;
  slug: string;
}

/** Build a canonical title from the page context + verse number. */
export function buildTitle(ctx: PageContext, seg: VerseSegment, kind: string): { titleMarathi: string; titleTranslit: string } {
  const base = ctx.title.replace(/\s+/g, ' ').trim();

  // No verse number → single-composition page (aarti/stotra/chalisa/…):
  // use the clean page title as-is, no fabricated numbering.
  if (seg.number === '0') {
    return { titleMarathi: base, titleTranslit: slugToTranslit(ctx.slug) };
  }

  // Eknath Bhagwat: "एकनाथी भागवत अध्याय २ ओवी १०१"
  if (kind === 'ovi' && /भागवत|भागवट/i.test(base)) {
    const adhyay = base.match(/अध्याय\s*([०-९\d]+)/u);
    const ad = adhyay ? adhyay[1] : '';
    return {
      titleMarathi: `एकनाथी भागवत अध्याय ${ad} ओवी ${asciiToDev(Number(seg.number))}`,
      titleTranslit: `Eknath Bhagwat Adhyay ${devToAscii(ad)} Ovi ${seg.number}`,
    };
  }
  // Dnyaneshwar Gatha: "संत ज्ञानेश्वर गाथा अभंग १"
  if (kind === 'abhang' && /ज्ञानेश्वर|dnyaneshwar/i.test(base)) {
    return {
      titleMarathi: `संत ज्ञानेश्वर गाथा अभंग ${asciiToDev(Number(seg.number))}`,
      titleTranslit: `Dnyaneshwar Gatha Abhang ${seg.number}`,
    };
  }
  // Gita adhyay: "श्रीमद्भगवद्गीता अध्याय १ श्लोक १"
  if (kind === 'ovi' && /गीता|gita/i.test(base)) {
    const adhyay = base.match(/अध्याय\s*([०-९\d]+)/u);
    const ad = adhyay ? asciiToDev(Number(devToAscii(adhyay[1]))) : '';
    return {
      titleMarathi: `श्रीमद्भगवद्गीता अध्याय ${ad} श्लोक ${asciiToDev(Number(seg.number))}`,
      titleTranslit: `Bhagavad Gita Adhyay ${devToAscii(adhyay?.[1] ?? '')} Shloka ${seg.number}`,
    };
  }
  // Ramayan: "भावार्थ रामायण बालकाण्ड अध्याय १ ओवी १"
  if (kind === 'ovi' && /रामायण|ramayan/i.test(base)) {
    return {
      titleMarathi: `${base} ओवी ${asciiToDev(Number(seg.number))}`,
      titleTranslit: `${base} Ovi ${seg.number}`,
    };
  }
  // Default: title + number.
  return {
    titleMarathi: `${base} ${asciiToDev(Number(seg.number))}`,
    titleTranslit: `${slugToTranslit(ctx.slug)} ${seg.number}`,
  };
}

/** Detect verse kind from the marker text. */
function kindFromMarker(marker: string): string {
  if (marker === 'ओवी') return 'ovi';
  if (marker === 'अभंग') return 'abhang';
  return 'abhang';
}

/** Detect composition type from title/slug (for the pipeline). */
function detectType(ctx: PageContext): string | undefined {
  const t = ctx.title + ' ' + ctx.slug;
  if (/आरती|aarti|arati|arato/i.test(t)) return 'aarti';
  if (/स्तोत्र|stotra|stotr|चालीसा|chalisa|कवच|kavach|सहस्रनाम|sahasranama|स्तुति|stuti|श्लोकी|shloki/i.test(t)) return 'stotra';
  if (/भजन|bhajan/i.test(t)) return 'bhajan';
  if (/अभंग|abhang/i.test(t)) return 'abhang';
  if (/ओवी|ovi|गाथा|gatha/i.test(t)) return 'ovi';
  if (/हरिपाठ|haripath/i.test(t)) return 'haripath';
  if (/पालना|palana|palna/i.test(t)) return 'bhajan';
  return 'other';
}

/** Detect saint name from title/slug. */
function detectSaint(ctx: PageContext): { marathi?: string; translit?: string } {
  const t = ctx.title + ' ' + ctx.slug;
  if (/ज्ञानेश्वर|dnyaneshwar|dnyaneswar/i.test(t)) return { marathi: 'संत ज्ञानेश्वर महाराज', translit: 'Dnyaneshwar Maharaj' };
  if (/एकनाथ|eknath/i.test(t)) return { marathi: 'संत एकनाथ महाराज', translit: 'Eknath Maharaj' };
  if (/तुकाराम|tukaram/i.test(t)) return { marathi: 'संत तुकाराम महाराज', translit: 'Tukaram Maharaj' };
  if (/नामदेव|namdev/i.test(t)) return { marathi: 'संत नामदेव महाराज', translit: 'Namdev Maharaj' };
  if (/संताजी|santaji/i.test(t)) return { marathi: 'संत संताजी जगनाडे', translit: 'Santaji Maharaj' };
  if (/रामदास|ramdas/i.test(t)) return { marathi: 'संत समर्थ रामदास', translit: 'Ramdas Maharaj' };
  return {};
}

/** Non-lyric pages we skip outright (stories, temple info, festivals, horoscope). */
function isNonLyricPage(ctx: PageContext): boolean {
  const t = normalizeForComparison(ctx.title + ' ' + ctx.slug);
  if (t.length < 4) return true;
  // Horoscope: राशी pages (कर्क, सिंह, मिथुन, ...) with no verse.
  if (/^(कर्क|सिंह|कन्या|तूळ|वृश्चिक|मकर|कुम्भ|मीन|मेष|वृषभ|मिथुन|धनु)\b/.test(t)) return true;
  if (/kahani|katha|_kahani_|_katha/.test(ctx.slug)) return true;
  if (/mandir|jyotirling|kshetra|tirth|devasthan|yatra/.test(ctx.slug)) return true;
  if (/diwali|navratri|ekadashi|pujan|pooja|puja-|pandhra|amavasya|story|meaning|significance|history|information/.test(ctx.slug)) return true;
  return false;
}

// ─── Dedup helpers ───────────────────────────────────────────────

async function findExistingByTitle(titleTranslit: string): Promise<string | null> {
  const existing = await db.composition.findFirst({
    where: { titleTranslit },
    select: { id: true },
  });
  return existing?.id ?? null;
}

// ─── Main ────────────────────────────────────────────────────────

export interface AbhangvaniOptions {
  dryRun?: boolean;
  /** Cap on pages processed (sitemap + children). */
  limit?: number;
  /** Process a single slug (e.g. --slug=sukhakarta-dukharta-ganapati-aarti-jai-dev-jai-dev). */
  slug?: string;
  /** Skip banner logging (driven by discovery worker). */
  quiet?: boolean;
  /** Resume: skip pages recorded in the checkpoint file. */
  resume?: boolean;
}

/** Checkpoint file: line-separated URLs already processed (for resume). */
const CHECKPOINT_FILE = '.freebuff/abhangvani-checkpoint.txt';

function loadCheckpoint(): Set<string> {
  try {
    const fs = require('fs');
    if (!fs.existsSync(CHECKPOINT_FILE)) return new Set();
    return new Set(fs.readFileSync(CHECKPOINT_FILE, 'utf8').split('\n').map((l: string) => l.trim()).filter(Boolean));
  } catch {
    return new Set();
  }
}

function saveCheckpoint(url: string): void {
  try {
    const fs = require('fs');
    fs.appendFileSync(CHECKPOINT_FILE, url + '\n');
  } catch {
    /* best-effort */
  }
}

export interface AbhangvaniResult {
  pagesFound: number;
  pagesProcessed: number;
  itemsFound: number;
  itemsNew: number;
  itemsDuplicates: number;
  itemsErrored: number;
  itemsSkippedNoLyrics: number;
  durationMs: number;
}

export async function acquireAbhangvani(options: AbhangvaniOptions = {}): Promise<AbhangvaniResult> {
  const { dryRun = false, limit, slug, quiet = false, resume = false } = options;

  if (!quiet) {
    console.log('═'.repeat(60));
    console.log('  Vitthalaya — Abhangvani.com Acquisition');
    console.log('═'.repeat(60));
    console.log(`  Dry run: ${dryRun ? 'YES' : 'NO'}`);
    if (slug) console.log(`  Slug: ${slug}`);
    if (limit) console.log(`  Page limit: ${limit}`);
    console.log();
  }

  const startTime = Date.now();

  // ─── Step 1: discover page URLs ─────────────────────────────
  let pageUrls: string[];
  if (slug) {
    pageUrls = [`${SITE}/${slug}`];
  } else {
    try {
      pageUrls = await fetchSitemapUrls();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!quiet) console.error(`❌ Sitemap fetch failed: ${msg}`);
      return { pagesFound: 0, pagesProcessed: 0, itemsFound: 0, itemsNew: 0, itemsDuplicates: 0, itemsErrored: 1, itemsSkippedNoLyrics: 0, durationMs: 0 };
    }
  }
  if (!quiet) console.log(`  Sitemap: ${pageUrls.length} pages`);

  let totalItems = 0;
  let totalNew = 0;
  let totalDuplicates = 0;
  let totalErrors = 0;
  let totalSkippedNoLyrics = 0;
  let pagesProcessed = 0;

  const allCompositions: ExtractedComposition[] = [];
  const seenHashes = new Set<string>();
  const seenCanonicalTitles = new Set<string>();

  // Pipeline persists each flushed batch, so a timed-out run only loses the
  // current batch — checkpointed pages are never re-fetched.
  const pipeline = new AcquisitionPipeline(
    createNoopEngine(),
    new ContentExtractor(),
    new ContentSegmenter(),
    new MetadataExtractor(),
    new QualityScorer(),
    { dryRun: false, maxCompositionsPerSource: 30000, autoApproveThreshold: 0.70, enableEnrichment: false },
  );

  /** URLs of content pages awaiting checkpoint (persisted in this batch). */
  const pendingCheckpoint: string[] = [];

  async function flushBatch(): Promise<void> {
    if (allCompositions.length === 0) return;
    if (!quiet) console.log(`   … flushing batch of ${allCompositions.length} → pipeline`);
    const res = await pipeline.runForExtractedCompositions(allCompositions, 'abhangvani.com', {
      sourceUrl: SITE,
      sourceTrustScore: 0.75,
      dryRun: false,
    });
    totalNew += res.compositionsExtracted;
    totalDuplicates += res.duplicatesFound;
    totalErrors += res.errors.length;
    allCompositions.length = 0;
    for (const u of pendingCheckpoint) saveCheckpoint(u);
    pendingCheckpoint.length = 0;
  }

  // ─── Step 2: walk pages (bounded) ───────────────────────────
  const queue: Array<{ url: string; depth: number }> = pageUrls.map((u) => ({ url: u, depth: 0 }));
  const visited = new Set<string>();
  const checkpoint = resume ? loadCheckpoint() : new Set<string>();
  if (checkpoint.size > 0 && !quiet) console.log(`  Resume: ${checkpoint.size} pages already processed — skipping`);
  let processed = 0;
  let skippedResumed = 0;
  let contentPages = 0;

  while (queue.length > 0 && (limit === undefined || processed < limit)) {
    const { url, depth } = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);
    if (checkpoint.has(url)) {
      skippedResumed++;
      continue;
    }
    processed++;
    pagesProcessed++;

    let pp: PageProps | null;
    try {
      pp = await fetchPageProps(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!quiet) console.error(`   ❌ ${url}: ${msg}`);
      totalErrors++;
      continue;
    }
    if (!pp) {
      if (!quiet) console.error(`   ❌ ${url}: no pageProps`);
      totalErrors++;
      continue;
    }

    const ctx: PageContext = {
      title: (pp.parent?.title ?? '').replace(/\s+/g, ' ').trim().replace(/\s*\|.*$/, ''),
      slug: pp.parent?.seoSlug ?? url.split('/').pop() ?? '',
    };

    // Landing page → walk children. Process children depth-first (unshift)
    // so the checkpoint captures complete subtrees and resume never orphans
    // a landing page's children.
    const html = lyricsHtml(pp);
    if (!html || html.length < 100) {
      const kids = childSlugs(pp);
      if (kids.length > 0 && depth < MAX_CHILD_DEPTH) {
        for (const k of kids.slice(0, limit ? Math.max(0, limit - processed) : undefined)) {
          queue.unshift({ url: `${SITE}/${k}`, depth: depth + 1 });
        }
      } else {
        totalSkippedNoLyrics++;
      }
      await sleep(REQUEST_DELAY_MS);
      continue;
    }

    if (isNonLyricPage(ctx)) {
      totalSkippedNoLyrics++;
      await sleep(REQUEST_DELAY_MS);
      continue;
    }

    // ─── Page-level cross-source dedup ────────────────────────
    // If the page itself (e.g. "Dnyaneshwari Adhya 1", "Amrutanubhav")
    // already exists in the DB from another source, the per-verse splits
    // below are the same content re-imported — skip the whole page.
    const pageTitleTranslit = slugToTranslit(ctx.slug);
    if (pageTitleTranslit && !seenCanonicalTitles.has(pageTitleTranslit)) {
      const pageExisting = await findExistingByTitle(pageTitleTranslit);
      if (pageExisting) {
        seenCanonicalTitles.add(pageTitleTranslit);
        totalDuplicates++;
        saveCheckpoint(url);
        if (!quiet) console.log(`   ⏭  ${pageTitleTranslit}: page already in DB — skipping`);
        await sleep(REQUEST_DELAY_MS);
        continue;
      }
    }

    // ─── Extract segments ─────────────────────────────────────
    let segments: VerseSegment[];
    try {
      segments = splitVerseHtml(html);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!quiet) console.error(`   ❌ Parse ${url}: ${msg}`);
      totalErrors++;
      await sleep(REQUEST_DELAY_MS);
      continue;
    }

    if (segments.length === 0) {
      totalSkippedNoLyrics++;
      await sleep(REQUEST_DELAY_MS);
      continue;
    }

    // Determine marker kind from the first segment's HTML again.
    // (splitVerseHtml already found markers; infer kind from page.)
    const markerKind = /(ओवी|अभंग|क्र\.?)/.exec(html)?.[1] ?? 'abhang';
    const kind = kindFromMarker(markerKind);
    const type = detectType(ctx);
    const saint = detectSaint(ctx);

    for (const seg of segments) {
      totalItems++;
      const { titleMarathi, titleTranslit } = buildTitle(ctx, seg, kind);

      // ─── Layer 1: cross-source canonical-title dedup ────────
      if (seg.number !== '0') {
        if (seenCanonicalTitles.has(titleTranslit)) {
          totalDuplicates++;
          continue;
        }
        const existingId = await findExistingByTitle(titleTranslit);
        if (existingId) {
          seenCanonicalTitles.add(titleTranslit);
          totalDuplicates++;
          continue;
        }
      }

      // ─── Layer 2: in-batch content-hash dedup ───────────────
      const hash = contentHash(seg.verse);
      if (seenHashes.has(hash)) {
        totalDuplicates++;
        continue;
      }
      seenHashes.add(hash);

      allCompositions.push({
        titleMarathi,
        titleTranslit,
        fullText: seg.verse,
        meaning: seg.meaning ?? undefined,
        type,
        saintNameMarathi: saint.marathi,
        saintNameTranslit: saint.translit,
        sourceAttribution: 'Source: Abhangvani (abhangvani.com)',
        sourceUrl: url,
        language: 'mr',
        region: 'Maharashtra',
        confidence: 0.8,
        metadata: {
          abhangvaniPage: ctx.slug,
          verseNumber: seg.number,
        },
      });
    }

    pendingCheckpoint.push(url);
    contentPages++;
    if (contentPages % FLUSH_EVERY === 0) {
      await flushBatch();
    }
    if (!quiet && processed % 25 === 0) {
      console.log(`   … ${processed} pages, ${totalItems} items, ${allCompositions.length} in batch`);
    }
    await sleep(REQUEST_DELAY_MS);
  }
  if (skippedResumed > 0 && !quiet) console.log(`  Skipped ${skippedResumed} checkpointed pages`);

  // Final flush of the remaining batch.
  await flushBatch();

  if (!quiet) {
    console.log(`  Pages processed: ${pagesProcessed}`);
    console.log(`  → ${allCompositions.length} compositions to pipeline (after title + in-batch dedup)`);
  }

  if (dryRun) {
    if (!quiet) {
      for (const c of allCompositions.slice(0, 10)) {
        const preview = c.fullText.split('\n')[0].slice(0, 70);
        console.log(`     • ${c.titleTranslit ?? c.titleMarathi}: ${preview}`);
      }
      if (allCompositions.length > 10) console.log(`     … and ${allCompositions.length - 10} more`);
    }
    const durationMs = Date.now() - startTime;
    return { pagesFound: pageUrls.length, pagesProcessed, itemsFound: totalItems, itemsNew: allCompositions.length, itemsDuplicates: totalDuplicates, itemsErrored: totalErrors, itemsSkippedNoLyrics: totalSkippedNoLyrics, durationMs };
  }

  const durationMs = Date.now() - startTime;
  const elapsed = (durationMs / 1000).toFixed(1);

  if (!quiet) {
    console.log('═'.repeat(60));
    console.log('  ACQUISITION COMPLETE');
    console.log('═'.repeat(60));
    console.log(`  Pages:        ${pagesProcessed}`);
    console.log(`  Items found:  ${totalItems}`);
    console.log(`  New:          ${totalNew}`);
    console.log(`  Duplicates:   ${totalDuplicates}`);
    console.log(`  No lyrics:    ${totalSkippedNoLyrics}`);
    console.log(`  Errors:       ${totalErrors}`);
    console.log(`  Time:         ${elapsed}s`);
    const finalCount = await db.composition.count();
    console.log(`  DB count:     ${finalCount} total`);
    console.log();
  }

  return { pagesFound: pageUrls.length, pagesProcessed, itemsFound: totalItems, itemsNew: totalNew, itemsDuplicates: totalDuplicates, itemsErrored: totalErrors, itemsSkippedNoLyrics: totalSkippedNoLyrics, durationMs };
}

function slugToTranslit(slug: string): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    decoded = slug;
  }
  return decoded.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim() || 'Composition';
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── CLI Entry Point ─────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('--dryrun');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
  const slug = args.find((a) => a.startsWith('--slug='))?.split('=')[1];
  const resume = args.includes('--resume');

  await acquireAbhangvani({
    dryRun,
    limit: Number.isFinite(limit) ? limit : undefined,
    slug,
    resume,
  });
}

if (import.meta.main) {
  main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}
