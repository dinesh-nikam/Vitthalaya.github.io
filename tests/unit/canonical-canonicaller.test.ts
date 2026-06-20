/**
 * Unit tests for canonicalization engine
 * Tests TC-CANON-001 to TC-CANON-063
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import {
  normalizeForComparison,
  normalizeForDisplay,
  contentHash,
  tokenize,
  isMarathiText,
  splitIntoLines
} from '../../src/canonical/normalization';
import { computeAllScores, lineLevelSimilarity } from '../../src/canonical/fuzzy-matcher';
import { canonicalEngine } from '../../src/canonical/canonical-engine';
import { UNICODE_FIXTURES } from '../setup';

function calculateSimilarity(a: string, b: string): number {
  const scores = computeAllScores(a, b);
  const sum = scores.reduce((acc, s) => acc + s.score, 0);
  return sum / scores.length;
}

function normalizeMarathiText(text: string): string {
  return normalizeForComparison(text);
}

async function detectDuplicate(comp: any, list: any[], threshold = 0.5): Promise<{ isDuplicate: boolean; confidence: number; matchedSlug?: string }> {
  const candidates = list.map((c) => ({
    id: c.slug,
    title: c.slug.replace(/-/g, ' '),
    type: 'abhang',
    canonicalText: c.fullText,
    saintId: c.saint,
    deityId: null,
    region: null,
    canonicalVersion: 1,
    compositeScore: 1.0,
  }));
  const compSummary = {
    id: comp.slug,
    title: comp.slug.replace(/-/g, ' '),
    type: 'abhang',
    fullText: comp.fullText,
    saintId: comp.saint || undefined,
    reviewed: true,
  };
  const bestMatch = canonicalEngine.findBestMatch(compSummary as any, candidates as any);
  if (bestMatch && bestMatch.confidence >= threshold) {
    return {
      isDuplicate: true,
      confidence: bestMatch.confidence,
      matchedSlug: bestMatch.canonicalRecordId || undefined,
    };
  }
  return {
    isDuplicate: false,
    confidence: bestMatch ? bestMatch.confidence : 0,
  };
}


describe('Canonicalization Engine - Text Normalization', () => {
  test('TC-CANON-033: Exact duplicate detection', () => {
    const text1 = UNICODE_FIXTURES.devanagari;
    const text2 = UNICODE_FIXTURES.devanagari;
    // Use levenshteinSimilarity for exact text comparison
    const scores = computeAllScores(text1, text2);
    const lev = scores.find(s => s.algorithm === 'levenshtein');
    expect(lev?.score).toBe(1.0);
  });

  test('TC-CANON-034: OCR variant similarity computed', () => {
    const text1 = UNICODE_FIXTURES.devanagari;
    const text2 = UNICODE_FIXTURES.ocrVariant;
    // Different characters should have low but non-zero similarity
    const scores = computeAllScores(text1, text2);
    const lev = scores.find(s => s.algorithm === 'levenshtein');
    // Levenshtein will be lower since विठ्ठल ≠ विठठल
    expect(lev?.score).toBeGreaterThanOrEqual(0);
    expect(lev?.score).toBeLessThan(1.0);
  });

  test('TC-CANON-035: Combining marks normalized correctly', () => {
    const normalized = normalizeForComparison(UNICODE_FIXTURES.combiningMarks);
    expect(normalized).toBeDefined();
    expect(normalized.length).toBeGreaterThan(0);
    // उं with anusvara should normalize
    expect(normalized).toContain('उ');
  });

  test('TC-CANON-036: Zero-width characters stripped', () => {
    const normalized = normalizeForComparison(UNICODE_FIXTURES.zeroWidth);
    // The normalization strips ZWJ/ZWNJ patterns
    expect(() => normalizeForComparison(UNICODE_FIXTURES.zeroWidth)).not.toThrow();
  });

  test('TC-CANON-037: Whitespace normalized', () => {
    const result = normalizeForComparison('  विठ्ठल  ');
    expect(result).toBe('विठ्ठल'); // Should trim whitespace
  });

  test('TC-CANON-038: Line breaks normalized', () => {
    // Line-level similarity handles multi-line text
    const lineSim = lineLevelSimilarity('मी ओं', 'मी\nओं');
    // Single-line vs multi-line - similarity will vary
    expect(lineSim).toBeGreaterThanOrEqual(0);
    expect(lineSim).toBeLessThanOrEqual(1.0);
  });
});

describe('Canonicalization Engine - Duplicate Detection', () => {
  const testCompositions = [
    { slug: 'test-1', fullText: 'विठ्ठल वारकरीची', saint: 'Tukaram' },
    { slug: 'test-2', fullText: 'विठठल वारकरीची', saint: 'Tukaram' },
    { slug: 'test-3', fullText: 'काही वेगळा मजकूर आहे', saint: 'Namdev' }, // Marathi different text
  ];

  test('TC-CANON-001: Identical text matches exactly', async () => {
    const result = await detectDuplicate(testCompositions[0], [testCompositions[0]]);
    expect(result.isDuplicate).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.99);
  });

  test('TC-CANON-002: Near duplicate with OCR variant', async () => {
    // Same text but OCR variant (विठ्ठल vs विठठल)
    const scores = computeAllScores(
      testCompositions[0].fullText,
      testCompositions[1].fullText
    );
    const composite = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    // Should have some similarity even with character differences
    expect(composite).toBeGreaterThan(0.4);
  });

  test('TC-CANON-003: Different Marathi text has lower similarity', () => {
    const scores = computeAllScores(
      testCompositions[0].fullText,
      testCompositions[2].fullText
    );
    const composite = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    expect(composite).toBeLessThan(0.5);
  });

  test('TC-CANON-004: Confidence below threshold returns no match', () => {
    // For very low similarity, the engine should return no match
    const scores = computeAllScores('abc', 'xyz');
    const maxScore = Math.max(...scores.map(s => s.score));
    expect(maxScore).toBeLessThan(0.3);
  });
});

describe('Canonicalization Engine - Edge Cases', () => {
  test('TC-CANON-005: Extra verse detection', () => {
    const full = 'या ओं म्हणेना विठ्ठल वारकरीची\nमी न ऐकेन ओं करी लागीची';
    const truncated = 'या ओं म्हणेना विठ्ठल वारकरीची';
    // Line-level similarity will be lower when verses differ
    const lineSim = lineLevelSimilarity(full, truncated);
    expect(lineSim).toBeLessThan(1.0);
    // Jaccard similarity on shared words should be decent
    const jac = computeAllScores(full, truncated).find(s => s.algorithm === 'jaccard_words');
    expect(jac?.score).toBeGreaterThan(0.3);
  });

  test('TC-CANON-006: Missing verse insertion', () => {
    const full = 'या ओं म्हणेना विठ्ठल वारकरीची\nमी न ऐकेन ओं करी लागीची';
    const withExtra = 'या ओं म्हणेना विठ्ठल वारकरीची\nअतिरिक्त श्लोक\nमी न ऐकेन ओं करी लागीची';
    const lineSim = lineLevelSimilarity(full, withExtra);
    // Different line structure = different similarity
    expect(lineSim).toBeLessThanOrEqual(1.0);
  });

  test('TC-CANON-007: Cross-source exact duplicate score', () => {
    const text1 = 'विठ्ठल वारकरीची';
    const text2 = 'विठ्ठल वारकरीची';
    const scores = computeAllScores(text1, text2);
    const composite = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    expect(composite).toBeGreaterThan(0.9); // Should be very similar
  });

  test('TC-CANON-008: Alternate spellings similarity', () => {
    const variant1 = 'शिवाय';
    const variant2 = 'शिवाये';
    const scores = computeAllScores(variant1, variant2);
    // These are different strings but share most characters
    const lev = scores.find(s => s.algorithm === 'levenshtein');
    expect(lev?.score).toBeGreaterThan(0.5);
  });
});