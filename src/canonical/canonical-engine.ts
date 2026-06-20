/**
 * Digital Pandharpur — Canonical Engine Orchestrator
 *
 * The central service that coordinates:
 *  1. Finding matches for a composition against existing canonical records
 *  2. Merging compositions into canonical records
 *  3. Creating new canonical records from unmatched compositions
 *  4. Splitting compositions out of canonical records
 *  5. Full reconciliation (batch dedup across all compositions)
 *
 * This service is persistence-agnostic — it delegates DB operations
 * to the canonical DB access layer.
 */

import type {
  MatchResult,
  MatchCandidate,
  MergePayload,
  SplitPayload,
  MergeAction,
  MappingType,
  BatchConfig,
  BatchStats,
  CandidateGroup,
  AlgorithmScore,
} from './types';
import { CONFIDENCE_THRESHOLDS } from './types';
import { computeAllScores, computeTitleScore } from './fuzzy-matcher';
import { computeConfidence, buildMatchResult } from './confidence-score';
import { contentHash, normalizeForComparison } from './normalization';
import type {
  CanonicalRecordData,
  SourceMappingData,
  CompositionSummary,
} from '../db/canonical';

// ─── Engine ─────────────────────────────────────────────────────────────────

export class CanonicalEngine {
  /** Find the best matching canonical records for a composition. */
  findMatches(
    composition: CompositionSummary,
    candidates: CanonicalRecordData[]
  ): MatchResult[] {
    const results: MatchResult[] = [];

    for (const record of candidates) {
      const candidate = this.evaluateCandidate(composition, record);
      if (candidate) results.push(candidate);
    }

    // Sort by confidence descending
    results.sort((a, b) => b.confidence - a.confidence);
    return results;
  }

  /** Find the single best match, or null if none meet the threshold. */
  findBestMatch(
    composition: CompositionSummary,
    candidates: CanonicalRecordData[]
  ): MatchResult | null {
    const matches = this.findMatches(composition, candidates);
    if (matches.length === 0) return null;

    const best = matches[0];
    if (best.confidence < CONFIDENCE_THRESHOLDS.SUGGESTED) return null;
    return best;
  }

  /**
   * Evaluate a single composition against a candidate canonical record.
   * Returns null if the composition has no meaningful match.
   */
  private evaluateCandidate(
    composition: CompositionSummary,
    canonical: CanonicalRecordData
  ): MatchResult | null {
    // Algorithm scores on full text
    const textScores = computeAllScores(composition.fullText, canonical.canonicalText);

    // Check if any algorithm shows signal
    const maxAlgorithmScore = Math.max(...textScores.map((s) => s.score));
    if (maxAlgorithmScore < 0.3) return null; // early exit — no signal

    // Title match score
    const titleScore = computeTitleScore(composition.title, canonical.title);

    // Saint match
    const saintMatch =
      composition.saintId != null &&
      canonical.saintId != null &&
      composition.saintId === canonical.saintId;

    // Type match
    const typeMatch = composition.type === canonical.type;

    const candidate: MatchCandidate = {
      compositionId: composition.id,
      canonicalRecordId: canonical.id,
      algorithmScores: textScores,
      saintMatch,
      typeMatch,
    };

    return buildMatchResult(candidate, composition.title, canonical.title, titleScore);
  }

  /**
   * Determine the merge action based on confidence score and reviewer context.
   */
  determineAction(
    confidence: number,
    isManualOverride: boolean = false
  ): MergeAction {
    if (isManualOverride) return 'manual_merge';
    if (confidence >= CONFIDENCE_THRESHOLDS.AUTO_MERGE) return 'auto_merge';
    if (confidence >= CONFIDENCE_THRESHOLDS.SUGGESTED) return 'suggested_merge';
    return 'auto_reject';
  }

  /**
   * Determine the mapping type based on the merge action.
   */
  determineMappingType(action: MergeAction): MappingType {
    switch (action) {
      case 'auto_merge':
      case 'manual_merge':
        return 'duplicate';
      case 'suggested_merge':
        return 'suspected';
      default:
        return 'suspected';
    }
  }

  /**
   * Prepare batch match data — group compositions into candidate groups
   * against all available canonical records.
   */
  async batchFindMatches(
    compositions: CompositionSummary[],
    canonicalRecords: CanonicalRecordData[],
    config: BatchConfig
  ): Promise<CandidateGroup[]> {
    const groups: CandidateGroup[] = [];
    const minConfidence = config.minConfidence ?? CONFIDENCE_THRESHOLDS.SUGGESTED;

    for (const comp of compositions) {
      const matches = this.findMatches(comp, canonicalRecords)
        .filter((m) => m.confidence >= minConfidence);
      const bestMatch = matches[0] ?? null;

      groups.push({
        compositionId: comp.id,
        title: comp.title,
        candidates: matches,
        bestMatch,
      });

      if (config.verbose && matches.length > 0) {
        console.log(
          `  ${comp.title}: ${matches.length} candidate(s), best = ${bestMatch ? (bestMatch.confidence * 100).toFixed(1) + '%' : 'none'}`
        );
      }
    }

    return groups;
  }

  /**
   * Select the best primary text among source mappings for a canonical record.
   * Uses: longest text (most complete), highest confidence, reviewed sources preferred.
   */
  selectPrimaryText(
    mappings: SourceMappingData[]
  ): SourceMappingData {
    if (mappings.length === 0) throw new Error('No mappings to select primary from');
    if (mappings.length === 1) return mappings[0];

    // Score each mapping: confidence * 0.5 + length bonus * 0.3 + reviewed bonus * 0.2
    const scored = mappings.map((m) => {
      const confidenceScore = m.confidenceScore ?? 0.5;
      const lengthBonus = Math.min(m.sourceText.length / 5000, 1.0);
      const reviewedBonus = m.reviewed ? 0.2 : 0.0;
      return {
        mapping: m,
        score: confidenceScore * 0.5 + lengthBonus * 0.3 + reviewedBonus * 0.2,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].mapping;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const canonicalEngine = new CanonicalEngine();
