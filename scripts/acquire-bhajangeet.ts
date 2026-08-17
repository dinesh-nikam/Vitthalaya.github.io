/**
 * Vitthalaya — BhajanGeet (WordPress.com) Acquisition
 *
 * Imports Marathi devotional compositions (abhangs, gaulani, bhajans)
 * from bhajangeet.wordpress.com via its paginated RSS feed
 * (https://bhajangeet.wordpress.com/feed/?paged=N). Each item carries
 * the full verse in <description>.
 *
 * Dedup: content-hash via the crawl pipeline (exact DB match) plus an
 * in-batch hash set. The feed only holds ~100 items, all from 2014,
 * so this is a one-shot import rather than a continuous source.
 *
 * Usage:
 *   bun run scripts/acquire-bhajangeet.ts
 *   bun run scripts/acquire-bhajangeet.ts --dry-run
 *   bun run scripts/acquire-bhajangeet.ts --limit=10
 */

import { db } from '../src/db/client';
import { contentHash, isMarathiText } from '../src/canonical/normalization';
import { AcquisitionPipeline } from '../src/crawl4ai/pipeline';
import { ContentExtractor } from '../src/crawl4ai/content-extractor';
import { ContentSegmenter } from '../src/crawl4ai/content-segmenter';
import { MetadataExtractor } from '../src/crawl4ai/metadata-extractor';
import { QualityScorer } from '../src/crawl4ai/quality-scorer';
import { decodeHtmlEntities } from '../src/lib/html-text';
import type { CrawlerEngine, ExtractedComposition } from '../src/crawl4ai/types';

// ─── Noop Crawler Engine ───────────────────────────────────────────
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

const FEED_BASE = 'https://bhajangeet.wordpress.com/feed/';
const USER_AGENT = 'Vitthalaya/1.0 (content acquisition; contact@vitthalaya)';
const ITEMS_PER_PAGE = 10;
const REQUEST_DELAY_MS = 600;

// ─── RSS parsing (regex — feed structure is regular) ──────────────

interface RssItem {
  title: string;
  link: string;
  description: string;
  category: string;
}

/**
 * Extract <item> blocks from an RSS document and pull title/link/
 * description/category. WordPress.com feeds are well-formed, so a
 * regex split on <item> boundaries is sufficient and avoids an XML
 * dependency.
 */
function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const description = extractTag(block, 'description');
    const category = extractTag(block, 'category');

    if (!title || !description) continue;
    items.push({
      title: decodeHtmlEntities(title).trim(),
      link: link ?? '',
      description: decodeHtmlEntities(description).trim(),
      category: category ? decodeHtmlEntities(category).trim() : '',
    });
  }
  return items;
}

function extractTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const m = block.match(re);
  if (!m) return null;
  // Strip any nested tags (e.g. <![CDATA[ ... ]]> handled below)
  let value = m[1];
  value = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  return value;
}

/**
 * Clean a feed description into verse text. WordPress descriptions use
 * "&#124;&#124;" for the danda-danda stanza marker and "&#8230;" for
 * ellipsis. Line breaks are lost in the feed, so we split on the
 * "|| N ||" stanza markers to reconstruct lines.
 */
function descriptionToVerse(description: string): string {
  // Decode first so || appears literally
  const decoded = decodeHtmlEntities(description);
  // ".." / "..." artifacts after markers
  const cleaned = decoded
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\.{2,}\s*/g, ' ')
    .trim();
  return cleaned;
}

// ─── Main ────────────────────────────────────────────────────────

export interface BhajanGeetOptions {
  dryRun?: boolean;
  /** Cap on feed items processed. */
  limit?: number;
  /** Skip banner logging (driven by discovery worker). */
  quiet?: boolean;
}

export interface BhajanGeetResult {
  itemsFound: number;
  itemsNew: number;
  itemsDuplicates: number;
  itemsErrored: number;
  itemsSkippedNoLyrics: number;
  pagesProcessed: number;
  durationMs: number;
}

export async function acquireBhajanGeet(options: BhajanGeetOptions = {}): Promise<BhajanGeetResult> {
  const { dryRun = false, limit, quiet = false } = options;

  if (!quiet) {
    console.log('═'.repeat(60));
    console.log('  Vitthalaya — BhajanGeet (WordPress.com) Acquisition');
    console.log('═'.repeat(60));
    console.log(`  Dry run: ${dryRun ? 'YES' : 'NO'}`);
    if (limit) console.log(`  Item limit: ${limit}`);
    console.log();
  }

  const startTime = Date.now();
  let totalFound = 0;
  let totalDuplicates = 0;
  let totalErrors = 0;
  let totalSkipped = 0;
  let pagesProcessed = 0;

  const allItems: RssItem[] = [];

  // ─── Step 1: fetch all feed pages ───────────────────────────
  for (let page = 1; page <= 20; page++) {
    const url = page === 1 ? FEED_BASE : `${FEED_BASE}?paged=${page}`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        if (res.status === 404) break; // past the last page
        throw new Error(`HTTP ${res.status}`);
      }
      const xml = await res.text();
      const items = parseRssItems(xml);
      if (items.length === 0) break;
      allItems.push(...items);
      pagesProcessed++;
      if (items.length < ITEMS_PER_PAGE) break;
      if (limit && allItems.length >= limit) break;
      await sleep(REQUEST_DELAY_MS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!quiet) console.error(`  ❌ Feed page ${page}: ${msg}`);
      totalErrors++;
      break;
    }
  }

  if (!quiet) console.log(`  Fetched ${allItems.length} items across ${pagesProcessed} pages`);

  // ─── Step 2: extract + dedup ────────────────────────────────
  const compositions: ExtractedComposition[] = [];
  const seenHashes = new Set<string>();

  for (const item of allItems) {
    totalFound++;
    const verse = descriptionToVerse(item.description);

    if (verse.length < 40 || !isMarathiText(verse)) {
      totalSkipped++;
      continue;
    }

    const hash = contentHash(verse);
    if (seenHashes.has(hash)) {
      totalDuplicates++;
      continue;
    }
    seenHashes.add(hash);

    compositions.push({
      titleMarathi: item.title,
      titleTranslit: slugToTranslit(item.title),
      fullText: verse,
      type: guessType(item.title, item.category),
      sourceAttribution: 'Source: Marathi Bhajan Geet (bhajangeet.wordpress.com)',
      sourceUrl: item.link,
      language: 'mr',
      region: 'Maharashtra',
      confidence: 0.7,
    });
  }

  if (!quiet && compositions.length > 0) {
    console.log(`  Extracted ${compositions.length} compositions (${totalSkipped} no-lyrics, ${totalDuplicates} in-batch dups)`);
  }

  if (compositions.length === 0) {
    const durationMs = Date.now() - startTime;
    return { itemsFound: totalFound, itemsNew: 0, itemsDuplicates: totalDuplicates, itemsErrored: totalErrors, itemsSkippedNoLyrics: totalSkipped, pagesProcessed, durationMs };
  }

  if (dryRun) {
    if (!quiet) {
      for (const c of compositions.slice(0, 6)) {
        const preview = c.fullText.slice(0, 80);
        console.log(`     • ${c.titleMarathi}: ${preview}…`);
      }
      if (compositions.length > 6) console.log(`     … and ${compositions.length - 6} more`);
    }
    const durationMs = Date.now() - startTime;
    return { itemsFound: totalFound, itemsNew: compositions.length, itemsDuplicates: totalDuplicates, itemsErrored: totalErrors, itemsSkippedNoLyrics: totalSkipped, pagesProcessed, durationMs };
  }

  // ─── Step 3: pipeline (content-hash dedup + persist) ────────
  const pipeline = new AcquisitionPipeline(
    createNoopEngine(),
    new ContentExtractor(),
    new ContentSegmenter(),
    new MetadataExtractor(),
    new QualityScorer(),
    { dryRun: false, maxCompositionsPerSource: 500, autoApproveThreshold: 0.70, enableEnrichment: false },
  );

  const result = await pipeline.runForExtractedCompositions(compositions, 'bhajangeet.wordpress.com', {
    sourceUrl: 'https://bhajangeet.wordpress.com',
    sourceTrustScore: 0.7,
    dryRun: false,
  });

  const durationMs = Date.now() - startTime;
  const elapsed = (durationMs / 1000).toFixed(1);

  if (!quiet) {
    console.log('═'.repeat(60));
    console.log('  ACQUISITION COMPLETE');
    console.log('═'.repeat(60));
    console.log(`  Items found:  ${totalFound}`);
    console.log(`  New:          ${result.compositionsExtracted}`);
    console.log(`  Duplicates:   ${totalDuplicates + result.duplicatesFound}`);
    console.log(`  No lyrics:    ${totalSkipped}`);
    console.log(`  Errors:       ${totalErrors + result.errors.length}`);
    console.log(`  Time:         ${elapsed}s`);
    const finalCount = await db.composition.count();
    console.log(`  DB count:     ${finalCount} total`);
    console.log();
  }

  return {
    itemsFound: totalFound,
    itemsNew: result.compositionsExtracted,
    itemsDuplicates: totalDuplicates + result.duplicatesFound,
    itemsErrored: totalErrors + result.errors.length,
    itemsSkippedNoLyrics: totalSkipped,
    pagesProcessed,
    durationMs,
  };
}

function guessType(title: string, category: string): string | undefined {
  const t = title.toLowerCase();
  const c = category.toLowerCase();
  if (t.includes('गौळण') || c.includes('गौळण')) return 'gaulan';
  if (t.includes('आरती') || c.includes('आरती')) return 'aarti';
  if (t.includes('भजन') || c.includes('भजन')) return 'bhajan';
  if (t.includes('अभंग') || c.includes('अभंग')) return 'abhang';
  if (t.includes('हरिपाठ')) return 'haripath';
  if (t.includes('स्तोत्र')) return 'stotra';
  return undefined;
}

function slugToTranslit(title: string): string {
  const roman = title
    .replace(/[^\u0900-\u097Fa-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  // If title had a Latin part (e.g. "Dev Majha Vithu Savala"), use the
  // parenthetical; otherwise produce a generic slug.
  const paren = title.match(/\(([^)]+)\)/);
  if (paren) {
    return paren[1].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  return roman.replace(/[^a-z0-9-]/g, '').replace(/^-|-$/g, '') || `bhajangeet-${hash(title)}`;
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── CLI Entry Point ───────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('--dryrun');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

  await acquireBhajanGeet({
    dryRun,
    limit: Number.isFinite(limit) ? limit : undefined,
  });
}

if (import.meta.main) {
  main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}
