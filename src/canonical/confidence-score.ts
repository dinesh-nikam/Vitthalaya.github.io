/**
 * Digital Pandharpur — Confidence Scoring Engine
 *
 * Combines individual algorithm scores with contextual signals
 * (saint match, type match, source diversity) into a single
 * confidence score [0.0, 1.0].
 *
 * Weights are tuned for Marathi devotional content where:
 *  - Full text is the strongest signal (abhangs from different sources
 *    rarely have identical wording unless they are the same composition)
 *  - Saint attribution adds significant weight
 *  - Type mismatch is a strong negative signal
 *  - Source diversity (same abhang from multiple sources) increases confidence
 */

import type { AlgorithmScore, MatchResult, MatchCandidate } from './types';
import { CONFIDENCE_THRESHOLDS } from './types';

// ─── Weights ────────────────────────────────────────────────────────────────

const WEIGHTS = {
  /** Character-level edit distance — most precise for Devanagari text */
  levenshtein: 0.30,
  /** Word set overlap — catches reordering and synonym substitution */
  jaccard_words: 0.15,
  /** Trigram matching — robust against insertion/deletion */
  ngram_3: 0.15,
  /** Line-by-line matching — crucial for abhang structure */
  line_level: 0.25,
  /** Title match — important signal when titles align */
  title_match: 0.15,
} as const;

/** Bonus when both compositions attribute to the same saint */
const SAINT_MATCH_BONUS = 0.08;

/** Penalty when composition types differ */
const TYPE_MISMATCH_PENALTY = -0.15;

/** Bonus when two different source sites agree on the same content */
const SOURCE_DIVERSITY_BONUS = 0.05;

// ─── Scoring ────────────────────────────────────────────────────────────────

/**
 * Compute the weighted composite score from individual algorithm results.
 */
function weightedTextScore(scores: AlgorithmScore[]): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const s of scores) {
    const w = WEIGHTS[s.algorithm as keyof typeof WEIGHTS];
    if (w !== undefined) {
      weightedSum += s.score * w;
      totalWeight += w;
    }
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Compute the final confidence score for a match candidate.
 *
 * Formula:
 *   base = weightedAverage(algorithmScores)
 *   + saintBonus (if saints match)
 *   - typePenalty (if types differ)
 *   + sourceBonus (if different sources)
 *
 * Clamped to [0.0, 1.0].
 */
export function computeConfidence(candidate: MatchCandidate): number {
  let confidence = weightedTextScore(candidate.algorithmScores);

  // Saint match bonus
  if (candidate.saintMatch) {
    confidence += SAINT_MATCH_BONUS;
  }

  // Type mismatch penalty
  if (!candidate.typeMatch) {
    confidence += TYPE_MISMATCH_PENALTY;
  }

  // Clamp to valid range
  return clamp(confidence, 0.0, 1.0);
}

/**
 * Classify a confidence score into an action label.
 */
export function classifyConfidence(score: number): 'auto_merge' | 'suggested' | 'rejected' {
  if (score >= CONFIDENCE_THRESHOLDS.AUTO_MERGE) return 'auto_merge';
  if (score >= CONFIDENCE_THRESHOLDS.SUGGESTED) return 'suggested';
  return 'rejected';
}

/**
 * Build the final MatchResult from a candidate, composition details, and title match score.
 */
export function buildMatchResult(
  candidate: MatchCandidate,
  compositionTitle: string,
  canonicalTitle: string,
  titleScore: AlgorithmScore
): MatchResult {
  const allScores = [...candidate.algorithmScores, titleScore];
  const confidence = computeConfidence(candidate);

  return {
    compositionId: candidate.compositionId,
    canonicalRecordId: candidate.canonicalRecordId,
    confidence,
    autoMerge: confidence >= CONFIDENCE_THRESHOLDS.AUTO_MERGE,
    algorithmScores: allScores,
    saintMatch: candidate.saintMatch,
    typeMatch: candidate.typeMatch,
    summary: buildSummary(confidence, allScores, candidate.saintMatch, candidate.typeMatch),
  };
}

/**
 * Build a human-readable summary of the match decision.
 */
function buildSummary(
  confidence: number,
  scores: AlgorithmScore[],
  saintMatch: boolean,
  typeMatch: boolean
): string {
  const parts: string[] = [];

  const best = scores.reduce((a, b) => (a.score > b.score ? a : b));
  parts.push(`Best algorithm: ${best.algorithm} (${(best.score * 100).toFixed(1)}%)`);

  const label = classifyConfidence(confidence);
  parts.push(`Confidence: ${(confidence * 100).toFixed(1)}% (${label})`);

  if (saintMatch) parts.push('✓ Same saint attribution');
  if (!typeMatch) parts.push('✗ Different composition types');

  return parts.join(' | ');
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
