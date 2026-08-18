/**
 * Digital Pandharpur — Due Source Selection (pure, unit-tested)
 *
 * Decides which ContentSources a discovery cycle should crawl:
 *   - a source is DUE when `lastFetchAt + scrapeInterval` has elapsed
 *     (or it has never been fetched)
 *   - due sources are ordered by quality score descending so the best
 *     sources get crawled first when a cycle has a concurrency/rate budget
 *
 * No I/O — takes plain data, returns plain results.
 */

import type { ContentSource } from './types';
import { computeQualityScore, isCrawlable, type QualityInput } from './quality';

export interface DueSource {
  source: ContentSource;
  qualityScore: number;
  /** Hours since the last successful fetch (null = never fetched). */
  hoursSinceLastFetch: number | null;
}

/** Parse the registry's JSON-array columns safely. */
function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Build a QualityInput from a ContentSource row + current time. */
export function toQualityInput(source: ContentSource, now: Date): QualityInput {
  const hours = source.lastFetchAt
    ? (now.getTime() - source.lastFetchAt.getTime()) / (60 * 60 * 1000)
    : null;

  // Duplicate ratio: from the source's aggregate history. When no jobs have
  // run yet (never fetched), use 0 — no signal, no penalty.
  const duplicateRatio = source.lastFetchAt ? clamp01(1 - (source.verifiedCompositions / Math.max(1, source.totalCompositions)) * 0.5) : 0;
  const hasLicense = Boolean(source.license);
  const robotsCompliant = source.robotsTxt !== null && source.robotsTxt !== undefined;

  return {
    trustScore: source.trustScore,
    hoursSinceLastFetch: hours,
    duplicateRatio,
    errorRate: source.errorRate,
    licenseClarity: hasLicense ? 0.9 : 0.3,
    verifiedRatio: source.totalCompositions > 0 ? source.verifiedCompositions / source.totalCompositions : 0,
    approvedRatio: null,
    robotsCompliant: robotsCompliant ? 1 : 0,
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Select due sources from the full registry list.
 * - filters to ACTIVE sources that pass the crawlability gate
 * - computes hours-since-last-fetch
 * - returns sources sorted by quality score desc
 */
export function selectDueSources(sources: ContentSource[], now: Date = new Date()): DueSource[] {
  const due: DueSource[] = [];

  for (const source of sources) {
    // Hard gate: only ACTIVE sources with < 3 consecutive errors. Robots
    // compliance is informational (trust input), not a hard blocker — an
    // uncached robots.txt shouldn't freeze an otherwise-good source.
    if (!isCrawlable({ status: source.status, consecutiveErrors: source.consecutiveErrors, robotsCompliant: true })) {
      continue;
    }

    const hours = source.lastFetchAt
      ? (now.getTime() - source.lastFetchAt.getTime()) / (60 * 60 * 1000)
      : null;

    // Never fetched → due immediately. Otherwise due once interval elapsed.
    const isDue = hours === null || hours >= source.scrapeInterval;
    if (!isDue) continue;

    const quality = computeQualityScore(toQualityInput(source, now));
    due.push({ source, qualityScore: quality.score, hoursSinceLastFetch: hours });
  }

  return due.sort((a, b) => b.qualityScore - a.qualityScore);
}

/** Export the tags helper for reuse in the worker. */
export { asStringArray };
