/**
 * Digital Pandharpur — Scraper Health Monitor
 *
 * Observability system for all content sources:
 * - Collects health metrics per source
 * - Generates health reports
 * - Recommends actions (disable, review, ignore)
 * - Tracks error patterns for alerting
 */

import { db } from '@/src/db/client';
import { SourceRegistry } from './source-registry';
import { TrustScorer } from './trust-scorer';
import type {
  ContentSource,
  SourceHealth,
  SourceHealthMetrics,
  DiscoveryJob,
} from './types';

export interface HealthAlert {
  id: string;
  sourceId: string;
  sourceName: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  createdAt: Date;
}

export class ScraperMonitor {
  /**
   * Generate a full health report for a single source.
   */
  static async getSourceHealth(sourceId: string): Promise<SourceHealth> {
    const source = await SourceRegistry.getById(sourceId);
    if (!source) throw new Error(`Source ${sourceId} not found`);

    const trustResult = await TrustScorer.score(sourceId);
    const metrics = await this.computeMetrics(source);
    const recentErrors = await this.getRecentErrors(sourceId);
    const recommendation = this.generateRecommendation(source, metrics);

    return {
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type as any,
      status: source.status as any,
      trustScore: trustResult.score,
      trustTier: trustResult.tier,
      lastCheckAt: new Date(),
      metrics,
      recentErrors,
      recommendation,
    };
  }

  /**
   * Generate health reports for all active sources.
   */
  static async getAllActiveHealth(): Promise<SourceHealth[]> {
    const activeSources = await SourceRegistry.getActive();
    const results: SourceHealth[] = [];

    for (const source of activeSources) {
      try {
        const health = await this.getSourceHealth(source.id);
        results.push(health);
      } catch (err) {
        console.error(`[ScraperMonitor] Failed to check source ${source.id}:`, err);
      }
    }

    return results;
  }

  /**
   * Detect active alerts across all sources.
   */
  static async getActiveAlerts(): Promise<HealthAlert[]> {
    const allSources = await SourceRegistry.getAll({ limit: 10000 });
    const alerts: HealthAlert[] = [];
    const id = () => Math.random().toString(36).slice(2, 10);

    for (const source of allSources) {
      const metrics = await this.computeMetrics(source);

      // Check consecutive errors
      if (source.consecutiveErrors >= 3) {
        alerts.push({
          id: id(),
          sourceId: source.id,
          sourceName: source.name,
          severity: 'CRITICAL',
          message: `Auto-disabled after ${source.consecutiveErrors} consecutive errors`,
          metric: 'consecutiveErrors',
          value: source.consecutiveErrors,
          threshold: 3,
          createdAt: new Date(),
        });
      }

      // Check success rate
      if (metrics.successRate7d < 0.8) {
        alerts.push({
          id: id(),
          sourceId: source.id,
          sourceName: source.name,
          severity: 'WARNING',
          message: `Low success rate: ${(metrics.successRate7d * 100).toFixed(0)}%`,
          metric: 'successRate7d',
          value: metrics.successRate7d,
          threshold: 0.8,
          createdAt: new Date(),
        });
      }

      // Check dedup rate
      if (metrics.dedupRate > 0.9) {
        alerts.push({
          id: id(),
          sourceId: source.id,
          sourceName: source.name,
          severity: 'INFO',
          message: `High dedup rate (${(metrics.dedupRate * 100).toFixed(0)}%) — source may be exhausted`,
          metric: 'dedupRate',
          value: metrics.dedupRate,
          threshold: 0.9,
          createdAt: new Date(),
        });
      }

      // Check trust score
      if (source.trustScore < 0.4) {
        alerts.push({
          id: id(),
          sourceId: source.id,
          sourceName: source.name,
          severity: 'WARNING',
          message: `Low trust score: ${source.trustScore.toFixed(2)}`,
          metric: 'trustScore',
          value: source.trustScore,
          threshold: 0.4,
          createdAt: new Date(),
        });
      }
    }

    return alerts;
  }

  /**
   * Attempt to auto-recover a disabled source.
   * Returns true if recovery succeeded.
   */
  static async attemptAutoRecovery(sourceId: string): Promise<boolean> {
    const source = await SourceRegistry.getById(sourceId);
    if (!source) return false;
    if (source.status !== 'DISABLED') return true; // Already active

    try {
      // 1. Test basic connectivity
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(source.url, {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[ScraperMonitor] Recovery failed for ${source.name}: HTTP ${response.status}`);
        return false;
      }

      // 2. Re-enable the source
      await SourceRegistry.reenable(sourceId);
      console.log(`[ScraperMonitor] Successfully recovered source: ${source.name}`);
      return true;
    } catch (err) {
      console.warn(`[ScraperMonitor] Recovery failed for ${source.name}:`, err);
      return false;
    }
  }

  // ─── Private ──────────────────────────────────────────────────

  private static async computeMetrics(source: ContentSource): Promise<SourceHealthMetrics> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Fetch recent jobs
    const recentJobs = await db.discoveryJob.findMany({
      where: {
        sourceId: source.id,
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }) as unknown as DiscoveryJob[];

    const totalJobs = recentJobs.length;
    const succeededJobs = recentJobs.filter((j) => j.status === 'COMPLETED').length;
    const totalItems = recentJobs.reduce((sum, j) => sum + j.itemsFound, 0);
    const totalDuplicates = recentJobs.reduce((sum, j) => sum + j.itemsDuplicates, 0);

    const successRate7d = totalJobs > 0 ? succeededJobs / totalJobs : 1;
    const itemsPerRun = totalJobs > 0 ? totalItems / totalJobs : 0;
    const dedupRate = totalItems > 0 ? totalDuplicates / totalItems : 0;

    // Compute from trust scorer for consistency
    const trustResult = await TrustScorer.score(source.id);
    const moderationPassRate = trustResult.components.moderationPassRate;

    return {
      successRate7d,
      consecutiveErrors: source.consecutiveErrors,
      avgResponseTime: null,
      itemsPerRun,
      dedupRate,
      moderationPassRate,
    };
  }

  private static async getRecentErrors(
    sourceId: string,
  ): Promise<Array<{ at: Date; type: string; message: string }>> {
    try {
      const failedJobs = await db.discoveryJob.findMany({
        where: {
          sourceId,
          status: 'FAILED',
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }) as unknown as DiscoveryJob[];

      return failedJobs.map((j) => ({
        at: j.createdAt,
        type: j.type,
        message: j.errorLog ? j.errorLog.slice(0, 200) : 'Unknown error',
      }));
    } catch {
      return [];
    }
  }

  private static generateRecommendation(
    source: ContentSource,
    metrics: SourceHealthMetrics,
  ): string | null {
    if (source.status === 'BLOCKED') return 'Source is blocked. Manual admin review required.';
    if (source.consecutiveErrors >= 3) return 'Auto-disabled. Run auto-recovery or review manually.';
    if (source.consecutiveErrors >= 1) return `Source has had ${source.consecutiveErrors} error(s). Monitor closely.`;

    if (metrics.successRate7d < 0.6) return 'Low success rate. Consider pausing and investigating.';
    if (metrics.successRate7d < 0.8) return 'Moderate success rate. Review error logs.';

    if (metrics.dedupRate > 0.9) return 'Most items are duplicates. Source may be fully scraped.';
    if (metrics.itemsPerRun === 0) return 'No new items in recent runs. Verify source is still updating.';

    if (source.trustScore < 0.4) return 'Low trust score. New content should be manually reviewed before publishing.';

    return null; // All good
  }
}
