/**
 * Digital Pandharpur — Content Source Registry
 *
 * Manages tracked content sources: CRUD, health recording, auto-disable,
 * and community tip submission.
 */

import { db } from '@/src/db/client';
import {
  type ContentSource,
  type CreateSourceInput,
  type UpdateSourceInput,
  type SourceFilter,
  type SourceStatus,
} from './types';

export class SourceRegistry {
  // ─── Read ──────────────────────────────────────────────────────

  /** Get all sources matching optional filters */
  static async getAll(filters?: SourceFilter): Promise<ContentSource[]> {
    const where: Record<string, unknown> = {};

    if (filters?.status) {
      where.status = Array.isArray(filters.status)
        ? { in: filters.status }
        : filters.status;
    }
    if (filters?.type) {
      where.type = Array.isArray(filters.type)
        ? { in: filters.type }
        : filters.type;
    }
    if (filters?.trustScoreMin !== undefined) {
      where.trustScore = { ...(where.trustScore as object ?? {}), gte: filters.trustScoreMin };
    }
    if (filters?.trustScoreMax !== undefined) {
      where.trustScore = { ...(where.trustScore as object ?? {}), lte: filters.trustScoreMax };
    }
    if (filters?.baseDomain) {
      where.baseDomain = filters.baseDomain;
    }
    if (filters?.language) {
      where.language = filters.language;
    }
    if (filters?.isAutoDiscovered !== undefined) {
      where.isAutoDiscovered = filters.isAutoDiscovered;
    }
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { url: { contains: filters.search, mode: 'insensitive' } },
        { baseDomain: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return db.contentSource.findMany({
      where,
      orderBy: { trustScore: 'desc' },
      take: filters?.limit ?? 100,
      skip: filters?.offset ?? 0,
    }) as Promise<ContentSource[]>;
  }

  /** Get a single source by ID */
  static async getById(id: string): Promise<ContentSource | null> {
    return db.contentSource.findUnique({ where: { id } }) as Promise<ContentSource | null>;
  }

  /** Get all ACTIVE sources ready for scraping */
  static async getActive(): Promise<ContentSource[]> {
    return this.getAll({ status: 'ACTIVE' });
  }

  /** Get count of sources by status */
  static async getCounts(): Promise<Record<SourceStatus, number>> {
    const counts: Record<string, number> = {};
    const statuses: SourceStatus[] = ['ACTIVE', 'PAUSED', 'DISABLED', 'BLOCKED'];

    for (const status of statuses) {
      counts[status] = await db.contentSource.count({ where: { status } }) as number;
    }

    return counts as Record<SourceStatus, number>;
  }

  // ─── Create / Update / Delete ──────────────────────────────────

  /** Register a new content source */
  static async create(input: CreateSourceInput): Promise<ContentSource> {
    return db.contentSource.create({
      data: {
        name: input.name,
        type: input.type,
        url: input.url,
        baseDomain: input.baseDomain,
        scraperType: input.scraperType ?? null,
        scrapeInterval: input.scrapeInterval ?? 6,
        rateLimitMs: input.rateLimitMs ?? 2000,
        license: input.license ?? null,
        requiresAttribution: input.requiresAttribution ?? true,
        attributionTemplate: input.attributionTemplate ?? null,
        tags: input.tags ? JSON.stringify(input.tags) : null,
        language: input.language ?? 'mr',
        region: input.region ?? null,
        notes: input.notes ?? null,
        isAutoDiscovered: input.isAutoDiscovered ?? false,
        submittedById: input.submittedById ?? null,
        allowedPaths: input.allowedPaths ? JSON.stringify(input.allowedPaths) : null,
        excludedPaths: input.excludedPaths ? JSON.stringify(input.excludedPaths) : null,
        status: 'ACTIVE',
        trustScore: 0.5,
      },
    }) as Promise<ContentSource>;
  }

  /** Update an existing source */
  static async update(id: string, input: UpdateSourceInput): Promise<ContentSource> {
    const data: Record<string, unknown> = {};

    const fields: (keyof UpdateSourceInput)[] = [
      'name', 'type', 'url', 'baseDomain', 'scraperType',
      'scrapeInterval', 'rateLimitMs', 'robotsTxt',
      'trustScore', 'totalCompositions', 'verifiedCompositions',
      'errorRate', 'lastFetchAt', 'lastErrorAt', 'consecutiveErrors',
      'lastErrorMessage',
      'license', 'requiresAttribution', 'attributionTemplate',
      'status', 'isAutoDiscovered', 'language', 'region', 'notes',
    ];

    for (const field of fields) {
      if (input[field] !== undefined) {
        data[field] = input[field];
      }
    }

    // Handle JSON array fields
    if (input.tags !== undefined) {
      data.tags = JSON.stringify(input.tags);
    }
    if (input.allowedPaths !== undefined) {
      data.allowedPaths = JSON.stringify(input.allowedPaths);
    }
    if (input.excludedPaths !== undefined) {
      data.excludedPaths = JSON.stringify(input.excludedPaths);
    }

    return db.contentSource.update({
      where: { id },
      data,
    }) as Promise<ContentSource>;
  }

  /** Delete a source (only if no discovery jobs reference it — or cascade) */
  static async delete(id: string): Promise<void> {
    await db.contentSource.delete({ where: { id } });
  }

  // ─── Health Tracking ──────────────────────────────────────────

  /** Record a successful fetch for a source */
  static async recordSuccess(
    id: string,
    itemCount: number,
  ): Promise<void> {
    const source = await this.getById(id);
    if (!source) return;

    const totalCompositions = source.totalCompositions + itemCount;

    await this.update(id, {
      totalCompositions,
      lastFetchAt: new Date(),
      consecutiveErrors: 0, // Reset on success
      errorRate: 0, // Reset on success; recalculated by trust scorer
    });
  }

  /** Record a failed fetch for a source */
  static async recordError(
    id: string,
    errorMessage: string,
  ): Promise<void> {
    const source = await this.getById(id);
    if (!source) return;

    const consecutiveErrors = source.consecutiveErrors + 1;
    const errorRate = Math.min(1.0, (consecutiveErrors / 10) * 0.5);

    await this.update(id, {
      consecutiveErrors,
      lastErrorAt: new Date(),
      lastErrorMessage: errorMessage,
      errorRate,
    });

    // Auto-disable after 3 consecutive errors
    if (consecutiveErrors >= 3) {
      await this.disableIfFailing(id);
    }
  }

  /** Auto-disable a source that's been failing */
  static async disableIfFailing(id: string): Promise<boolean> {
    const source = await this.getById(id);
    if (!source) return false;

    if (source.consecutiveErrors >= 3) {
      await this.update(id, {
        status: 'DISABLED',
        notes: source.notes
          ? `${source.notes}\n[Auto-disabled] ${source.consecutiveErrors} consecutive errors`
          : `[Auto-disabled] ${source.consecutiveErrors} consecutive errors`,
      });
      console.warn(`[SourceRegistry] Auto-disabled source "${source.name}" after ${source.consecutiveErrors} consecutive errors`);
      return true;
    }

    return false;
  }

  /** Re-enable a previously disabled source */
  static async reenable(id: string): Promise<ContentSource> {
    const source = await this.getById(id);
    if (!source) throw new Error(`Source ${id} not found`);

    return this.update(id, {
      status: 'ACTIVE',
      consecutiveErrors: 0,
      errorRate: 0,
    }) as Promise<ContentSource>;
  }

  // ─── Community Tips ──────────────────────────────────────────

  /** Submit a community tip for a new source URL */
  static async submitCommunityTip(
    url: string,
    userId: string,
    notes?: string,
  ): Promise<ContentSource> {
    const domain = extractDomain(url);
    const name = `Community Tip: ${domain}`;

    const source = await this.create({
      name,
      type: 'COMMUNITY',
      url,
      baseDomain: domain,
      submittedById: userId,
      notes: notes ?? null,
      isAutoDiscovered: true,
      scrapeInterval: 24, // Daily check
      rateLimitMs: 3000,  // Conservative rate limit for community tips
    });

    return this.update(source.id, {
      status: 'PAUSED',
      trustScore: 0.3,
    });
  }

  // ─── Stats ──────────────────────────────────────────────────

  /** Aggregate statistics for the discovery dashboard */
  static async getAggregateStats(): Promise<{
    totalSources: number;
    activeSources: number;
    totalCompositions: number;
    totalVerified: number;
    avgTrustScore: number;
  }> {
    const allSources = await this.getAll({ limit: 10000 });
    const activeSources = allSources.filter((s) => s.status === 'ACTIVE');

    const totalCompositions = allSources.reduce((sum, s) => sum + s.totalCompositions, 0);
    const totalVerified = allSources.reduce((sum, s) => sum + s.verifiedCompositions, 0);
    const avgTrustScore = allSources.length > 0
      ? allSources.reduce((sum, s) => sum + s.trustScore, 0) / allSources.length
      : 0;

    return {
      totalSources: allSources.length,
      activeSources: activeSources.length,
      totalCompositions,
      totalVerified,
      avgTrustScore,
    };
  }
}

// ─── Helpers ───────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    // Fallback: simple extraction
    const match = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?([^:/\n?=]+)/);
    return match?.[1]?.replace(/^www\./, '') ?? url;
  }
}
