/**
 * Digital Pandharpur — Content Discovery Shared Types
 *
 * Core type definitions for the autonomous content discovery & growth engine.
 */

import type { ContentSource, DiscoveryJob } from '@prisma/client';

// ─── Re-export Prisma types ────────────────────────────────────

export type { ContentSource, DiscoveryJob };

// ─── Domain Types ──────────────────────────────────────────────

export type SourceType = 'SITEMAP' | 'RSS' | 'WEBSITE' | 'YOUTUBE' | 'COMMUNITY' | 'SEARCH';

export type SourceStatus = 'ACTIVE' | 'PAUSED' | 'DISABLED' | 'BLOCKED';

export type JobType = 'FULL_SYNC' | 'INCREMENTAL' | 'HEALTH_CHECK' | 'SOURCE_DISCOVERY';

export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export type JobTrigger = 'SCHEDULED' | 'MANUAL' | 'WEBHOOK';

export type TrustTier = 'TRUSTED' | 'ESTABLISHED' | 'NEW' | 'UNTRUSTED' | 'BLOCKED';

// ─── Create / Update Inputs ────────────────────────────────────

export interface CreateSourceInput {
  name: string;
  type: SourceType;
  url: string;
  baseDomain: string;
  scraperType?: string | null;
  scrapeInterval?: number;
  rateLimitMs?: number;
  license?: string | null;
  requiresAttribution?: boolean;
  attributionTemplate?: string | null;
  tags?: string[];
  language?: string;
  region?: string | null;
  notes?: string | null;
  isAutoDiscovered?: boolean;
  submittedById?: string | null;
  allowedPaths?: string[];
  excludedPaths?: string[];
}

export interface UpdateSourceInput {
  name?: string;
  type?: SourceType;
  url?: string;
  baseDomain?: string;
  scraperType?: string | null;
  scrapeInterval?: number;
  rateLimitMs?: number;
  robotsTxt?: string | null;
  allowedPaths?: string[];
  excludedPaths?: string[];
  trustScore?: number;
  totalCompositions?: number;
  verifiedCompositions?: number;
  errorRate?: number;
  lastFetchAt?: Date | null;
  lastErrorAt?: Date | null;
  consecutiveErrors?: number;
  lastErrorMessage?: string | null;
  license?: string | null;
  requiresAttribution?: boolean;
  attributionTemplate?: string | null;
  status?: SourceStatus;
  isAutoDiscovered?: boolean;
  tags?: string[];
  language?: string;
  region?: string | null;
  notes?: string | null;
}

export interface CreateJobInput {
  sourceId: string;
  type: JobType;
  trigger?: JobTrigger;
}

// ─── Query Filters ─────────────────────────────────────────────

export interface SourceFilter {
  status?: SourceStatus | SourceStatus[];
  type?: SourceType | SourceType[];
  trustScoreMin?: number;
  trustScoreMax?: number;
  baseDomain?: string;
  language?: string;
  isAutoDiscovered?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface JobFilter {
  sourceId?: string;
  status?: JobStatus | JobStatus[];
  type?: JobType | JobType[];
  limit?: number;
  offset?: number;
  since?: Date;
}

// ─── Discovery Results ─────────────────────────────────────────

export interface SourceHealth {
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
  status: SourceStatus;
  trustScore: number;
  trustTier: TrustTier;
  lastCheckAt: Date | null;
  metrics: SourceHealthMetrics;
  recentErrors: Array<{ at: Date; type: string; message: string }>;
  recommendation: string | null;
}

export interface SourceHealthMetrics {
  successRate7d: number;
  consecutiveErrors: number;
  avgResponseTime: number | null;
  itemsPerRun: number;
  dedupRate: number;
  moderationPassRate: number;
}

export interface DiscoveryReport {
  cycleId: string;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  sourcesChecked: number;
  sourcesSucceeded: number;
  sourcesFailed: number;
  totalItemsFound: number;
  totalItemsNew: number;
  totalItemsErrored: number;
  totalDuplicates: number;
  perSource: Array<{
    sourceId: string;
    sourceName: string;
    status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
    itemsFound: number;
    itemsNew: number;
    durationMs: number;
    error: string | null;
  }>;
}

export interface TrustScoreComponents {
  moderationPassRate: number;
  verifiedRatio: number;
  correctionRate: number;
  uptime: number;
  responseTimeScore: number;
  formatConsistency: number;
  licenseClarity: number;
  attributionQuality: number;
  domainAge: number;
  hasRobotsTxt: boolean;
  communityReports: number;
  editorFeedback: number;
  crossSourceMatchRate: number;
}

export interface TrustScoreResult {
  score: number;
  tier: TrustTier;
  components: TrustScoreComponents;
}

// ─── Helpers ───────────────────────────────────────────────────

export function getTrustTier(score: number): TrustTier {
  if (score >= 0.9) return 'TRUSTED';
  if (score >= 0.7) return 'ESTABLISHED';
  if (score >= 0.4) return 'NEW';
  if (score >= 0.0) return 'UNTRUSTED';
  return 'BLOCKED';
}

export function sourceStatusLabel(status: SourceStatus): string {
  const labels: Record<SourceStatus, string> = {
    ACTIVE: 'Active',
    PAUSED: 'Paused',
    DISABLED: 'Disabled',
    BLOCKED: 'Blocked',
  };
  return labels[status];
}
