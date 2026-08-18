import { describe, expect, test } from 'bun:test';
import {
  reorderItems,
  moveItemById,
  nextSortOrder,
  assertSingleTarget,
} from '@/src/lib/playlists';

interface Item {
  id: string;
}

const ITEMS: Item[] = [
  { id: 'a' },
  { id: 'b' },
  { id: 'c' },
  { id: 'd' },
];

describe('playlists — reorderItems', () => {
  test('TC-PL-001: moves an item forward', () => {
    expect(reorderItems(ITEMS, 0, 2).map((i) => i.id)).toEqual(['b', 'c', 'a', 'd']);
  });

  test('TC-PL-002: moves an item backward', () => {
    expect(reorderItems(ITEMS, 3, 1).map((i) => i.id)).toEqual(['a', 'd', 'b', 'c']);
  });

  test('TC-PL-003: same index is a no-op (returns input reference)', () => {
    expect(reorderItems(ITEMS, 1, 1)).toBe(ITEMS);
  });

  test('TC-PL-004: out-of-range indices are ignored', () => {
    expect(reorderItems(ITEMS, -1, 2)).toBe(ITEMS);
    expect(reorderItems(ITEMS, 0, 99)).toBe(ITEMS);
    expect(reorderItems(ITEMS, 99, 0)).toBe(ITEMS);
  });

  test('TC-PL-005: does not mutate the input array', () => {
    const copy = [...ITEMS];
    reorderItems(ITEMS, 0, 3);
    expect(ITEMS).toEqual(copy);
  });

  test('TC-PL-006: appending to the end', () => {
    expect(reorderItems(ITEMS, 0, 4).map((i) => i.id)).toEqual(['b', 'c', 'd', 'a']);
  });
});

describe('playlists — moveItemById', () => {
  test('TC-PL-007: moves by id', () => {
    expect(moveItemById(ITEMS, 'c', 0).map((i) => i.id)).toEqual(['c', 'a', 'b', 'd']);
  });

  test('TC-PL-008: unknown id returns input unchanged', () => {
    expect(moveItemById(ITEMS, 'zzz', 0)).toBe(ITEMS);
  });
});

describe('playlists — nextSortOrder', () => {
  test('TC-PL-009: empty list starts at 0', () => {
    expect(nextSortOrder([])).toBe(0);
  });

  test('TC-PL-010: appends one above the max', () => {
    expect(nextSortOrder([{ sortOrder: 0 }, { sortOrder: 2 }, { sortOrder: 5 }])).toBe(6);
    expect(nextSortOrder([{ sortOrder: 4 }])).toBe(5);
  });
});

describe('playlists — assertSingleTarget', () => {
  test('TC-PL-011: accepts exactly one target', () => {
    expect(() => assertSingleTarget('comp-1', null)).not.toThrow();
    expect(() => assertSingleTarget(null, 'upload-1')).not.toThrow();
  });

  test('TC-PL-012: rejects both targets', () => {
    expect(() => assertSingleTarget('comp-1', 'upload-1')).toThrow();
  });

  test('TC-PL-013: rejects neither target', () => {
    expect(() => assertSingleTarget(null, null)).toThrow();
  });
});
