/**
 * Vitthalaya — Wikisource Bulk Importer: incremental mode
 *
 * Unit tests for `decideIncremental`, the pure decision function that tells
 * the importer which pages to re-crawl. It must never silently skip a page
 * whose wikitext changed, and must skip pages whose revision is unchanged so
 * scheduled DiscoveryJob cycles stop re-fetching the whole catalog daily.
 */

import { describe, expect, test } from 'bun:test';
import {
  decideIncremental,
  type BulkCrawlState,
  type PageRevision,
} from '../../scripts/acquire-wikisource-bulk';

const rev = (revId: number, timestamp = '2026-01-01T00:00:00Z'): PageRevision => ({ revId, timestamp });

describe('decideIncremental', () => {
  test('full run (no incremental, no since): crawls everything, skips nothing', () => {
    const revids = new Map<string, PageRevision>([['A', rev(5)]]);
    const { crawl, skipped } = decideIncremental(['A', 'B'], revids, {});
    expect(skipped).toBe(0);
    expect(crawl.has('A')).toBe(true);
    expect(crawl.has('B')).toBe(true);
  });

  test('incremental: skips pages whose latest revId matches the stored one', () => {
    const state: BulkCrawlState = { A: { revId: 5, fetchedAt: '2026-01-02T00:00:00Z' } };
    const revids = new Map<string, PageRevision>([
      ['A', rev(5)],
      ['B', rev(9, '2026-01-03T00:00:00Z')],
    ]);
    const { crawl, skipped } = decideIncremental(['A', 'B'], revids, state, undefined);
    expect(skipped).toBe(1);
    expect(crawl.has('A')).toBe(false);
    expect(crawl.has('B')).toBe(true);
  });

  test('incremental: crawls a page whose revId changed', () => {
    const state: BulkCrawlState = { A: { revId: 5 } };
    const revids = new Map<string, PageRevision>([['A', rev(6, '2026-02-01T00:00:00Z')]]);
    const { crawl, skipped } = decideIncremental(['A'], revids, state, undefined);
    expect(skipped).toBe(0);
    expect(crawl.has('A')).toBe(true);
  });

  test('incremental: never-fetched pages are crawled (first run establishes state)', () => {
    const revids = new Map<string, PageRevision>([['C', rev(3)]]);
    const { crawl, skipped } = decideIncremental(['C'], revids, {}, undefined);
    expect(skipped).toBe(0);
    expect(crawl.has('C')).toBe(true);
  });

  test('incremental: a page missing from the revision batch is crawled (surfaces fetch errors)', () => {
    const { crawl, skipped } = decideIncremental(['X'], new Map(), { X: { revId: 1 } }, undefined);
    expect(skipped).toBe(0);
    expect(crawl.has('X')).toBe(true);
  });

  test('since: crawls only pages with a revision newer than the timestamp', () => {
    // With rvdir=newer the API omits pages without a newer revision, so the
    // map only contains pages that changed since the timestamp.
    const revids = new Map<string, PageRevision>([['New', rev(2, '2026-03-01T00:00:00Z')]]);
    const { crawl, skipped } = decideIncremental(['Old', 'New'], revids, {}, '2026-02-01T00:00:00Z');
    expect(skipped).toBe(1);
    expect(crawl.has('Old')).toBe(false);
    expect(crawl.has('New')).toBe(true);
  });

  test('since: a page with no newer revision (missing from batch) is skipped', () => {
    const { crawl, skipped } = decideIncremental(['Stale'], new Map(), {}, '2026-02-01T00:00:00Z');
    expect(skipped).toBe(1);
    expect(crawl.has('Stale')).toBe(false);
  });

  test('incremental + state always treats a stateful unchanged page correctly across runs', () => {
    // Simulate two consecutive scheduled cycles: fetch 5, then fetch again.
    const revids = new Map<string, PageRevision>([['A', rev(5)]]);
    const first = decideIncremental(['A'], revids, {});
    expect(first.crawl.has('A')).toBe(true);

    // After a successful fetch the importer records revId 5...
    const state: BulkCrawlState = { A: { revId: 5, fetchedAt: new Date().toISOString() } };
    const second = decideIncremental(['A'], revids, state, undefined);
    expect(second.skipped).toBe(1);
    expect(second.crawl.has('A')).toBe(false);
  });
});
