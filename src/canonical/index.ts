/**
 * Digital Pandharpur — Canonical Engine Public API
 *
 * Barrel exports for the canonical engine module.
 * Import from '@/src/canonical' throughout the codebase.
 */

// Services
export { canonicalEngine, CanonicalEngine } from './canonical-engine';
export { computeConfidence, classifyConfidence, buildMatchResult } from './confidence-score';

// Matching algorithms
export {
  levenshteinSimilarity,
  jaccardWordSimilarity,
  jaccardNgramSimilarity,
  lineLevelSimilarity,
  titleSimilarity,
  computeAllScores,
  computeTitleScore,
} from './fuzzy-matcher';

// Normalization
export {
  normalizeForComparison,
  normalizeForDisplay,
  contentHash,
  splitIntoLines,
  tokenize,
  isMarathiText,
  extractDevanagari,
  getNormalizedForms,
} from './normalization';

// Types
export {
  CONFIDENCE_THRESHOLDS,
} from './types';
export type {
  AlgorithmScore,
  AlgorithmType,
  MatchResult,
  MatchCandidate,
  MergePayload,
  SplitPayload,
  MergeAction,
  MappingType,
  ChangeReason,
  BatchConfig,
  BatchStats,
  CandidateGroup,
} from './types';

// Database access
export {
  getCompositionSummaries,
  getAllCanonicalRecords,
  getCanonicalRecordDetail,
  getCanonicalStats,
  createCanonicalRecord,
  mergeIntoCanonical,
  splitFromCanonical,
  updateCanonicalText,
} from '../db/canonical';
export type {
  CompositionSummary,
  CanonicalRecordData,
  CanonicalRecordDetail,
  CanonicalStats,
  SourceMappingData,
} from '../db/canonical';
