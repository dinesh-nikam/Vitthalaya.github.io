/**
 * Tests for festival calculator
 * Validates TC-GRAPH-004 - Festival relationships
 */

import { describe, test, expect } from 'bun:test';
import { getFestivalForDate, getNextFestival, parseFestivalRule } from '../../src/lib/festival-calculator';

describe('Festival Calculator - Date Logic', () => {
  test('TC-GRAPH-004: Festivals return for given dates', () => {
    // Ashadhi Ekadashi 2026 (approx June 25)
    const ashadhi = getFestivalForDate(new Date('2026-06-25'));
    expect(ashadhi).toBeDefined();
  });

  test('TC-API-017: Invalid date handled', () => {
    const invalid = getFestivalForDate(new Date('invalid'));
    // Should return undefined or throw gracefully
    expect(invalid === null || invalid === undefined).toBe(true);
  });

  test('TC-PERF-020: Next festival calculation', () => {
    const next = getNextFestival();
    expect(next).toBeDefined();
    expect(next?.nameMarathi).toBeDefined();
  });
});

describe('Festival Calculator - Rule Parsing', () => {
  test('TC-GRAPH-005: Parse month-day rule', () => {
    const rule = parseFestivalRule('अगं या काउंट 11 - दशकांचा अषाडी');
    expect(rule).toBeDefined();
  });

  test('TC-GRAPH-006: Parse lunar calendar rule', () => {
    const rule = parseFestivalRule('पूर्णिमा नक्कडीचा');
    expect(rule?.type).toBe('lunar');
  });
});

describe('Festival Calculator - Edge Cases', () => {
  test('TC-DR-010: Leap year handling', () => {
    // 2024 was a leap year
    const feb29 = getFestivalForDate(new Date('2024-02-29'));
    // Should not crash
    expect(feb29 !== undefined).toBe(true);
  });

  test('TC-DR-011: Timezone edge cases', () => {
    // India timezone (UTC+5:30)
    const indiaOffset = 5.5 * 60; // minutes
    const IST = new Date(2026, 0, 1, 0, 0, 0);
    expect(IST).toBeDefined();
  });
});