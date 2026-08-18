import { describe, expect, test } from 'bun:test';
import { normalizeCompositionType } from '@/src/canonical/normalization';

describe('normalizeCompositionType', () => {
  test('maps lowercase English to canonical enum', () => {
    expect(normalizeCompositionType('abhang')).toBe('ABHANG');
    expect(normalizeCompositionType('bhajan')).toBe('BHAJAN');
    expect(normalizeCompositionType('aarti')).toBe('AARTI');
    expect(normalizeCompositionType('stotra')).toBe('STOTRA');
  });

  test('maps mixed-case and dashed values', () => {
    expect(normalizeCompositionType('Abhang')).toBe('ABHANG');
    expect(normalizeCompositionType('Haripath')).toBe('HARIPATH');
    expect(normalizeCompositionType('Powada')).toBe('POWADA');
  });

  test('maps Marathi aliases', () => {
    expect(normalizeCompositionType('आरती')).toBe('AARTI');
    expect(normalizeCompositionType('भजन')).toBe('BHAJAN');
    expect(normalizeCompositionType('अभंग')).toBe('ABHANG');
    expect(normalizeCompositionType('स्तोत्र')).toBe('STOTRA');
  });

  test('falls back to OTHER for unknown values', () => {
    expect(normalizeCompositionType('weird-type')).toBe('OTHER');
    expect(normalizeCompositionType('')).toBe('OTHER');
    expect(normalizeCompositionType(null)).toBe('OTHER');
    expect(normalizeCompositionType(undefined)).toBe('OTHER');
  });
});
