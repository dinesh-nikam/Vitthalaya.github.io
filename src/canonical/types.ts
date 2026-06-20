/**
 * Digital Pandharpur — Canonicalization Engine Types
 *
 * Type definitions for the Marathi devotional content canonicalization system.
 * Covers: matching results, confidence scores, merge actions, batch configs.
 */

// ─── Matching ───────────────────────────────────────────────────────────────

/** Confidence threshold levels for automated decisions */
export const CONFIDENCE_THRESHOLDS = {
  /** Auto-merge: high confidence match, no human review needed */
  AUTO_MERGE: 0.85,
  /** Suggested: needs human review before merging */
  SUGGESTED: 0.60,
  /** Below this threshold: not considered a match */
  NO_MATCH: 0.60,
} as const;

/** Individual algorithm similarity result */
export interface AlgorithmScore {
  /** Name of the algorithm that produced this score */
  algorithm: AlgorithmType;
  /** Normalized similarity score 0.0 – 1.0 */
  score: number;
  /** Human-readable detail about the match */
  detail: string;
}

/** Supported matching algorithm types */
export type AlgorithmType =
  | 'levenshtein'
  | 'jaccard_words'
  | 'ngram_3'
  | 'line_level'
  | 'title_match';

/** Result of comparing two compositions */
export interface MatchResult {
  /** Source composition ID (the one being checked) */
  compositionId: string;
  /** Candidate canonical record ID */
  canonicalRecordId: string | null;
  /** Pooled confidence score 0.0 – 1.0 */
  confidence: number;
  /** Whether this meets the auto-merge threshold */
  autoMerge: boolean;
  /** Breakdown of individual algorithm scores */
  algorithmScores: AlgorithmScore[];
  /** Saints match (same saint = stronger signal) */
  saintMatch: boolean;
  /** Composition type match */
  typeMatch: boolean;
  /** Human-readable summary */
  summary: string;
}

/** A candidate match before final scoring */
export interface MatchCandidate {
  compositionId: string;
  canonicalRecordId: string;
  algorithmScores: AlgorithmScore[];
  saintMatch: boolean;
  typeMatch: boolean;
}

// ─── Canonical Operations ───────────────────────────────────────────────────

/** Action taken on a merge decision */
export type MergeAction =
  | 'auto_merge'
  | 'suggested_merge'
  | 'manual_merge'
  | 'auto_reject'
  | 'manual_reject'
  | 'split'
  | 'promote';

/** Source mapping type */
export type MappingType =
  | 'primary'
  | 'duplicate'
  | 'variant'
  | 'suspected';

/** Change reason for version tracking */
export type ChangeReason =
  | 'initial'
  | 'merge'
  | 'edit'
  | 'reconciliation'
  | 'revert';

/** Payload for creating a merge between two compositions */
export interface MergePayload {
  /** The composition to merge into canonical */
  compositionId: string;
  /** Target canonical record ID (null = auto-create) */
  canonicalRecordId?: string;
  /** Override confidence score */
  confidence?: number;
  /** Human reviewer override */
  reviewedBy?: string;
  /** Reason for merge */
  reason?: string;
}

/** Payload for splitting a composition out of a canonical record */
export interface SplitPayload {
  /** The source mapping ID to split out */
  mappingId: string;
  /** Reason for splitting */
  reason: string;
  /** Human reviewer */
  reviewedBy?: string;
}

// ─── Batch / CLI ────────────────────────────────────────────────────────────

/** Configuration for a batch dedup run */
export interface BatchConfig {
  /** Composition types to include (empty = all) */
  types?: string[];
  /** Minimum confidence to consider (default: 0.60) */
  minConfidence?: number;
  /** Maximum compositions to process */
  limit?: number;
  /** Skip compositions already linked to a canonical record */
  skipCanonicalized?: boolean;
  /** Dry-run mode (no DB writes) */
  dryRun?: boolean;
  /** Verbose logging */
  verbose?: boolean;
}

/** Statistics for a batch run */
export interface BatchStats {
  totalProcessed: number;
  autoMerged: number;
  suggested: number;
  noMatch: number;
  errors: number;
  skipped: number;
  durationMs: number;
}

/** A single candidate group from batch processing */
export interface CandidateGroup {
  compositionId: string;
  title: string;
  candidates: MatchResult[];
  bestMatch: MatchResult | null;
}

// ─── Migration ──────────────────────────────────────────────────────────────

/** Phase of the migration strategy */
export type MigrationPhase =
  | 'schema_deploy'
  | 'canonical_backfill'
  | 'batch_dedup'
  | 'reconciliation'
  | 'verify';

/** Migration status for a composition */
export interface MigrationStatus {
  compositionId: string;
  hasContentHash: boolean;
  linkedToCanonical: boolean;
  mappingType: MappingType | null;
  confidenceScore: number | null;
  errors: string[];
}
