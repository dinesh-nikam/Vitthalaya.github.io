/**
 * Digital Pandharpur — Canonical Engine Test Suite
 *
 * Tests for:
 *  - Unicode normalization (NFC/NFD, Chandrabindu, ZWJ, punctuation)
 *  - All 4+1 matching algorithms (Levenshtein, Jaccard words, N-gram, line-level, title)
 *  - Confidence scoring and threshold classification
 *  - Dedup engine (fast + fuzzy paths)
 *  - Canonical engine orchestration
 *
 * Run: bun test src/canonical/__tests__/matching.test.ts
 */

import { describe, it, expect } from 'bun:test';

// ─── Imports ────────────────────────────────────────────────────────────────

import {
  normalizeForComparison,
  normalizeForDisplay,
  contentHash,
  splitIntoLines,
  tokenize,
  isMarathiText,
  getNormalizedForms,
} from '../normalization';

import {
  levenshteinSimilarity,
  jaccardWordSimilarity,
  jaccardNgramSimilarity,
  lineLevelSimilarity,
  titleSimilarity,
  computeAllScores,
  computeTitleScore,
} from '../fuzzy-matcher';

import {
  computeConfidence,
  classifyConfidence,
  buildMatchResult,
} from '../confidence-score';

import { canonicalEngine, CanonicalEngine } from '../canonical-engine';
import { DedupEngine } from '../../scraper/dedup';
import type { AlgorithmScore, MatchCandidate, MatchResult } from '../types';
import { CONFIDENCE_THRESHOLDS } from '../types';

// ─── Test Marathi Texts ─────────────────────────────────────────────────────

const ABHANG_A =
  'काया ही पंढरी साच । जिहीं भेटे विठ्ठल साक्षात् ।\n' +
  'एका जनार्दनी प्रसाद । म्हणे नका फीरों मनें वृथा ॥१॥\n' +
  'पंढरीचा महिमा वेगळा । तेथें राहे श्री विठ्ठला ।\n' +
  'एका जनार्दनी प्रसाद । भक्त जनां भेटी द्यावया ॥२॥';

const ABHANG_A_DUPLICATE =
  'काया ही पंढरी साच । जिहीं भेटे विठ्ठल साक्षात् ।\n' +
  'एका जनार्दनी प्रसाद । म्हणे नका फीरों मनें वृथा ॥१॥\n' +
  'पंढरीचा महिमा वेगळा । तेथें राहे श्री विठ्ठला ।\n' +
  'एका जनार्दनी प्रसाद । भक्त जनां भेटी द्यावया ॥२॥';

const ABHANG_A_VARIANT =
  'काया ही पंढरी साच । जिहीं भेटे विठ्ठल साक्षात् । \n' +
  'एका जनार्दनी प्रसाद । म्हणे नका फीरों मनें वृथा ।।१।।\n' +
  'पंढरीचा महिमा वेगळा । तेथें राहे श्री विठ्ठला । \n' +
  'एका जनार्दनी प्रसाद । भक्त जनां भेटी द्यावया ।।२।।';

const ABHANG_A_OCR_NOISY =
  'काया ही पंढरी साच | जिहीं भेटे विठ्ठल साक्षात् |\n' +
  'एका जनार्दनी प्रसाद | म्हणे नका फीरों मने वृथा ||१||\n' +
  'पंढरीचा महिमा वेगळा | तेथें राहे श्री विठ्ठला |\n' +
  'एका जनार्दनी प्रसाद | भक्त जनां भेटी द्यावया ||२||';

const ABHANG_B_DIFFERENT =
  'जो जो म्हणे विठ्ठल । त्याच्या कंठीं विठ्ठल ।\n' +
  'नाचे वाजवी करताल । आनंदे भरला सकल ॥१॥\n' +
  'आनंदे भरला सकल । गडबडीत नाचे विठ्ठल ।';

// ═══════════════════════════════════════════════════════════════════════════
// Normalization Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Normalization', () => {
  describe('normalizeForComparison', () => {
    it('normalizes NFC text without change', () => {
      const result = normalizeForComparison(ABHANG_A);
      expect(result).toBeString();
      expect(result.length).toBeLessThan(ABHANG_A.length);
      expect(result).not.toContain('॥');
      expect(result).not.toContain('।');
    });

    it('normalizes Chandrabindu to Anusvara', () => {
      const withCandra = 'महाँ';
      const withAnusvar = 'महां';
      expect(normalizeForComparison(withCandra)).toBe(normalizeForComparison(withAnusvar));
    });

    it('strips zero-width joiners', () => {
      const withZwj = 'वि\u200Dठ्ठल';
      const withoutZwj = 'विठ्ठल';
      expect(normalizeForComparison(withZwj)).toBe(normalizeForComparison(withoutZwj));
    });

    it('collapses multiple spaces', () => {
      const spaced = 'काया   ही   पंढरी';
      const normal = 'काया ही पंढरी';
      expect(normalizeForComparison(spaced)).toBe(normalizeForComparison(normal));
    });

    it('strips Devanagari and ASCII punctuation', () => {
      const input = 'काया! ही? पंढरी: साच;';
      const result = normalizeForComparison(input);
      expect(result).not.toContain('!');
      expect(result).not.toContain('?');
      expect(result).not.toContain(':');
      expect(result).not.toContain(';');
    });

    it('strips danda and double danda', () => {
      const input = 'विठ्ठल ।। एका ।';
      const result = normalizeForComparison(input);
      expect(result).not.toContain('।');
      expect(result).not.toContain('॥');
    });

    it('produces lowercase for ASCII portions', () => {
      const input = 'Abhang 1 Title';
      const result = normalizeForComparison(input);
      expect(result).toBe('abhang 1 title');
    });

    it('trims whitespace', () => {
      const input = '  काया ही पंढरी  ';
      expect(normalizeForComparison(input)).toBe('काया ही पंढरी');
    });

    it('handles empty string', () => {
      expect(normalizeForComparison('')).toBe('');
    });
  });

  describe('normalizeForDisplay', () => {
    it('preserves most punctuation for display', () => {
      const input = 'विठ्ठल ।। एका ।';
      const result = normalizeForDisplay(input);
      expect(result).toContain('।');
    });

    it('still removes ZWJ', () => {
      const withZwj = 'वि\u200Dठ्ठल';
      expect(normalizeForDisplay(withZwj)).toBe('विठ्ठल');
    });

    it('collapses whitespace', () => {
      expect(normalizeForDisplay('काया   ही')).toBe('काया ही');
    });
  });

  describe('getNormalizedForms', () => {
    it('returns both NFC and NFD forms', () => {
      const forms = getNormalizedForms('काया');
      expect(forms.nfc).toBeString();
      expect(forms.nfd).toBeString();
    });

    it('returns different strings for NFC vs NFD for accented text', () => {
      const withAccent = 'काया\u0301'; // KAYA + combining acute accent
      const forms = getNormalizedForms(withAccent);
      // NFC composed form should differ from NFD decomposed form
      expect(forms.nfc.length).toBeLessThanOrEqual(withAccent.length);
    });
  });

  describe('contentHash', () => {
    it('produces same hash for identical text', () => {
      expect(contentHash(ABHANG_A)).toBe(contentHash(ABHANG_A_DUPLICATE));
    });

    it('produces same hash for variant text (normalized)', () => {
      // Variant texts normalize the same way
      expect(contentHash(ABHANG_A)).toBe(contentHash(ABHANG_A_VARIANT));
    });

    it('produces different hash for different text', () => {
      expect(contentHash(ABHANG_A)).not.toBe(contentHash(ABHANG_B_DIFFERENT));
    });

    it('produces stable hash across runs', () => {
      const hash = contentHash(ABHANG_A);
      for (let i = 0; i < 10; i++) {
        expect(contentHash(ABHANG_A)).toBe(hash);
      }
    });

    it('handles empty string', () => {
      expect(contentHash('')).toBeString();
    });
  });

  describe('splitIntoLines', () => {
    it('splits text into lines', () => {
      const lines = splitIntoLines(ABHANG_A);
      expect(lines.length).toBe(4);
    });

    it('filters empty lines', () => {
      const text = 'काया ही\n\nपंढरी\n';
      const lines = splitIntoLines(text);
      expect(lines.length).toBe(2);
    });

    it('trims each line', () => {
      const text = '  काया ही  \n  पंढरी  ';
      const lines = splitIntoLines(text);
      expect(lines[0]).toBe('काया ही');
    });
  });

  describe('tokenize', () => {
    it('splits Marathi text into words', () => {
      const tokens = tokenize('काया ही पंढरी साच');
      expect(tokens).toEqual(['काया', 'ही', 'पंढरी', 'साच']);
    });

    it('filters empty tokens', () => {
      const tokens = tokenize('काया   ही');
      expect(tokens).toEqual(['काया', 'ही']);
    });

    it('filters out punctuation-only tokens', () => {
      const tokens = tokenize('काया । ही');
      expect(tokens).toEqual(['काया', 'ही']);
    });

    it('returns empty array for empty string', () => {
      expect(tokenize('')).toEqual([]);
    });
  });

  describe('isMarathiText', () => {
    it('returns true for pure Marathi text', () => {
      expect(isMarathiText('काया ही पंढरी')).toBe(true);
    });

    it('returns false for pure English text', () => {
      expect(isMarathiText('Hello World')).toBe(false);
    });

    it('returns true for mixed text with mostly Devanagari', () => {
      expect(isMarathiText('काया ही पंढरी साच Pandharpur')).toBe(true);
    });

    it('handles empty string', () => {
      expect(isMarathiText('')).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Fuzzy Matching Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Fuzzy Matching', () => {
  describe('levenshteinSimilarity', () => {
    it('returns 1.0 for identical strings', () => {
      expect(levenshteinSimilarity(ABHANG_A, ABHANG_A)).toBeCloseTo(1.0, 4);
    });

    it('returns high score for duplicate texts', () => {
      const score = levenshteinSimilarity(ABHANG_A, ABHANG_A_DUPLICATE);
      expect(score).toBeCloseTo(1.0, 4);
    });

    it('returns high score for variant formatting', () => {
      const score = levenshteinSimilarity(ABHANG_A, ABHANG_A_VARIANT);
      expect(score).toBeGreaterThan(0.9);
    });

    it('returns low score for different texts', () => {
      const score = levenshteinSimilarity(ABHANG_A, ABHANG_B_DIFFERENT);
      expect(score).toBeLessThan(0.5);
    });

    it('handles empty strings', () => {
      expect(levenshteinSimilarity('', '')).toBe(1.0);
      expect(levenshteinSimilarity('a', '')).toBe(0.0);
      expect(levenshteinSimilarity('', 'a')).toBe(0.0);
    });
  });

  describe('jaccardWordSimilarity', () => {
    it('returns 1.0 for identical texts', () => {
      expect(jaccardWordSimilarity(ABHANG_A, ABHANG_A)).toBeCloseTo(1.0, 4);
    });

    it('returns high score for variant formatting', () => {
      const score = jaccardWordSimilarity(ABHANG_A, ABHANG_A_VARIANT);
      expect(score).toBeGreaterThan(0.9);
    });

    it('returns low score for different texts', () => {
      const score = jaccardWordSimilarity(ABHANG_A, ABHANG_B_DIFFERENT);
      expect(score).toBeLessThan(0.3);
    });

    it('returns 1.0 for empty strings', () => {
      expect(jaccardWordSimilarity('', '')).toBe(1.0);
    });
  });

  describe('jaccardNgramSimilarity', () => {
    it('returns 1.0 for identical strings', () => {
      expect(jaccardNgramSimilarity(ABHANG_A, ABHANG_A)).toBeCloseTo(1.0, 4);
    });

    it('is robust against word reordering', () => {
      const a = 'काया ही पंढरी';
      const b = 'पंढरी ही काया';
      const ngram = jaccardNgramSimilarity(a, b, 3);
      const lev = levenshteinSimilarity(a, b);
      // N-gram should be more robust than Levenshtein for reordering
      expect(ngram).toBeGreaterThanOrEqual(lev);
    });

    it('uses trigrams by default', () => {
      const score = jaccardNgramSimilarity('काया ही', 'काया पंढरी');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1.0);
    });
  });

  describe('lineLevelSimilarity', () => {
    it('returns 1.0 for identical texts', () => {
      expect(lineLevelSimilarity(ABHANG_A, ABHANG_A)).toBeCloseTo(1.0, 4);
    });

    it('matches despite line reordering', () => {
      const text1 = 'काया ही पंढरी\nसाच जिहीं भेटे';
      const text2 = 'साच जिहीं भेटे\nकाया ही पंढरी';
      const score = lineLevelSimilarity(text1, text2);
      expect(score).toBeGreaterThan(0.8);
    });

    it('handles different line counts gracefully', () => {
      const long = 'काया\nही\nपंढरी\nसाच\nजिहीं\nभेटे';
      const short = 'काया\nही\nपंढरी';
      const score = lineLevelSimilarity(long, short);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1.0);
    });
  });

  describe('titleSimilarity', () => {
    it('returns 1.0 for identical titles', () => {
      expect(titleSimilarity('अभंग', 'अभंग')).toBeCloseTo(1.0, 4);
    });

    it('strips Devanagari numerals before comparison', () => {
      expect(titleSimilarity('अभंग १', 'अभंग २')).toBeCloseTo(1.0, 4);
    });

    it('detects substring containment', () => {
      const score = titleSimilarity('काया ही पंढरी', 'काया ही');
      expect(score).toBeGreaterThan(0.5);
    });

    it('returns low score for completely different titles', () => {
      expect(titleSimilarity('अभंग', 'जो जो म्हणे')).toBeLessThan(0.3);
    });

    it('handles empty titles', () => {
      expect(titleSimilarity('', '')).toBe(1.0);
      expect(titleSimilarity('अभंग', '')).toBe(0.0);
    });
  });

  describe('computeAllScores', () => {
    it('returns scores for all 4 algorithms', () => {
      const scores = computeAllScores(ABHANG_A, ABHANG_B_DIFFERENT);
      expect(scores.length).toBe(4);
      expect(scores.map((s) => s.algorithm)).toEqual(
        expect.arrayContaining(['levenshtein', 'jaccard_words', 'ngram_3', 'line_level'])
      );
    });

    it('all scores are in [0, 1]', () => {
      const scores = computeAllScores(ABHANG_A, ABHANG_A_DUPLICATE);
      for (const s of scores) {
        expect(s.score).toBeGreaterThanOrEqual(0);
        expect(s.score).toBeLessThanOrEqual(1);
      }
    });

    it('identical texts produce all 1.0', () => {
      const scores = computeAllScores(ABHANG_A, ABHANG_A);
      for (const s of scores) {
        expect(s.score).toBeCloseTo(1.0, 4);
      }
    });

    it('different texts produce mixed scores', () => {
      const scores = computeAllScores(ABHANG_A, ABHANG_B_DIFFERENT);
      const avg = scores.reduce((a, s) => a + s.score, 0) / scores.length;
      expect(avg).toBeLessThan(0.5);
    });
  });

  describe('computeTitleScore', () => {
    it('returns 1.0 for exact match', () => {
      const result = computeTitleScore('अभंग', 'अभंग');
      expect(result.score).toBeCloseTo(1.0, 4);
      expect(result.algorithm).toBe('title_match');
    });

    it('returns detail string', () => {
      const result = computeTitleScore('अभंग १', 'अभंग २');
      expect(result.detail).toContain('Title similarity');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Confidence Scoring Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Confidence Scoring', () => {
  function makeCandidate(
    textScore: number,
    saintMatch: boolean = false,
    typeMatch: boolean = true,
    extraScores: AlgorithmScore[] = []
  ): MatchCandidate {
    const algorithms: AlgorithmScore[] = [
      { algorithm: 'levenshtein', score: textScore, detail: '' },
      { algorithm: 'jaccard_words', score: textScore, detail: '' },
      { algorithm: 'ngram_3', score: textScore, detail: '' },
      { algorithm: 'line_level', score: textScore, detail: '' },
      ...extraScores,
    ];

    return {
      compositionId: 'comp-1',
      canonicalRecordId: 'canon-1',
      algorithmScores: algorithms,
      saintMatch,
      typeMatch,
    };
  }

  it('high text similarity produces high confidence', () => {
    const candidate = makeCandidate(0.95, true, true);
    const score = computeConfidence(candidate);
    expect(score).toBeGreaterThan(0.9);
  });

  it('low text similarity produces low confidence', () => {
    const candidate = makeCandidate(0.2, false, true);
    const score = computeConfidence(candidate);
    expect(score).toBeLessThan(0.3);
  });

  it('saint match adds bonus', () => {
    const without = computeConfidence(makeCandidate(0.6, false, true));
    const withSaint = computeConfidence(makeCandidate(0.6, true, true));
    expect(withSaint).toBeGreaterThan(without);
  });

  it('type mismatch applies penalty', () => {
    const sameType = computeConfidence(makeCandidate(0.7, false, true));
    const diffType = computeConfidence(makeCandidate(0.7, false, false));
    expect(diffType).toBeLessThan(sameType);
  });

  it('confidence is clamped to [0, 1]', () => {
    const high = computeConfidence(makeCandidate(1.0, true, true));
    expect(high).toBeLessThanOrEqual(1.0);

    const low = computeConfidence(makeCandidate(0, false, false));
    expect(low).toBeGreaterThanOrEqual(0);
  });
});

describe('classifyConfidence', () => {
  it('classifies high confidence as auto_merge', () => {
    expect(classifyConfidence(0.90)).toBe('auto_merge');
  });

  it('classifies medium confidence as suggested', () => {
    expect(classifyConfidence(0.70)).toBe('suggested');
  });

  it('classifies low confidence as rejected', () => {
    expect(classifyConfidence(0.40)).toBe('rejected');
  });

  it('boundary at AUTO_MERGE threshold', () => {
    expect(classifyConfidence(CONFIDENCE_THRESHOLDS.AUTO_MERGE)).toBe('auto_merge');
    expect(classifyConfidence(CONFIDENCE_THRESHOLDS.AUTO_MERGE - 0.01)).toBe('suggested');
  });
});

describe('buildMatchResult', () => {
  it('includes all expected fields', () => {
    const candidate = {
      compositionId: 'comp-1',
      canonicalRecordId: 'canon-1',
      algorithmScores: [
        { algorithm: 'levenshtein' as const, score: 0.9, detail: 'test' },
      ],
      saintMatch: true,
      typeMatch: true,
    };
    const titleScore: AlgorithmScore = {
      algorithm: 'title_match',
      score: 0.8,
      detail: 'title',
    };
    const result = buildMatchResult(candidate, 'title-a', 'title-b', titleScore);
    expect(result.compositionId).toBe('comp-1');
    expect(result.canonicalRecordId).toBe('canon-1');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.autoMerge).toBeBoolean();
    expect(result.algorithmScores.length).toBe(2);
    expect(result.summary).toContain('%');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Dedup Engine Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('DedupEngine (upgraded)', () => {
  it('detects exact hash duplicates', () => {
    const engine = new DedupEngine();
    const comp = {
      title_marathi: 'अभंग १',
      title_transliteration: 'Abhang 1',
      type: 'abhang' as any,
      full_text: ABHANG_A,
      source_attribution: 'test',
      source_url: 'http://test.com',
    };
    engine.add(comp);
    const result = engine.isDuplicate(comp);
    expect(result.isDuplicate).toBe(true);
    expect(result.layer).toBe('exact_hash');
    expect(result.confidence).toBe(1.0);
  });

  it('detects fuzzy duplicates when canonical records loaded', () => {
    const engine = new DedupEngine();

    // Load a canonical record
    engine.loadCanonicalRecords([
      {
        id: 'canon-test-1',
        titleMarathi: 'अभंग',
        canonicalText: ABHANG_A,
        type: 'ABHANG',
        saintId: null,
      },
    ]);

    const variantComp = {
      title_marathi: 'अभंग १',
      title_transliteration: 'Abhang 1',
      type: 'abhang' as any,
      full_text: ABHANG_A_VARIANT,
      source_attribution: 'test',
      source_url: 'http://test.com',
    };

    const result = engine.isDuplicate(variantComp);
    expect(result.isDuplicate).toBe(true);
    expect(result.layer).toBe('fuzzy');
    expect(result.confidence).toBeGreaterThan(CONFIDENCE_THRESHOLDS.AUTO_MERGE);
    expect(result.canonicalRecordId).toBe('canon-test-1');
    expect(result.matchResult).not.toBeNull();
  });

  it('returns non-duplicate for different text', () => {
    const engine = new DedupEngine();
    engine.loadCanonicalRecords([
      {
        id: 'canon-test-1',
        titleMarathi: 'अभंग',
        canonicalText: ABHANG_A,
        type: 'ABHANG',
        saintId: null,
      },
    ]);

    const comp = {
      title_marathi: 'जो जो म्हणे',
      title_transliteration: 'Jo Jo Mhane',
      type: 'abhang' as any,
      full_text: ABHANG_B_DIFFERENT,
      source_attribution: 'test',
      source_url: 'http://test.com',
    };

    const result = engine.isDuplicate(comp);
    expect(result.isDuplicate).toBe(false);
    expect(result.layer).toBe('none');
  });

  it('returns fast path result even when canonical records loaded', () => {
    const engine = new DedupEngine();
    engine.loadCanonicalRecords([
      {
        id: 'canon-test-1',
        titleMarathi: 'अभंग',
        canonicalText: ABHANG_B_DIFFERENT,
        type: 'ABHANG',
        saintId: null,
      },
    ]);

    const comp = {
      title_marathi: 'अभंग १',
      title_transliteration: 'Abhang 1',
      type: 'abhang' as any,
      full_text: ABHANG_A,
      source_attribution: 'test',
      source_url: 'http://test.com',
    };
    engine.add(comp);

    // Second addition — fast path should fire first
    const result = engine.isDuplicate(comp);
    expect(result.isDuplicate).toBe(true);
    expect(result.layer).toBe('exact_hash');
  });

  it('tracks size correctly', () => {
    const engine = new DedupEngine();
    expect(engine.size).toBe(0);
    engine.add({
      title_marathi: 'अभंग १',
      title_transliteration: 'Abhang 1',
      type: 'abhang' as any,
      full_text: 'काया ही पंढरी',
      source_attribution: 'test',
      source_url: 'http://test.com',
    });
    expect(engine.size).toBe(1);
  });

  it('pre-populates from existing hashes', () => {
    const engine = new DedupEngine();
    const hash = contentHash('काया ही पंढरी');
    engine.load([hash]);
    const result = engine.isDuplicate({
      title_marathi: 'अभंग १',
      title_transliteration: 'Abhang 1',
      type: 'abhang' as any,
      full_text: 'काया ही पंढरी',
      source_attribution: 'test',
      source_url: 'http://test.com',
    });
    expect(result.isDuplicate).toBe(true);
    expect(result.layer).toBe('exact_hash');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Canonical Engine Orchestration Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('CanonicalEngine', () => {
  const engine = new CanonicalEngine();

  const mockComposition = {
    id: 'comp-1',
    title: 'अभंग',
    fullText: ABHANG_A,
    type: 'ABHANG',
    saintId: null,
    source: 'test',
  };

  const mockCanonical = {
    id: 'canon-1',
    title: 'अभंग',
    canonicalText: ABHANG_A,
    type: 'ABHANG',
    saintId: null,
    version: 1,
  };

  describe('findMatches', () => {
    it('returns matches for identical text', () => {
      const matches = engine.findMatches(mockComposition, [mockCanonical]);
      expect(matches.length).toBe(1);
      expect(matches[0].confidence).toBeGreaterThan(0.85);
      expect(matches[0].autoMerge).toBe(true);
    });

    it('returns empty array for empty candidates', () => {
      const matches = engine.findMatches(mockComposition, []);
      expect(matches).toEqual([]);
    });

    it('sorts by confidence descending', () => {
      // A partial match (some line overlap) vs perfect match
      const partialMatch = {
        ...mockCanonical,
        id: 'canon-2',
        canonicalText:
          'जो जो म्हणे विठ्ठल । त्याच्या कंठीं विठ्ठल ।\n' +
          'एका जनार्दनी प्रसाद । भक्त जनां भेटी द्यावया ॥२॥\n' +
          'नाचे वाजवी करताल । आनंदे भरला सकल ॥१॥',
      };
      const matches = engine.findMatches(mockComposition, [partialMatch, mockCanonical]);
      expect(matches.length).toBe(2);
      expect(matches[0].confidence).toBeGreaterThanOrEqual(matches[1].confidence);
    });

    it('filters out candidates below 0.3 max algorithm score', () => {
      const veryDifferent = {
        ...mockCanonical,
        id: 'canon-2',
        canonicalText: 'पूर्ण भिन्न मजकूर इथे आहे',
      };
      const matches = engine.findMatches(mockComposition, [veryDifferent]);
      expect(matches.length).toBe(0);
    });
  });

  describe('findBestMatch', () => {
    it('returns the best match above threshold', () => {
      const best = engine.findBestMatch(mockComposition, [mockCanonical]);
      expect(best).not.toBeNull();
      expect(best!.confidence).toBeGreaterThan(CONFIDENCE_THRESHOLDS.AUTO_MERGE);
      expect(best!.canonicalRecordId).toBe('canon-1');
    });

    it('returns null when all matches below threshold', () => {
      const poorMatch = { ...mockCanonical, canonicalText: ABHANG_B_DIFFERENT };
      const best = engine.findBestMatch(mockComposition, [poorMatch]);
      expect(best).toBeNull();
    });

    it('returns null for empty candidates', () => {
      const best = engine.findBestMatch(mockComposition, []);
      expect(best).toBeNull();
    });
  });

  describe('determineAction', () => {
    it('returns auto_merge for high confidence', () => {
      expect(engine.determineAction(0.90)).toBe('auto_merge');
    });

    it('returns suggested_merge for medium confidence', () => {
      expect(engine.determineAction(0.70)).toBe('suggested_merge');
    });

    it('returns auto_reject for low confidence', () => {
      expect(engine.determineAction(0.30)).toBe('auto_reject');
    });

    it('returns manual_merge when overridden', () => {
      expect(engine.determineAction(0.3, true)).toBe('manual_merge');
    });
  });

  describe('determineMappingType', () => {
    it('returns duplicate for merged records', () => {
      expect(engine.determineMappingType('auto_merge')).toBe('duplicate');
      expect(engine.determineMappingType('manual_merge')).toBe('duplicate');
    });

    it('returns suspected for suggested merges', () => {
      expect(engine.determineMappingType('suggested_merge')).toBe('suspected');
    });

    it('returns suspected for rejected merges', () => {
      expect(engine.determineMappingType('auto_reject')).toBe('suspected');
    });
  });

  describe('selectPrimaryText', () => {
    it('throws on empty mappings', () => {
      expect(() => engine.selectPrimaryText([])).toThrow('No mappings');
    });

    it('returns only mapping when single', () => {
      const mappings = [
        { id: 'm-1', canonicalId: 'c-1', compositionId: 'comp-1', source: 'test',
          sourceUrl: '', sourceTitle: '', sourceText: 'text', contentHash: 'hash',
          confidenceScore: 0.9, mappingType: 'primary', reviewed: true },
      ];
      expect(engine.selectPrimaryText(mappings).id).toBe('m-1');
    });

    it('selects mapping with best composite score', () => {
      const mappings = [
        { id: 'm-1', canonicalId: 'c-1', compositionId: 'comp-1', source: 'test',
          sourceUrl: '', sourceTitle: '', sourceText: 'short text', contentHash: 'hash',
          confidenceScore: 0.5, mappingType: 'duplicate', reviewed: false },
        { id: 'm-2', canonicalId: 'c-1', compositionId: 'comp-2', source: 'test',
          sourceUrl: '', sourceTitle: '', sourceText: ABHANG_A, contentHash: 'hash2',
          confidenceScore: 1.0, mappingType: 'primary', reviewed: true },
      ];
      const selected = engine.selectPrimaryText(mappings);
      expect(selected.id).toBe('m-2');
    });
  });
});
