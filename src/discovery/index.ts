/**
 * Digital Pandharpur — Content Discovery Engine
 *
 * Public API for the autonomous content discovery & growth engine.
 */

// Types
export type {
  ContentSource,
  DiscoveryJob,
  SourceType,
  SourceStatus,
  JobType,
  JobStatus,
  JobTrigger,
  TrustTier,
  CreateSourceInput,
  UpdateSourceInput,
  CreateJobInput,
  SourceFilter,
  JobFilter,
  SourceHealth,
  SourceHealthMetrics,
  DiscoveryReport,
  TrustScoreComponents,
  TrustScoreResult,
} from './types';
export { getTrustTier, sourceStatusLabel } from './types';

// Source Registry
export { SourceRegistry } from './source-registry';

// Trust Scoring
export { TrustScorer } from './trust-scorer';

// Discovery Worker
export { DiscoveryWorker } from './discovery-worker';
export type { WorkerResult } from './discovery-worker';

// Scheduler
export { DiscoveryScheduler } from './scheduler';
export type { SchedulerConfig } from './scheduler';

// Health Monitor
export { ScraperMonitor } from './scraper-monitor';
export type { HealthAlert } from './scraper-monitor';
