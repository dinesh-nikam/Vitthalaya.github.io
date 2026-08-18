import { describe, expect, test } from 'bun:test';
import {
  computeQualityScore,
  freshnessBonus,
  yieldRate,
  reliability,
  isCrawlable,
  type QualityInput,
} from '@/src/discovery/quality';
import { selectDueSources, toQualityInput } from '@/src/discovery/due-sources';

const BASE: QualityInput = {
  trustScore: 0.8,
  hoursSinceLastFetch: 120,
  duplicateRatio: 0.2,
  errorRate: 0.1,
  licenseClarity: 0.9,
  verifiedRatio: 0.5,
  approvedRatio: 0.8,
  robotsCompliant: 1,
};

describe('discovery-quality — freshnessBonus', () => {
  test('TC-DQ-001: never-fetched is the most due (1.0)', () => {
    expect(freshnessBonus(null)).toBe(1.0);
  });
  test('TC-DQ-002: just-fetched is 0', () => {
    expect(freshnessBonus(0)).toBe(0);
  });
  test('TC-DQ-003: saturates at FRESHNESS_HOURS_BEST', () => {
    expect(freshnessBonus(72)).toBe(1.0);
    expect(freshnessBonus(200)).toBe(1.0);
  });
  test('TC-DQ-004: ramps linearly in between', () => {
    expect(freshnessBonus(36)).toBeCloseTo(0.5, 5);
  });
});

describe('discovery-quality — yieldRate & reliability', () => {
  test('TC-DQ-005: yield is 1 minus duplicate ratio, clamped', () => {
    expect(yieldRate(0)).toBe(1);
    expect(yieldRate(0.4)).toBeCloseTo(0.6);
    expect(yieldRate(1.5)).toBe(0);
  });
  test('TC-DQ-006: reliability floors at 0', () => {
    expect(reliability(0)).toBe(1);
    expect(reliability(0.5)).toBeCloseTo(0.5);
    expect(reliability(2)).toBe(0);
  });
});

describe('discovery-quality — computeQualityScore', () => {
  test('TC-DQ-007: strong source scores high', () => {
    const r = computeQualityScore(BASE);
    expect(r.score).toBeGreaterThan(0.7);
    expect(r.tier).toBe('TRUSTED');
  });

  test('TC-DQ-008: low trust + high errors + stale drops the score', () => {
    const r = computeQualityScore({
      ...BASE,
      trustScore: 0.1,
      errorRate: 0.9,
      duplicateRatio: 0.95,
      licenseClarity: 0.1,
      verifiedRatio: 0,
      hoursSinceLastFetch: 0,
    });
    expect(r.score).toBeLessThan(0.4);
    expect(r.tier).toBe('UNTRUSTED');
  });

  test('TC-DQ-009: score is clamped to 0..1', () => {
    const r = computeQualityScore({ ...BASE, trustScore: 5, approvedRatio: 2 });
    expect(r.score).toBeLessThanOrEqual(1);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });

  test('TC-DQ-010: component deltas are reflected in the score', () => {
    const fresh = computeQualityScore(BASE);
    const stale = computeQualityScore({ ...BASE, hoursSinceLastFetch: 0 });
    expect(fresh.score).toBeGreaterThan(stale.score);
    expect(fresh.freshnessBonus).toBeGreaterThan(stale.freshnessBonus);
  });
});

describe('discovery-quality — isCrawlable gate', () => {
  test('TC-DQ-011: active source with <3 consecutive errors is crawlable', () => {
    expect(isCrawlable({ status: 'ACTIVE', consecutiveErrors: 2, robotsCompliant: true })).toBe(true);
  });
  test('TC-DQ-012: blocked after 3 consecutive errors', () => {
    expect(isCrawlable({ status: 'ACTIVE', consecutiveErrors: 3, robotsCompliant: true })).toBe(false);
  });
  test('TC-DQ-013: non-active status never crawls', () => {
    expect(isCrawlable({ status: 'DISABLED', consecutiveErrors: 0, robotsCompliant: true })).toBe(false);
  });
});

describe('discovery-quality — selectDueSources', () => {
  function source(overrides: Record<string, unknown>) {
    return {
      id: String(overrides.id ?? 's1'),
      name: 'Test',
      type: 'WEBSITE',
      url: 'https://example.com',
      baseDomain: 'example.com',
      scraperType: null,
      scrapeInterval: 6,
      rateLimitMs: 2000,
      robotsTxt: null,
      allowedPaths: null,
      excludedPaths: null,
      trustScore: 0.5,
      totalCompositions: 0,
      verifiedCompositions: 0,
      errorRate: 0,
      lastFetchAt: null,
      lastErrorAt: null,
      lastErrorMessage: null,
      consecutiveErrors: 0,
      license: null,
      requiresAttribution: true,
      attributionTemplate: null,
      status: 'ACTIVE',
      isAutoDiscovered: false,
      discoveredById: null,
      submittedById: null,
      tags: null,
      language: 'mr',
      region: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as unknown as import('@/src/discovery/types').ContentSource;
  }

  test('TC-DQ-014: never-fetched sources are due', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const due = selectDueSources([source({})], now);
    expect(due.length).toBe(1);
    expect(due[0].hoursSinceLastFetch).toBeNull();
  });

  test('TC-DQ-015: fresh sources within interval are not due', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const lastFetch = new Date('2025-12-31T22:00:00Z'); // 2h ago < 6h interval
    const due = selectDueSources([source({ lastFetchAt: lastFetch, scrapeInterval: 6 })], now);
    expect(due.length).toBe(0);
  });

  test('TC-DQ-016: stale sources past interval are due', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const lastFetch = new Date('2025-12-30T00:00:00Z'); // 48h ago > 6h interval
    const due = selectDueSources([source({ lastFetchAt: lastFetch, scrapeInterval: 6 })], now);
    expect(due.length).toBe(1);
  });

  test('TC-DQ-017: due sources are ordered by quality desc', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const good = source({ id: 'good', trustScore: 0.95 });
    const bad = source({ id: 'bad', trustScore: 0.1, errorRate: 0.8 });
    const due = selectDueSources([bad, good], now);
    expect(due[0].source.id).toBe('good');
    expect(due[1].source.id).toBe('bad');
  });

  test('TC-DQ-018: disabled / high-error sources are excluded', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const disabled = source({ id: 'd', status: 'DISABLED' });
    const failing = source({ id: 'f', consecutiveErrors: 4 });
    const due = selectDueSources([disabled, failing], now);
    expect(due.length).toBe(0);
  });
});

describe('discovery-quality — toQualityInput', () => {
  test('TC-DQ-019: maps hours since last fetch correctly', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const src = {
      id: 's1',
      name: 'T',
      type: 'WEBSITE',
      url: 'https://example.com',
      baseDomain: 'example.com',
      scraperType: null,
      scrapeInterval: 6,
      rateLimitMs: 2000,
      robotsTxt: 'User-agent: *\nDisallow:',
      allowedPaths: null,
      excludedPaths: null,
      trustScore: 0.9,
      totalCompositions: 100,
      verifiedCompositions: 60,
      errorRate: 0,
      lastFetchAt: new Date('2025-12-31T00:00:00Z'), // 24h ago
      lastErrorAt: null,
      lastErrorMessage: null,
      consecutiveErrors: 0,
      license: 'CC BY-SA 4.0',
      requiresAttribution: true,
      attributionTemplate: null,
      status: 'ACTIVE',
      isAutoDiscovered: false,
      discoveredById: null,
      submittedById: null,
      tags: null,
      language: 'mr',
      region: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as import('@/src/discovery/types').ContentSource;

    const input = toQualityInput(src, now);
    expect(input.hoursSinceLastFetch).toBeCloseTo(24, 5);
    expect(input.licenseClarity).toBeCloseTo(0.9);
    expect(input.robotsCompliant).toBe(1);
    expect(input.verifiedRatio).toBeCloseTo(0.6);
  });
});
