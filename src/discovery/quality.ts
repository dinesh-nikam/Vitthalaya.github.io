/**
 * Digital Pandharpur — Source Quality Scoring (pure, unit-tested)
 *
 * Computes a composite crawl-priority score for a ContentSource from its
 * measurable history. The score drives WHICH sources to crawl first and HOW
 * OFTEN — high-quality sources get priority, failing/low-yield sources sink.
 *
 * Score is 0..1:
 *   - qualityScore        — overall 0..1 composite (crawl priority)
 *   - freshnessBonus      — time since last fetch (older = more due)
 *   - yieldRate           — share of fetched items that were NEW (1 - dup rate)
 *   - reliability         — 1 - error rate
 *   - verifiedRatio       — share of compositions reviewed/verified
 *
 * All inputs are plain numbers — no I/O, fully unit-testable.
 */

export interface QualityInput {
  /** Baseline registry trust score 0..1 (editorial + historical). */
  trustScore: number;
  /** Hours since last successful fetch. Use 0 for never-fetched. */
  hoursSinceLastFetch: number | null;
  /** Fetched-but-duplicate ratio 0..1 (1 = everything was a duplicate). */
  duplicateRatio: number;
  /** Error ratio 0..1 (1 = every run failed). */
  errorRate: number;
  /** License clarity 0..1 (1 = clear public-domain/CC license). */
  licenseClarity: number;
  /** Share of total compositions verified 0..1. */
  verifiedRatio: number;
  /** Approved-content ratio from moderation 0..1 (null = no signal yet). */
  approvedRatio: number | null;
  /** Whether robots.txt compliance is known (1) or unknown (0). */
  robotsCompliant: number;
}

export interface QualityResult {
  score: number;
  tier: 'TRUSTED' | 'ESTABLISHED' | 'NEW' | 'UNTRUSTED';
  freshnessBonus: number;
  yieldRate: number;
  reliability: number;
  components: Record<string, number>;
}

const WEIGHTS = {
  trust: 0.35,
  freshness: 0.15,
  yield: 0.20,
  reliability: 0.15,
  license: 0.08,
  verified: 0.05,
  approved: 0.02,
} as const;

const FRESHNESS_HOURS_BEST = 72; // fetching more often than this doesn't add priority

/**
 * Freshness bonus: 0 right after a fetch, rising to 1 once the source hasn't
 * been fetched in FRESHNESS_HOURS_BEST hours. Never-fetched sources are the
 * most due (1.0).
 */
export function freshnessBonus(hoursSinceLastFetch: number | null): number {
  if (hoursSinceLastFetch === null) return 1.0;
  if (hoursSinceLastFetch <= 0) return 0;
  return Math.min(1, hoursSinceLastFetch / FRESHNESS_HOURS_BEST);
}

/** Yield: share of fetched items that were new (1 = no duplicates at all). */
export function yieldRate(duplicateRatio: number): number {
  const clamped = Math.max(0, Math.min(1, duplicateRatio));
  return 1 - clamped;
}

/** Reliability: 1 - error rate, floored at 0. */
export function reliability(errorRate: number): number {
  return Math.max(0, Math.min(1, 1 - errorRate));
}

export function computeQualityScore(input: QualityInput): QualityResult {
  const freshness = freshnessBonus(input.hoursSinceLastFetch);
  const yieldR = yieldRate(input.duplicateRatio);
  const reliable = reliability(input.errorRate);
  const approved = input.approvedRatio ?? 0.5; // neutral when no signal yet

  const trust = Math.max(0, Math.min(1, input.trustScore));
  const license = Math.max(0, Math.min(1, input.licenseClarity));
  const verified = Math.max(0, Math.min(1, input.verifiedRatio));
  const robots = Math.max(0, Math.min(1, input.robotsCompliant));

  const score =
    trust * WEIGHTS.trust +
    freshness * WEIGHTS.freshness +
    yieldR * WEIGHTS.yield +
    reliable * WEIGHTS.reliability +
    license * WEIGHTS.license +
    verified * WEIGHTS.verified +
    approved * WEIGHTS.approved +
    robots * 0; // robots compliance is a gate, not a score driver

  const clamped = Math.max(0, Math.min(1, score));

  const tier =
    clamped >= 0.75 ? 'TRUSTED' : clamped >= 0.55 ? 'ESTABLISHED' : clamped >= 0.35 ? 'NEW' : 'UNTRUSTED';

  return {
    score: clamped,
    tier,
    freshnessBonus: freshness,
    yieldRate: yieldR,
    reliability: reliable,
    components: {
      trust,
      freshness,
      yield: yieldR,
      reliability: reliable,
      license,
      verified,
      approved,
    },
  };
}

/**
 * A source that fails repeatedly must never be crawled regardless of score.
 * This is the hard gate (robots compliance + consecutive errors).
 */
export function isCrawlable(input: {
  status: string;
  consecutiveErrors: number;
  robotsCompliant: boolean;
}): boolean {
  if (input.status !== 'ACTIVE') return false;
  if (input.consecutiveErrors >= 3) return false;
  return true;
}
