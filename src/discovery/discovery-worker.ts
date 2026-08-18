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
import { runAcquisitionForSource } from './acquire-runner';
import { selectDueSources } from './due-sources';
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
    let resultSummary: string | null = null;

    // Create the job record
    const job = await db.discoveryJob.create({
      data: {
        sourceId,
        type: trigger === 'SCHEDULED' ? 'INCREMENTAL' : 'FULL_SYNC',
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
      // 1. Route to the matching acquisition implementation (wikisource /
      // archive / generic pipeline) and get REAL dedup counts.
      // Scheduled cycles crawl incrementally (skip pages whose wikitext didn't
      // change, per the importer's persisted revision state); manual runs do a
      // full re-crawl so the admin "run" button always sees the freshest data.
      const result = await runAcquisitionForSource(source, {
        incremental: trigger === 'SCHEDULED',
      });

      itemsFound = result.itemsFound;
      itemsNew = result.itemsNew;
      itemsDuplicates = result.itemsDuplicates;
      itemsErrored = result.itemsErrored;
      resultSummary = result.summary;

      if (result.status === 'FAILED') {
        throw new Error(result.error ?? 'Acquisition failed');
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
        resultSummary,
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
    const allSources = await SourceRegistry.getAll({ limit: 10000, status: 'ACTIVE' });

    // Per-source due selection: only sources whose scrapeInterval has elapsed
    // (or never fetched), ordered by quality score so high-quality sources
    // crawl first under the concurrency budget.
    const activeSources = selectDueSources(allSources as unknown as ContentSource[], new Date())
      .map((d) => d.source);

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
}

// ─── Helpers ──────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
