/**
 * Digital Pandharpur — Community Contribution System
 *
 * Phase 1: User system + CorrectionSuggestion + CompositionVersion + VerificationRecord
 *
 * Barrel exports for the community module.
 */

export {
  createCorrection,
  submitCorrection,
  withdrawCorrection,
  startReview,
  reviewCorrection,
  batchApproveCorrections,
  listCorrections,
  getCorrection,
  getCorrectionStats,
} from './corrections';

export type {
  SubmitCorrectionInput,
  ReviewCorrectionInput,
  CorrectionListOptions,
} from './corrections';

export {
  createCompositionVersion,
  listCompositionVersions,
  getCompositionVersion,
  diffVersions,
  seedInitialVersion,
} from './versions';

export type { CreateVersionInput } from './versions';

export {
  getVerificationRecord,
  recalculateVerification,
  getVerificationStats,
  calculateTrustScore,
} from './verification';

export type { VerificationFactors } from './verification';
