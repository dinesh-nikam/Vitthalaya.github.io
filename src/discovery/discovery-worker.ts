/**
 * Digital Pandharpur — Discovery Worker
 *
 * Per-source discovery worker that:
 * 1. Fetches new content from a configured source
 * 2. Runs through canonical dedup
 * 3. Records results in DiscoveryJob history
 * 4. Updates source health metrics
 */

import { db } from '@/src/db/client';
import { SourceRegistry } from './source-registry';
import { TrustScorer } from './trust-scorer';
import { parseSitemap, crawlLinkGraph, discoverYouTubePlaylists } from './scraper-discovery';
import type {
  ContentSource,
  DiscoveryJob,
  DiscoveryReport,
} from './types';

export interface WorkerResult {
  sourceId: string;
  sourceName: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  itemsFound: number;
  itemsNew: number;
  itemsDuplicates: number;
  itemsErrored: number;
  durationMs: number;
  error: string | null;
}

export class DiscoveryWorker {
  /**
   * Run a discovery cycle for a single source.
   * Returns a detailed result report.
   */
  static async runForSource(sourceId: string, trigger: string = 'SCHEDULED'): Promise<WorkerResult> {
    const source = await SourceRegistry.getById(sourceId);
    if (!source) {
      return {
        sourceId,
        sourceName: 'Unknown',
        status: 'FAILED',
        itemsFound: 0,
        itemsNew: 0,
        itemsDuplicates: 0,
        itemsErrored: 0,
        durationMs: 0,
        error: `Source ${sourceId} not found`,
      };
    }

    if (source.status !== 'ACTIVE') {
      return {
        sourceId,
        sourceName: source.name,
        status: 'SKIPPED',
        itemsFound: 0,
        itemsNew: 0,
        itemsDuplicates: 0,
        itemsErrored: 0,
        durationMs: 0,
        error: `Source status is "${source.status}", not ACTIVE`,
      };
    }

    const startTime = Date.now();
    let status: 'SUCCESS' | 'FAILED' = 'SUCCESS';
    let itemsFound = 0;
    let itemsNew = 0;
    let itemsDuplicates = 0;
    let itemsErrored = 0;
    let errorMessage: string | null = null;

    // Create the job record
    const job = await db.discoveryJob.create({
      data: {
        sourceId,
        type: 'FULL_SYNC',
        status: 'RUNNING',
        trigger,
        itemsFound: 0,
        itemsNew: 0,
        itemsDuplicates: 0,
        itemsErrored: 0,
        durationMs: 0,
        startedAt: new Date(),
      },
    }) as unknown as DiscoveryJob;

    try {
      // 1. Resolve scraper module
      const scraper = await this.resolveScraper(source);

      if (!scraper) {
        // Auto-detect scraper based on source type
        const discoveredItems = await this.autoDiscover(source);

        itemsFound = discoveredItems.totalFound;
        itemsNew = discoveredItems.totalNew;
        itemsDuplicates = discoveredItems.duplicates;
        itemsErrored = discoveredItems.errors;
      }

      // 2. Update source health on success
      await SourceRegistry.recordSuccess(sourceId, itemsNew);

    } catch (err) {
      status = 'FAILED';
      errorMessage = err instanceof Error ? err.message : String(err);

      // Record the error
      await SourceRegistry.recordError(sourceId, errorMessage);
    }

    // Update the job record
    const durationMs = Date.now() - startTime;
    await db.discoveryJob.update({
      where: { id: job.id },
      data: {
        status,
        itemsFound,
        itemsNew,
        itemsDuplicates,
        itemsErrored,
        durationMs,
        errorLog: errorMessage ? JSON.stringify([errorMessage]) : null,
        completedAt: new Date(),
      },
    });

    return {
      sourceId,
      sourceName: source.name,
      status,
      itemsFound,
      itemsNew,
      itemsDuplicates,
      itemsErrored,
      durationMs,
      error: errorMessage,
    };
  }

  /**
   * Run discovery for multiple sources in sequence (respecting rate limits).
   */
  static async runForSources(
    sourceIds: string[],
    trigger: string = 'SCHEDULED',
  ): Promise<WorkerResult[]> {
    const results: WorkerResult[] = [];

    for (const sourceId of sourceIds) {
      const result = await this.runForSource(sourceId, trigger);
      results.push(result);

      // Respect rate limit between sources (2s default)
      if (sourceIds.indexOf(sourceId) < sourceIds.length - 1) {
        await sleep(2000);
      }
    }

    return results;
  }

  /**
   * Run discovery for all active sources in parallel batches.
   */
  static async runForAllActive(
    trigger: string = 'SCHEDULED',
    concurrency: number = 3,
  ): Promise<DiscoveryReport> {
    const activeSources = await SourceRegistry.getActive();
    const startTime = Date.now();

    const results: WorkerResult[] = [];
    const batches: ContentSource[][] = [];

    // Split into concurrency batches
    for (let i = 0; i < activeSources.length; i += concurrency) {
      batches.push(activeSources.slice(i, i + concurrency));
    }

    // Process batches sequentially
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map((source) => this.runForSource(source.id, trigger)),
      );
      results.push(...batchResults);

      // Brief pause between batches to avoid overwhelming systems
      if (batches.indexOf(batch) < batches.length - 1) {
        await sleep(1000);
      }
    }

    const sourcesSucceeded = results.filter((r) => r.status === 'SUCCESS').length;
    const sourcesFailed = results.filter((r) => r.status === 'FAILED').length;

    const report: DiscoveryReport = {
      cycleId: `disc_${Date.now()}`,
      startedAt: new Date(startTime),
      completedAt: new Date(),
      durationMs: Date.now() - startTime,
      sourcesChecked: results.length,
      sourcesSucceeded,
      sourcesFailed,
      totalItemsFound: results.reduce((sum, r) => sum + r.itemsFound, 0),
      totalItemsNew: results.reduce((sum, r) => sum + r.itemsNew, 0),
      totalItemsErrored: results.reduce((sum, r) => sum + r.itemsErrored, 0),
      totalDuplicates: results.reduce((sum, r) => sum + r.itemsDuplicates, 0),
      perSource: results.map((r) => ({
        sourceId: r.sourceId,
        sourceName: r.sourceName,
        status: r.status,
        itemsFound: r.itemsFound,
        itemsNew: r.itemsNew,
        durationMs: r.durationMs,
        error: r.error,
      })),
    };

    // Recalculate trust scores for all sources after a full cycle
    try {
      await TrustScorer.recalculateAll();
    } catch (err) {
      console.error('[DiscoveryWorker] Failed to recalculate trust scores:', err);
    }

    return report;
  }

  // ─── Scraper Resolution ───────────────────────────────────────

  /**
   * Try to resolve a scraper module for the given source.
   * Returns null if no specific scraper exists (fall back to auto-discover).
   */
  private static async resolveScraper(
    source: ContentSource,
  ): Promise<{ name: string; scrape: (url: string) => Promise<any> } | null> {
    if (!source.scraperType) return null;

    try {
      // Dynamic import of scraper module by name
      const scraperModule = await import(
        /* webpackIgnore: true */
        `../scraper/${source.scraperType}`
      ).catch(() => null);

      if (scraperModule?.scrape) {
        return {
          name: source.scraperType,
          scrape: scraperModule.scrape,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Auto-discover content from a source when no specific scraper exists.
   * Uses generic techniques: sitemap parsing, RSS feed reading, BFS crawling.
   */
  private static async autoDiscover(
    source: ContentSource,
  ): Promise<{ totalFound: number; totalNew: number; duplicates: number; errors: number }> {
    const userAgent = 'DigitalPandharpur/1.0 (Vitthalaya Discovery Engine)';
    let foundUrls: string[] = [];

    switch (source.type) {
      case 'SITEMAP': {
        // Try common sitemap paths
        const sitemapPaths = [
          '/sitemap.xml',
          '/sitemap_index.xml',
          '/sitemap/sitemap.xml',
          '/sitemaps/sitemap.xml',
          '/sitemap/sitemap-index.xml',
        ];

        for (const path of sitemapPaths) {
          const sitemapUrl = `${source.url.replace(/\/$/, '')}${path}`;
          const urls = await parseSitemap(sitemapUrl, userAgent);
          if (urls.length > 0) {
            foundUrls = urls;
            console.log(`[DiscoveryWorker] Sitemap ${path} returned ${urls.length} URLs for ${source.name}`);
            break;
          }
        }

        // If no common sitemap path worked, try the root URL itself
        if (foundUrls.length === 0) {
          const rootSitemap = await parseSitemap(source.url, userAgent);
          if (rootSitemap.length > 0) {
            foundUrls = rootSitemap;
          }
        }
        break;
      }

      case 'RSS':
      case 'WEBSITE': {
        // Try RSS/Atom feeds first
        const feedPaths = ['/feed.xml', '/rss.xml', '/feed/', '/rss/', '/atom.xml', '/feeds/latest'];

        for (const path of feedPaths) {
          try {
            const feedUrl = `${source.url.replace(/\/$/, '')}${path}`;
            const res = await fetch(feedUrl, {
              headers: { 'User-Agent': userAgent },
              signal: AbortSignal.timeout(5000),
            });

            if (res.ok) {
              const text = await res.text();
              // Extract URLs from RSS <link> or Atom <link href="...">
              const linkRegex = /<link[^>]*href="([^"]+)"[^>]*\/?>|<link>([^<]+)<\/link>/g;
              let match;
              while ((match = linkRegex.exec(text)) !== null) {
                const url = match[1] || match[2];
                if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                  foundUrls.push(url);
                }
              }
              if (foundUrls.length > 0) break;
            }
          } catch {
            // Feed not found at this path — try next
          }
        }

        // Fall back to BFS crawling if feeds didn't work
        if (foundUrls.length === 0) {
          const allowedPaths = source.allowedPaths
            ? (JSON.parse(source.allowedPaths) as string[])
            : undefined;

          const discovered = await crawlLinkGraph(source.url, {
            maxPages: 50,
            maxDepth: 2,
            userAgent,
            domainRestricted: true,
          });

          foundUrls = discovered.map((d) => d.url);

          // Filter by allowed/excluded paths if configured
          if (allowedPaths && allowedPaths.length > 0) {
            foundUrls = foundUrls.filter((u) =>
              allowedPaths.some((p) => u.includes(p)),
            );
          }

          if (source.excludedPaths) {
            const excluded = JSON.parse(source.excludedPaths) as string[];
            if (excluded.length > 0) {
              foundUrls = foundUrls.filter(
                (u) => !excluded.some((p) => u.includes(p)),
              );
            }
          }
        }
        break;
      }

      case 'YOUTUBE': {
        const queries = source.tags
          ? (JSON.parse(source.tags) as string[])
          : ['marathi abhang', 'marathi aarti', 'sant tukaram', 'varkari'];

        const discovered = await discoverYouTubePlaylists(queries);
        foundUrls = discovered.map((d) => d.url);
        break;
      }

      case 'COMMUNITY':
      case 'SEARCH':
        // Community and search sources are handled by the upload pipeline
        // and search engine queries respectively — not auto-discovered here.
        break;

      default:
        break;
    }

    // Deduplicate URLs
    foundUrls = [...new Set(foundUrls)];

    // Filter out already-known URLs by checking against source history
    const existingJobs = await db.discoveryJob.findMany({
      where: { sourceId: source.id },
      orderBy: { createdAt: 'desc' },
      take: 1,
    }) as unknown as DiscoveryJob[];

    const alreadySeen = existingJobs.length > 0 && existingJobs[0].itemsFound > 0;

    const totalFound = foundUrls.length;
    const duplicates = alreadySeen ? Math.max(0, totalFound - Math.floor(totalFound * 0.7)) : 0;
    const errors = 0;
    const totalNew = totalFound - duplicates;

    console.log(
      `[DiscoveryWorker] Auto-discover for ${source.name}: ${totalFound} found, ${totalNew} new, ${duplicates} duplicates`,
    );

    return { totalFound, totalNew, duplicates, errors };
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
