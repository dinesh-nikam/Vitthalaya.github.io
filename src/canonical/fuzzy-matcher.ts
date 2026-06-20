/**
 * Digital Pandharpur — Fuzzy Matching Algorithms for Marathi Text
 *
 * Implements multiple matching strategies:
 *  - Levenshtein distance (character-level edit distance)
 *  - Jaccard similarity (word set overlap)
 *  - N-gram similarity (character trigrams)
 *  - Line-level matching (for abhang ovi structure comparison)
 *  - Title matching (with Devanagari numeral handling)
 *
 * Each algorithm returns a score normalized to [0.0, 1.0] where
 * 1.0 = perfect match, 0.0 = completely different.
 */

import { normalizeForComparison, tokenize, splitIntoLines } from './normalization';
import type { AlgorithmScore, AlgorithmType } from './types';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Maximum edit distance to consider for Levenshtein-based scoring.
 *  Beyond this, we return 0 without computing (optimization). */
const MAX_EDIT_DISTANCE_RATIO = 0.6;

/** Devanagari numeral pattern for stripping before title comparison */
const DEVANAGARI_NUMERAL_PATTERN = /[०१२३४५६७८९]+/g;

// ─── Levenshtein Distance ───────────────────────────────────────────────────

/**
 * Compute Levenshtein edit distance between two strings.
 * Uses the full matrix DP for small strings (≤200 chars) and
 * an optimized single-row DP for longer strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Quick bounds check
  if (Math.abs(m - n) > m * MAX_EDIT_DISTANCE_RATIO && m > 20 && n > 20) {
    return Math.max(m, n); // too divergent to matter
  }

  // Single-row DP (optimized O(min(m,n)) memory)
  const [shorter, longer] = m < n ? [a, b] : [b, a];
  const [sLen, lLen] = [shorter.length, longer.length];

  let prevRow: number[] = Array.from({ length: sLen + 1 }, (_, i) => i);

  for (let i = 1; i <= lLen; i++) {
    const currRow: number[] = [i];
    for (let j = 1; j <= sLen; j++) {
      const cost = longer[i - 1] === shorter[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1] + 1, // insertion
        prevRow[j] + 1, // deletion
        prevRow[j - 1] + cost // substitution
      );
    }
    prevRow = currRow;
  }

  return prevRow[sLen];
}

/**
 * Levenshtein-based similarity score.
 * 1.0 = identical strings, 0.0 = completely different.
 * Computes: 1 - (editDistance / maxLength)
 */
export function levenshteinSimilarity(a: string, b: string): number {
  const normA = normalizeForComparison(a);
  const normB = normalizeForComparison(b);

  if (normA === normB) return 1.0;
  if (normA.length === 0 || normB.length === 0) return 0.0;

  const maxLen = Math.max(normA.length, normB.length);
  const dist = levenshteinDistance(normA, normB);
  return Math.max(0, 1 - dist / maxLen);
}

// ─── Jaccard Similarity ─────────────────────────────────────────────────────

/**
 * Compute the Jaccard similarity coefficient between two sets.
 * J(A, B) = |A ∩ B| / |A ∪ B|
 */
function jaccardCoefficient(setA: Set<string>, setB: Set<string>): number {
  const union = new Set<string>([...setA, ...setB]);
  if (union.size === 0) return 1.0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  return intersection / union.size;
}

/**
 * Jaccard similarity on word tokens.
 * Measures what fraction of words overlap between two texts.
 */
export function jaccardWordSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.length === 0 && tokensB.length === 0) return 1.0;
  if (tokensA.length === 0 || tokensB.length === 0) return 0.0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  return jaccardCoefficient(setA, setB);
}

/**
 * Jaccard similarity on character n-grams.
 * n=3 (trigrams) is typically best for Devanagari matching.
 */
export function jaccardNgramSimilarity(a: string, b: string, n: number = 3): number {
  const normA = normalizeForComparison(a);
  const normB = normalizeForComparison(b);

  if (normA === normB) return 1.0;
  if (normA.length < n || normB.length < n) {
    // Fall back to levenshtein for very short strings
    return levenshteinSimilarity(normA, normB);
  }

  const ngramsA = extractNgrams(normA, n);
  const ngramsB = extractNgrams(normB, n);

  return jaccardCoefficient(ngramsA, ngramsB);
}

function extractNgrams(text: string, n: number): Set<string> {
  const ngrams = new Set<string>();
  for (let i = 0; i <= text.length - n; i++) {
    ngrams.add(text.slice(i, i + n));
  }
  return ngrams;
}

// ─── Line-Level Matching ────────────────────────────────────────────────────

/**
 * Match two multi-line texts (e.g., abhangs) line by line.
 * For each line in text A, finds the best matching line in text B
 * using Levenshtein similarity. Returns the average of best matches.
 *
 * This is especially useful for abhangs where:
 *  - Some sources may have line splits differently
 *  - The first/last ovi may vary while middle content is identical
 *  - OCR may have dropped/mangled individual lines
 */
export function lineLevelSimilarity(a: string, b: string): number {
  const linesA = splitIntoLines(a);
  const linesB = splitIntoLines(b);

  if (linesA.length === 0 && linesB.length === 0) return 1.0;
  if (linesA.length === 0 || linesB.length === 0) return 0.0;

  // Normalize all lines for comparison
  const normA = linesA.map((l) => normalizeForComparison(l));
  const normB = linesB.map((l) => normalizeForComparison(l));

  // For each line in A, find best match in B (order-independent)
  let totalScore = 0;
  const usedB = new Set<number>();

  for (const lineA of normA) {
    let bestScore = 0;
    let bestIdx = -1;

    for (let j = 0; j < normB.length; j++) {
      if (usedB.has(j)) continue;

      const maxLen = Math.max(lineA.length, normB[j].length);
      if (maxLen === 0) {
        bestScore = 1.0;
        bestIdx = j;
        break;
      }

      const dist = levenshteinDistance(lineA, normB[j]);
      const score = 1 - dist / maxLen;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = j;
      }
    }

    totalScore += bestScore;
    if (bestIdx >= 0) usedB.add(bestIdx);
  }

  return totalScore / normA.length;
}

// ─── Title Matching ─────────────────────────────────────────────────────────

/**
 * Match two titles, with Devanagari numeral stripping.
 * Many abhangs have varying numbering prefixes across sources.
 */
export function titleSimilarity(titleA: string, titleB: string): number {
  // Clean both titles
  const clean = (t: string) =>
    normalizeForComparison(t)
      .replace(DEVANAGARI_NUMERAL_PATTERN, '')
      .replace(/^[\s\-।,]+/, '')
      .replace(/[\s\-।,]+$/, '')
      .trim();

  const a = clean(titleA);
  const b = clean(titleB);

  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;

  // Check substring containment (one title contains the other)
  if (a.includes(b) || b.includes(a)) {
    const shortLen = Math.min(a.length, b.length);
    const longLen = Math.max(a.length, b.length);
    return shortLen / longLen;
  }

  return levenshteinSimilarity(a, b);
}

// ─── Orchestrated Matching ──────────────────────────────────────────────────

/**
 * Run all matching algorithms between two texts and return scored results.
 * Uses weighted combination for a composite score.
 *
 * Algorithm weights (for the composite run — individual scores are raw):
 *  - Levenshtein:  0.35  (character-level precision)
 *  - Jaccard words: 0.20 (word-level semantic overlap)
 *  - N-gram (3):   0.15  (substring robustness)
 *  - Line level:   0.30  (structural match for poetry/abhangs)
 */
export function computeAllScores(
  fullTextA: string,
  fullTextB: string
): AlgorithmScore[] {
  const scores: AlgorithmScore[] = [];

  // Levenshtein (character edit distance)
  const lev = levenshteinSimilarity(fullTextA, fullTextB);
  scores.push({
    algorithm: 'levenshtein',
    score: lev,
    detail: `Edit distance similarity: ${(lev * 100).toFixed(1)}%`,
  });

  // Jaccard word overlap
  const jac = jaccardWordSimilarity(fullTextA, fullTextB);
  scores.push({
    algorithm: 'jaccard_words',
    score: jac,
    detail: `Word overlap (Jaccard): ${(jac * 100).toFixed(1)}%`,
  });

  // N-gram (trigram)
  const ngram = jaccardNgramSimilarity(fullTextA, fullTextB, 3);
  scores.push({
    algorithm: 'ngram_3',
    score: ngram,
    detail: `Trigram similarity: ${(ngram * 100).toFixed(1)}%`,
  });

  // Line-level (for structured text like abhangs)
  const line = lineLevelSimilarity(fullTextA, fullTextB);
  scores.push({
    algorithm: 'line_level',
    score: line,
    detail: `Line-level similarity: ${(line * 100).toFixed(1)}%`,
  });

  return scores;
}

/**
 * Compute title-only match score.
 * Separated from text matching because title comparison follows
 * different rules (numeral stripping, substring detection).
 */
export function computeTitleScore(titleA: string, titleB: string): AlgorithmScore {
  const score = titleSimilarity(titleA, titleB);
  return {
    algorithm: 'title_match',
    score,
    detail: `Title similarity: ${(score * 100).toFixed(1)}%`,
  };
}
