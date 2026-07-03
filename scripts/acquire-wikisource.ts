/**
 * Vitthalaya — Wikisource Bulk Acquisition
 *
 * Discovers and crawls Marathi Wikisource pages across key categories:
 *   - आरती (aartis)
 *   - तुकाराम गाथा (Tukaram Gatha)
 *   - हरिपाठ (Haripath)
 *   - Additional saint literature
 *
 * Uses Wikisource API to discover pages, then runs each page through
 * the FetchCrawlerEngine → pipeline (extract → segment → quality → persist).
 *
 * Usage: bun run scripts/acquire-wikisource.ts
 *        bun run scripts/acquire-wikisource.ts --dry-run
 *        bun run scripts/acquire-wikisource.ts --limit=10
 */

import { db } from '../src/db/client';
import { FetchCrawlerEngine } from '../src/crawl4ai/fetch-engine';
import { ContentExtractor } from '../src/crawl4ai/content-extractor';
import { ContentSegmenter } from '../src/crawl4ai/content-segmenter';
import { MetadataExtractor } from '../src/crawl4ai/metadata-extractor';
import { QualityScorer } from '../src/crawl4ai/quality-scorer';
import { AcquisitionPipeline } from '../src/crawl4ai/pipeline';

// ─── Wikisource API Constants ─────────────────────────────────

const WIKISOURCE_API = 'https://mr.wikisource.org/w/api.php';
const USER_AGENT = 'Vitthalaya/1.0 (content acquisition; contact@vitthalaya)';

// Wikisource categories to acquire from
const TARGET_CATEGORIES = [
  'आरती',
  'तुकाराम_गाथा',
  'हरिपाठ',
  'एकनाथ_हरिपाठ',
  'तुकाराम_हरिपाठ',
  'नामदेव_हरिपाठ',
  'ज्ञानेश्वरी',
  'भजन',
  'स्तोत्र',
  'अभंग',
] as const;

// ─── Wikisource API Helpers ────────────────────────────────────

interface WsPageInfo {
  title: string;
  pageId: number;
}

/**
 * Fetch all page titles in a Wikisource category via the API.
 * Handles pagination via cmcontinue.
 */
/**
 * Fetch with rate-limit aware retry logic.
 * Wikisource API returns 429 when too many requests are made.
 */
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15_000),
    });

    if (response.status === 429) {
      const wait = Math.pow(2, attempt + 1) * 2000; // 4s, 8s, 16s
      console.log(`  ⏳ Rate limited (429), waiting ${wait / 1000}s before retry ${attempt + 1}/${retries}...`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }

    return response;
  }

  // Final attempt without signal for maximum patience
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });
  return response;
}

async function getCategoryPages(category: string): Promise<WsPageInfo[]> {
  const pages: WsPageInfo[] = [];
  let cmContinue: string | undefined;

  do {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      list: 'categorymembers',
      cmtitle: `Category:${category}`,
      cmlimit: '500',
      cmtype: 'page',
      ...(cmContinue ? { cmcontinue: cmContinue } : {}),
    });

    const url = `${WIKISOURCE_API}?${params}`;
    console.log(`  API: category=${category} offset=${pages.length}`);

    const response = await fetchWithRetry(url);

    if (!response.ok) {
      console.error(`  ⚠️  API error ${response.status} for category ${category}`);
      break;
    }

    const data = await response.json() as any;
    const members = data?.query?.categorymembers ?? [];

    for (const member of members) {
      if (member.ns === 0) {
        // ns=0 means main content pages
        pages.push({ title: member.title, pageId: member.pageid });
      }
    }

    cmContinue = data?.continue?.cmcontinue;

    // Be nice to Wikisource API between pagination requests
    await new Promise((r) => setTimeout(r, 500));
  } while (cmContinue);

  return pages;
}

/**
 * Build the full Wikisource URL from a page title.
 */
function wsUrl(title: string): string {
  return `https://mr.wikisource.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

// ─── Main ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('--dryrun');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const maxPages = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

  console.log(`${'═'.repeat(60)}`);
  console.log(`  Vitthalaya — Wikisource Bulk Acquisition`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Dry run: ${dryRun ? 'YES' : 'NO'}`);
  if (maxPages < Infinity) console.log(`  Page limit: ${maxPages}`);
  console.log();

  // ─── Phase 1: Discover pages from Wikisource API ──────────
  console.log(`📡 Phase 1: Discovering pages from ${TARGET_CATEGORIES.length} categories...`);

  const allDiscovered: WsPageInfo[] = [];

  for (const category of TARGET_CATEGORIES) {
    try {
      const pages = await getCategoryPages(category);
      console.log(`  📂 ${category}: ${pages.length} pages found`);
      allDiscovered.push(...pages);
    } catch (err) {
      console.error(`  ❌ Failed to query category ${category}:`, err);
    }
    // Be nice to Wikisource API between categories
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Deduplicate by pageId
  const seen = new Set<number>();
  const uniquePages = allDiscovered.filter((p) => {
    if (seen.has(p.pageId)) return false;
    seen.add(p.pageId);
    return true;
  });

  console.log(`\n  📊 Total unique pages discovered: ${uniquePages.length}`);
  console.log();

  // ─── Phase 2: Note on deduplication ──────────────────────
  console.log('🔍 Phase 2: Deduplication handled by pipeline (content hash)');
  console.log(`  📄 Pages to crawl: ${uniquePages.length}`);

  // Apply limit
  const pagesToCrawl = maxPages < Infinity ? uniquePages.slice(0, maxPages) : uniquePages;

  console.log(`  📄 Will crawl: ${pagesToCrawl.length} pages\n`);

  if (dryRun) {
    console.log('─'.repeat(50));
    console.log('  DRY RUN — Would crawl these pages:');
    for (const page of pagesToCrawl) {
      console.log(`  📄 ${page.title}`);
      console.log(`     ${wsUrl(page.title)}`);
    }
    console.log(`\n  Total: ${pagesToCrawl.length} pages\n`);
    return;
  }

  // ─── Phase 3: Initialize pipeline ─────────────────────────
  console.log('⚙️  Phase 3: Initializing acquisition pipeline...');

  const engine = new FetchCrawlerEngine({
    minDelayMs: 1500,
    maxDelayMs: 3000,
  });
  const extractor = new ContentExtractor();
  const segmenter = new ContentSegmenter();
  const metadataExtractor = new MetadataExtractor();
  const qualityScorer = new QualityScorer();
  const pipeline = new AcquisitionPipeline(
    engine,
    extractor,
    segmenter,
    metadataExtractor,
    qualityScorer,
    { dryRun: false, maxCompositionsPerSource: 500, autoApproveThreshold: 0.70, enableEnrichment: false },
  );

  // ─── Phase 4: Crawl each page through the pipeline ─────────
  console.log('🕸️  Phase 4: Crawling pages...\n');

  let totalCompositions = 0;
  let totalDuplicates = 0;
  let pagesSucceeded = 0;
  let pagesFailed = 0;
  const startTime = Date.now();

  for (let i = 0; i < pagesToCrawl.length; i++) {
    const page = pagesToCrawl[i];
    const pageUrl = wsUrl(page.title);
    const progress = `[${i + 1}/${pagesToCrawl.length}]`;

    console.log(`${progress} 📄 ${page.title}`);

    try {
      // Create a minimal source object for the pipeline
      const source = {
        id: `wikisource-${page.pageId}`,
        name: `Wikisource — ${page.title}`,
        type: 'WEBSITE' as const,
        url: pageUrl,
        baseDomain: 'mr.wikisource.org',
        scraperType: 'semantic',
        scrapeInterval: 336,
        rateLimitMs: 1500,
        license: 'CC-BY-SA 4.0',
        requiresAttribution: true,
        attributionTemplate: `Source: mr.wikisource.org — CC-BY-SA 4.0`,
        tags: ['wikisource', 'marathi'],
        language: 'mr',
        region: 'Maharashtra',
        isAutoDiscovered: false,
        status: 'ACTIVE' as const,
        trustScore: 0.95,
        lastCrawledAt: null,
        errorCount: 0,
        consecutiveErrors: 0,
        disabledAt: null,
        sourceMetadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await pipeline.runForSource(source as any);

      if (result.status === 'success') {
        pagesSucceeded++;
        totalCompositions += result.compositionsExtracted;
        totalDuplicates += result.duplicatesFound;
        console.log(`  ✅ ${result.compositionsExtracted} compositions extracted`);
        if (result.duplicatesFound > 0) {
          console.log(`  🔄 ${result.duplicatesFound} duplicates skipped`);
        }
      } else {
        pagesFailed++;
        console.log(`  ❌ Failed: ${result.errors.join(', ')}`);
      }
    } catch (err) {
      pagesFailed++;
      console.error(`  ❌ Error: ${err}`);
    }

    console.log(); // blank line between pages
  }

  // ─── Report ─────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`${'═'.repeat(60)}`);
  console.log(`  ACQUISITION COMPLETE`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Pages:    ${pagesSucceeded} OK, ${pagesFailed} failed`);
  console.log(`  Content:  ${totalCompositions} new compositions`);
  console.log(`            ${totalDuplicates} duplicates skipped`);
  console.log(`  Time:     ${elapsed}s`);
  console.log(`  DB count: ${await db.composition.count()} total`);
  console.log();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
