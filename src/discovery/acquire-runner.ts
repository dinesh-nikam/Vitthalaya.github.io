/**
 * Digital Pandharpur — Acquisition Runner
 *
 * Routes a ContentSource to the matching acquisition implementation and
 * returns REAL counts (found / new / duplicates / errored) that get written
 * into DiscoveryJob rows. Dedup is the pipeline's content-hash check — not an
 * estimate.
 *
 * Routes by `scraperType`:
 *   - 'wikisource' | 'wikisource-mr'  → scripts/acquire-wikisource
 *   - 'wikisource-bulk'               → scripts/acquire-wikisource-bulk
 *                                     (gatha + tail + haripath + dnyaneshwari)
 *   - 'internet-archive' | 'archive'  → scripts/acquire-internet-archive
 *   - anything else                   → generic AcquisitionPipeline
 */

import { SourceRegistry } from './source-registry';
import type { ContentSource } from './types';

export interface AcquireRunResult {
  status: 'SUCCESS' | 'FAILED';
  itemsFound: number;
  itemsNew: number;
  itemsDuplicates: number;
  itemsErrored: number;
  error: string | null;
  /** Human-readable summary for the DiscoveryJob.resultSummary. */
  summary: string;
}

function normalizeScraperType(source: ContentSource): string {
  return (source.scraperType ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '');
}

/**
 * Run acquisition for one source. `limit` caps the work so scheduled cycles
 * stay bounded; `dryRun` skips DB writes (used by the manual "test" button).
 */
export async function runAcquisitionForSource(
  source: ContentSource,
  opts: { limit?: number; dryRun?: boolean; incremental?: boolean } = {}
): Promise<AcquireRunResult> {
  const scraper = normalizeScraperType(source);
  const dryRun = opts.dryRun ?? false;
  const incremental = opts.incremental ?? false;

  try {
    // wikisource-bulk must be checked before plain 'wikisource' (it contains it).
    if (scraper.includes('wikisource-bulk')) {
      const { acquireWikisourceBulk } = await import('../../scripts/acquire-wikisource-bulk');
      const result = await acquireWikisourceBulk({
        dryRun,
        maxPages: opts.limit,
        maxCompositions: opts.limit ?? undefined,
        quiet: true,
        incremental,
      });
      return {
        status: result.itemsErrored > 0 && result.itemsNew === 0 ? 'FAILED' : 'SUCCESS',
        itemsFound: result.pagesProcessed,
        itemsNew: result.itemsNew,
        itemsDuplicates: result.itemsDuplicates,
        itemsErrored: result.itemsErrored,
        error: null,
        summary: `Wikisource bulk: ${result.pagesProcessed} pages processed${result.pagesSkipped > 0 ? `, ${result.pagesSkipped} unchanged skipped` : ''}, ${result.abhangsSplit} segments, ${result.itemsNew} new, ${result.itemsDuplicates} duplicates`,
      };
    }

    if (scraper.includes('wikisource')) {
      const { acquireWikisource, TARGET_CATEGORIES } = await import('../../scripts/acquire-wikisource');
      // Only pass categories that are real Wikisource category names — the
      // registry tags are generic keywords and would zero out discovery.
      // `tags` is a JSON string in Postgres (registry writes JSON.stringify).
      const sourceTags: string[] = (() => {
        const raw = source.tags as unknown;
        if (Array.isArray(raw)) return raw.map(String);
        if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.map(String) : [];
          } catch {
            return [];
          }
        }
        return [];
      })();
      const categories = TARGET_CATEGORIES.filter((c: string) =>
        sourceTags.some((t) => c.includes(t) || t.includes(c))
      );
      const result = await acquireWikisource({
        dryRun,
        maxPages: opts.limit,
        categories: categories.length > 0 ? categories : undefined,
        quiet: true,
      });
      return {
        status: result.itemsErrored > 0 && result.itemsNew === 0 ? 'FAILED' : 'SUCCESS',
        itemsFound: result.itemsFound,
        itemsNew: dryRun ? result.itemsNew : result.itemsNew,
        itemsDuplicates: result.itemsDuplicates,
        itemsErrored: result.itemsErrored,
        error: null,
        summary: `Wikisource: ${result.pagesSucceeded} pages OK, ${result.pagesFailed} failed, ${result.itemsNew} new, ${result.itemsDuplicates} duplicates`,
      };
    }

    if (scraper.includes('santsahitya')) {
      const { acquireSantSahitya } = await import('../../scripts/acquire-santsahitya');
      const result = await acquireSantSahitya({
        dryRun,
        limit: opts.limit,
        quiet: true,
      });
      return {
        status: result.itemsErrored > 0 && result.itemsNew === 0 ? 'FAILED' : 'SUCCESS',
        itemsFound: result.itemsFound,
        itemsNew: result.itemsNew,
        itemsDuplicates: result.itemsDuplicates,
        itemsErrored: result.itemsErrored,
        error: null,
        summary: `SantSahitya: ${result.categoriesProcessed} categories, ${result.itemsNew} new, ${result.itemsDuplicates} duplicates, ${result.itemsSkippedNoLyrics} no-lyrics`,
      };
    }

    if (scraper.includes('abhangvani')) {
      const { acquireAbhangvani } = await import('../../scripts/acquire-abhangvani');
      const result = await acquireAbhangvani({
        dryRun,
        limit: opts.limit,
        quiet: true,
      });
      return {
        status: result.itemsErrored > 0 && result.itemsNew === 0 ? 'FAILED' : 'SUCCESS',
        itemsFound: result.pagesFound,
        itemsNew: result.itemsNew,
        itemsDuplicates: result.itemsDuplicates,
        itemsErrored: result.itemsErrored,
        error: null,
        summary: `Abhangvani: ${result.pagesProcessed} pages, ${result.itemsNew} new, ${result.itemsDuplicates} duplicates, ${result.itemsSkippedNoLyrics} no-lyrics`,
      };
    }

    if (scraper.includes('bhajangeet')) {
      const { acquireBhajanGeet } = await import('../../scripts/acquire-bhajangeet');
      const result = await acquireBhajanGeet({
        dryRun,
        limit: opts.limit,
        quiet: true,
      });
      return {
        status: result.itemsErrored > 0 && result.itemsNew === 0 ? 'FAILED' : 'SUCCESS',
        itemsFound: result.itemsFound,
        itemsNew: result.itemsNew,
        itemsDuplicates: result.itemsDuplicates,
        itemsErrored: result.itemsErrored,
        error: null,
        summary: `BhajanGeet: ${result.pagesProcessed} feed pages, ${result.itemsNew} new, ${result.itemsDuplicates} duplicates, ${result.itemsSkippedNoLyrics} no-lyrics`,
      };
    }

    if (scraper.includes('archive')) {
      const { acquireInternetArchive } = await import('../../scripts/acquire-internet-archive');
      const result = await acquireInternetArchive({
        dryRun,
        maxCompositions: opts.limit,
        quiet: true,
      });
      return {
        status: result.itemsErrored > 0 && result.itemsNew === 0 ? 'FAILED' : 'SUCCESS',
        itemsFound: result.itemsFound,
        itemsNew: result.itemsNew,
        itemsDuplicates: result.itemsDuplicates,
        itemsErrored: result.itemsErrored,
        error: null,
        summary: `Internet Archive: ${result.targetsProcessed} targets, ${result.itemsNew} new, ${result.itemsDuplicates} duplicates`,
      };
    }

    // Generic path: run the shared crawl pipeline.
    const { AcquisitionPipeline } = await import('../crawl4ai/pipeline');
    const { FetchCrawlerEngine } = await import('../crawl4ai/fetch-engine');
    const { ContentExtractor } = await import('../crawl4ai/content-extractor');
    const { ContentSegmenter } = await import('../crawl4ai/content-segmenter');
    const { MetadataExtractor } = await import('../crawl4ai/metadata-extractor');
    const { QualityScorer } = await import('../crawl4ai/quality-scorer');

    const pipeline = new AcquisitionPipeline(
      new FetchCrawlerEngine({ minDelayMs: 1500, maxDelayMs: 3000 }),
      new ContentExtractor(),
      new ContentSegmenter(),
      new MetadataExtractor(),
      new QualityScorer(),
      { dryRun, maxCompositionsPerSource: opts.limit ?? 500, autoApproveThreshold: 0.7, enableEnrichment: false },
    );

    const result = await pipeline.runForSource(source);

    return {
      status: result.status === 'success' ? 'SUCCESS' : 'FAILED',
      itemsFound: result.urlsCrawled,
      itemsNew: dryRun ? result.compositionsExtracted : result.compositionsExtracted,
      itemsDuplicates: result.duplicatesFound,
      itemsErrored: result.errors.length,
      error: result.errors.length > 0 ? result.errors.join('; ') : null,
      summary: `Pipeline: ${result.urlsCrawled} URLs, ${result.compositionsExtracted} new, ${result.duplicatesFound} duplicates`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await SourceRegistry.recordError(source.id, message);
    return {
      status: 'FAILED',
      itemsFound: 0,
      itemsNew: 0,
      itemsDuplicates: 0,
      itemsErrored: 1,
      error: message,
      summary: `Failed: ${message}`,
    };
  }
}
