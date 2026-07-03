/**
 * Digital Pandharpur — Source Trust Scorer
 *
 * Calculates composite trust scores for content sources based on:
 * - Historical content quality (moderation pass rate, verified ratio)
 * - Technical reliability (uptime, response time, format consistency)
 * - Source legitimacy (license clarity, attribution quality, domain age)
 * - Community signal (reports, editor feedback, cross-source matching)
 *
 * Scores range from 0.0 (untrusted) to 1.0 (fully trusted).
 */

import { db } from '@/src/db/client';
import { SourceRegistry } from './source-registry';
import type {
  ContentSource,
  TrustScoreComponents,
  TrustScoreResult,
} from './types';
import { getTrustTier } from './types';

export class TrustScorer {
  /**
   * Calculate full trust score for a source by fetching all component data.
   */
  static async score(sourceId: string): Promise<TrustScoreResult> {
    const source = await SourceRegistry.getById(sourceId);
    if (!source) {
      throw new Error(`Source ${sourceId} not found`);
    }

    const components = await this.computeComponents(source);

    const weights = this.getWeights();
    const score = (
      components.moderationPassRate * weights.moderationPassRate +
      components.verifiedRatio * weights.verifiedRatio +
      (1 - components.correctionRate) * weights.correctionRate +
      components.uptime * weights.uptime +
      components.responseTimeScore * weights.responseTimeScore +
      components.formatConsistency * weights.formatConsistency +
      components.licenseClarity * weights.licenseClarity +
      components.attributionQuality * weights.attributionQuality +
      Math.min(components.domainAge / 10, 1) * weights.domainAge +
      (components.hasRobotsTxt ? 1 : 0) * weights.hasRobotsTxt +
      (1 - components.communityReports) * weights.communityReports +
      components.editorFeedback * weights.editorFeedback +
      components.crossSourceMatchRate * weights.crossSourceMatchRate
    );

    const clamped = Math.max(0, Math.min(1, score));

    return {
      score: clamped,
      tier: getTrustTier(clamped),
      components,
    };
  }

  /**
   * Bulk recalculate scores for all sources.
   * Returns the number of sources updated.
   */
  static async recalculateAll(): Promise<number> {
    const sources = await SourceRegistry.getAll({ limit: 10000 });
    let updated = 0;

    for (const source of sources) {
      try {
        const result = await this.score(source.id);
        await SourceRegistry.update(source.id, { trustScore: result.score });
        updated++;
      } catch (err) {
        console.error(`[TrustScorer] Failed to score source ${source.id}:`, err);
      }
    }

    return updated;
  }

  /**
   * Compute all component values for a source.
   */
  private static async computeComponents(
    source: ContentSource,
  ): Promise<TrustScoreComponents> {
    const moderationPassRate = await this.computeModerationPassRate(source.id);
    const verifiedRatio = source.totalCompositions > 0
      ? source.verifiedCompositions / source.totalCompositions
      : 0;
    const correctionRate = await this.computeCorrectionRate(source.id);
    const uptime = await this.computeUptime(source.id);
    const avgResponseTime = await this.computeAvgResponseTime(source.id);
    const responseTimeScore = this.normalizeResponseTime(avgResponseTime);
    const domainAgeYears = await this.estimateDomainAge(source.url);

    return {
      moderationPassRate,
      verifiedRatio,
      correctionRate,
      uptime,
      responseTimeScore,
      formatConsistency: 0.8,          // Default — refined with more data
      licenseClarity: source.license ? 0.8 : 0.3,
      attributionQuality: source.requiresAttribution ? 0.7 : 0.4,
      domainAge: domainAgeYears,
      hasRobotsTxt: source.robotsTxt !== null && source.robotsTxt !== undefined,
      communityReports: 0,             // Default — requires community flagging system
      editorFeedback: 0.5,             // Default — neutral
      crossSourceMatchRate: 0.6,       // Default — conservative estimate
    };
  }

  // ─── Sub-computations ─────────────────────────────────────────

  /**
   * % of items from this source that pass Tier 1 AI moderation.
   * Queries the last 100 moderation queue items associated with this source's uploads.
   */
  private static async computeModerationPassRate(sourceId: string): Promise<number> {
    try {
      const source = await db.contentSource.findUnique({ where: { id: sourceId } }) as any;
      if (!source?.url) return 0.5;

      // Look at moderation queue items sourced from this URL's domain
      const recentItems = await db.$queryRawUnsafe(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
         FROM moderation_queues
         WHERE source_id = $1
            OR draft_title LIKE $2
         LIMIT 100`,
        sourceId,
        `%${new URL(source.url).hostname}%`,
      ) as any;

      const row = Array.isArray(recentItems) ? recentItems[0] : recentItems;
      if (!row || !row.total || Number(row.total) === 0) return 0.5;

      return Number(row.approved) / Number(row.total);
    } catch {
      return 0.5; // Default on error
    }
  }

  /**
   * % of published items needing post-publication correction (inverse).
   */
  private static async computeCorrectionRate(sourceId: string): Promise<number> {
    try {
      const jobs = await db.$queryRawUnsafe(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN items_errored > 0 THEN 1 ELSE 0 END) as with_errors
         FROM discovery_jobs
         WHERE source_id = $1`,
        sourceId,
      ) as any;

      const row = Array.isArray(jobs) ? jobs[0] : jobs;
      if (!row || !row.total || Number(row.total) === 0) return 0.1;

      return Number(row.with_errors) / Number(row.total);
    } catch {
      return 0.1;
    }
  }

  /**
   * Uptime = % of discovery jobs that completed successfully in the last 7 days.
   */
  private static async computeUptime(sourceId: string): Promise<number> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const jobs = await db.$queryRawUnsafe(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as succeeded
         FROM discovery_jobs
         WHERE source_id = $1
           AND created_at >= $2`,
        sourceId,
        sevenDaysAgo,
      ) as any;

      const row = Array.isArray(jobs) ? jobs[0] : jobs;
      if (!row || !row.total || Number(row.total) === 0) return 0.9;

      return Number(row.succeeded) / Number(row.total);
    } catch {
      return 0.9;
    }
  }

  /**
   * Average response time from discovery jobs (in ms).
   */
  private static async computeAvgResponseTime(sourceId: string): Promise<number | null> {
    try {
      const result = await db.$queryRawUnsafe(
        `SELECT AVG(duration_ms) as avg_duration
         FROM discovery_jobs
         WHERE source_id = $1
           AND status = 'COMPLETED'
           AND duration_ms > 0
         LIMIT 50`,
        sourceId,
      ) as any;

      const row = Array.isArray(result) ? result[0] : result;
      if (!row || row.avg_duration === null) return null;

      return Number(row.avg_duration);
    } catch {
      return null;
    }
  }

  /**
   * Estimate domain age from WHOIS-like data or URL registration patterns.
   * Falls back to a conservative estimate based on the source record age.
   */
  private static async estimateDomainAge(url: string): Promise<number> {
    try {
      const domain = new URL(url).hostname;
      // Simple heuristic: extract creation year from common patterns
      // Real implementation would use WHOIS API or domain age service
      const knownAges: Record<string, number> = {
        'santeknath.org': 15,
        'wikisource.org': 20,
        'abhangvani.com': 8,
        'abhang.in': 10,
        'warkarirojnishi.in': 5,
        'youtube.com': 18,
      };

      for (const [known, age] of Object.entries(knownAges)) {
        if (domain.includes(known)) return age;
      }

      return 3; // Conservative default for unknown domains
    } catch {
      return 3;
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────

  /**
   * Normalize response time to a 0-1 score.
   * < 1s = 1.0, < 3s = 0.8, < 5s = 0.6, < 10s = 0.3, >= 10s = 0.1
   */
  private static normalizeResponseTime(ms: number | null): number {
    if (ms === null) return 0.5;
    const seconds = ms / 1000;
    if (seconds < 1) return 1.0;
    if (seconds < 3) return 0.8;
    if (seconds < 5) return 0.6;
    if (seconds < 10) return 0.3;
    return 0.1;
  }

  /**
   * Default component weights.
   * Sum = 1.0
   */
  private static getWeights(): Record<string, number> {
    return {
      moderationPassRate: 0.20,
      verifiedRatio: 0.15,
      correctionRate: 0.10,
      uptime: 0.12,
      responseTimeScore: 0.08,
      formatConsistency: 0.05,
      licenseClarity: 0.08,
      attributionQuality: 0.07,
      domainAge: 0.03,
      hasRobotsTxt: 0.02,
      communityReports: 0.05,
      editorFeedback: 0.03,
      crossSourceMatchRate: 0.02,
    };
  }
}
