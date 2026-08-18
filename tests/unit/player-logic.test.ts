import { describe, expect, test } from 'bun:test';
import { cycleRepeatMode, generateShuffleOrder, nextIndex, prevIndex, formatPlayerTime } from '@/src/lib/player-logic';

describe('player-logic — cycleRepeatMode', () => {
  test('TC-PL-001: cycles off → all → one → off', () => {
    expect(cycleRepeatMode('off')).toBe('all');
    expect(cycleRepeatMode('all')).toBe('one');
    expect(cycleRepeatMode('one')).toBe('off');
  });
});

describe('player-logic — generateShuffleOrder', () => {
  test('TC-PL-002: keeps the current track first', () => {
    const order = generateShuffleOrder(5, 2, () => 0.5);
    expect(order[0]).toBe(2);
    expect(order.length).toBe(5);
    expect(new Set(order).size).toBe(5);
  });

  test('TC-PL-003: single-track queue yields [0]', () => {
    expect(generateShuffleOrder(1, 0)).toEqual([0]);
  });

  test('TC-PL-004: clamps out-of-range keepFirst', () => {
    const order = generateShuffleOrder(4, 99, () => 0.5);
    expect(order[0]).toBe(3);
  });
});

describe('player-logic — nextIndex / prevIndex', () => {
  test('TC-PL-005: linear next wraps around', () => {
    expect(
      nextIndex({ queueLength: 3, currentIndex: 1, shuffleOrder: [], isShuffle: false })
    ).toBe(2);
    expect(
      nextIndex({ queueLength: 3, currentIndex: 2, shuffleOrder: [], isShuffle: false })
    ).toBe(0);
  });

  test('TC-PL-006: linear prev wraps backward', () => {
    expect(
      prevIndex({ queueLength: 3, currentIndex: 0, shuffleOrder: [], isShuffle: false })
    ).toBe(2);
  });

  test('TC-PL-007: shuffle next/prev follow the shuffle order', () => {
    const shuffleOrder = [1, 3, 0, 2];
    expect(
      nextIndex({ queueLength: 4, currentIndex: 1, shuffleOrder, isShuffle: true })
    ).toBe(3);
    expect(
      nextIndex({ queueLength: 4, currentIndex: 2, shuffleOrder, isShuffle: true })
    ).toBe(1);
    expect(
      prevIndex({ queueLength: 4, currentIndex: 3, shuffleOrder, isShuffle: true })
    ).toBe(1);
  });

  test('TC-PL-008: empty queue stays at 0', () => {
    expect(
      nextIndex({ queueLength: 0, currentIndex: 0, shuffleOrder: [], isShuffle: false })
    ).toBe(0);
  });
});

describe('player-logic — formatPlayerTime', () => {
  test('TC-PL-009: pads seconds', () => {
    expect(formatPlayerTime(65)).toBe('1:05');
    expect(formatPlayerTime(5)).toBe('0:05');
    expect(formatPlayerTime(600)).toBe('10:00');
  });

  test('TC-PL-010: handles negatives and NaN', () => {
    expect(formatPlayerTime(-3)).toBe('0:00');
    expect(formatPlayerTime(Number.NaN)).toBe('0:00');
  });
});
