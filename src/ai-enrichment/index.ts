/**
 * Digital Pandharpur — AI Enrichment Pipeline Public API
 */

// Prompts
export {
  buildFullEnrichmentPrompt,
  buildSummaryPrompt,
  buildKeywordsPrompt,
  buildReEnrichPrompt,
  buildBatchContext,
  SYSTEM_PROMPT_MARATHI,
  SYSTEM_PROMPT_ENGLISH,
} from './prompts';

// Enricher
export {
  enrichComposition,
  reEnrichWithFeedback,
  resolveDeityId,
  resolveFestivalIds,
  resolveCategoryNames,
} from './enricher';
export type {
  EnrichmentInput,
  EnrichmentOutput,
  EnrichmentResult,
} from './enricher';

// Queue
export {
  enqueueComposition,
  dequeueJob,
  processJob,
  workCycle,
  drainQueue,
  getQueueStats,
  retryFailedJobs,
} from './queue';
export type {
  JobStatus,
  EnqueueOptions,
  JobInfo,
  QueueStats,
} from './queue';

// Batch
export {
  enqueueBatch,
  processWithConcurrency,
  runBatchPipeline,
} from './batch';
export type {
  BatchEnrichOptions,
  BatchEnrichResult,
} from './batch';

// Free Provider
export {
  resolveFreeConfig,
  checkFreeProviders,
  printProviderStatus,
} from './free-provider';
export type {
  FreeProvider,
} from './free-provider';

// Review
export {
  processReview,
  batchApprove,
  getPendingReviews,
  reEnrichWithEditorFeedback,
} from './review';
export type {
  ReviewAction,
  ReviewResult,
} from './review';
