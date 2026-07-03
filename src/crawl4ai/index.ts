/**
 * Vitthalaya — Crawl4AI Powered Acquisition Engine
 *
 * Public API for the autonomous content acquisition platform.
 * All components re-exported from a single entry point.
 */

// ─── Types ────────────────────────────────────────────────────

export type {
  ExtractionStrategy,
  CrawlMode,
  CrawlPriority,
  CrawlStatus,
  CrawlConfig,
  ContentSelectors,
  CrawlResult,
  ExtractedContent,
  ExtractedComposition,
  CrawlError,
  PageMetadata,
  QualityScore,
  QualityComponents,
  QualityTier,
  QualityIssue,
  ContentQualityReport,
  DiscoveryCandidate,
  DiscoveryMethod,
  CrawlerTemplate,
  SegmentationConfig,
  PipelineEvent,
  AcquisitionAnalytics,
  SchedulerConfig,
  SelfHealReport,
  Crawl4AIBridgeConfig,
} from './types';

export { DEFAULT_CRAWL_CONFIG, DEFAULT_SCHEDULER_CONFIG, DEFAULT_BRIDGE_CONFIG } from './types';

// ─── Crawling Engines ─────────────────────────────────────────

export { PlaywrightCrawlerEngine } from './playwright-engine';
export { FetchCrawlerEngine } from './fetch-engine';
export { Crawl4AIBridge } from './bridge';
export { SelfHealingCrawler } from './self-heal';
export type { CrawlerEngine } from './types';

// ─── Extraction Pipeline ──────────────────────────────────────

export { ContentExtractor } from './content-extractor';
export { ContentSegmenter } from './content-segmenter';
export { MetadataExtractor } from './metadata-extractor';
export type { ExtractedMetadata } from './metadata-extractor';
export { QualityScorer } from './quality-scorer';

// ─── Pipeline ─────────────────────────────────────────────────

export { AcquisitionPipeline } from './pipeline';
export type { PipelineResult, PipelineConfig } from './pipeline';

// ─── Discovery ────────────────────────────────────────────────

export { DiscoveryEngineV2 } from './discovery-engine-v2';

// ─── Scheduler ────────────────────────────────────────────────

export { UnifiedScheduler } from './scheduler';

// ─── Seed Sources ─────────────────────────────────────────────

export { registerSeedSources, getSeedSources } from './seed-sources';
export type { SeedSourceConfig } from './seed-sources';
