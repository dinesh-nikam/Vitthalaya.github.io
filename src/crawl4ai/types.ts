/**
 * Vitthalaya — Crawl4AI Powered Acquisition Engine Types
 *
 * Core type definitions for the autonomous content acquisition platform.
 * Mirrors Crawl4AI concepts with Vitthalaya-specific extensions.
 */

// ─── Crawl Configuration ───────────────────────────────────────

export type ExtractionStrategy =
  | 'semantic'       // AI-assisted extraction using LLM
  | 'dom-based'      // CSS selector / XPath based extraction
  | 'markdown'       // Markdown conversion extraction
  | 'sitemap'        // Sitemap-based URL discovery + extraction
  | 'rss'            // RSS/Atom feed based extraction
  | 'llm'            // Full LLM-powered extraction
  | 'ocr'            // Image/PDF OCR extraction
  | 'youtube'        // YouTube transcript extraction
  | 'auto';          // Auto-detect best strategy

export type CrawlMode =
  | 'full'          // Full page crawl
  | 'incremental'   // Only new/changed content
  | 'deep'          // Recursive deep crawl
  | 'health-check'; // Simple connectivity check

export type CrawlPriority = 'critical' | 'high' | 'medium' | 'low';

export type CrawlStatus = 'queued' | 'running' | 'completed' | 'failed' | 'skipped' | 'retrying';

/**
 * Common interface for all crawler engines.
 * Both PlaywrightCrawlerEngine and FetchCrawlerEngine implement this.
 */
export interface CrawlerEngine {
  initialize(): Promise<void>;
  crawl(url: string, overrides?: Partial<CrawlConfig>): Promise<CrawlResult>;
  crawlBatch(urls: string[], overrides?: Partial<CrawlConfig>): Promise<CrawlResult[]>;
  crawlDeep(seedUrl: string, maxDepth?: number): Promise<CrawlResult[]>;
  destroy(): Promise<void>;
  getStats(): { pagesCrawled: number; uptimeMs: number };
}

export interface CrawlConfig {
  /** Max pages to crawl per run */
  maxPages: number;
  /** Max crawl depth for recursive crawling */
  maxDepth: number;
  /** Extraction strategy to use */
  strategy: ExtractionStrategy;
  /** Strategy-specific options */
  strategyOptions?: Record<string, unknown>;
  /** CSS selectors for DOM-based extraction */
  selectors?: ContentSelectors;
  /** Crawl mode */
  mode: CrawlMode;
  /** Minimum delay between requests (ms) */
  minDelayMs: number;
  /** Maximum delay between requests (ms) */
  maxDelayMs: number;
  /** Request timeout (ms) */
  timeoutMs: number;
  /** Whether to respect robots.txt */
  respectRobotsTxt: boolean;
  /** User agent string */
  userAgent: string;
  /** Whether to render JavaScript */
  renderJs: boolean;
  /** Whether to extract markdown */
  extractMarkdown: boolean;
  /** Whether to extract screenshots */
  extractScreenshots: boolean;
  /** Whether to extract metadata */
  extractMetadata: boolean;
  /** Page content chunk size for LLM extraction */
  chunkSize?: number;
  /** Chunk overlap */
  chunkOverlap?: number;
  /** Allowed URL patterns (globs) */
  allowedPaths?: string[];
  /** Excluded URL patterns (globs) */
  excludedPaths?: string[];
  /** Custom headers */
  headers?: Record<string, string>;
}

export interface ContentSelectors {
  /** Selector for composition title */
  title?: string;
  /** Selector for composition text/lyrics */
  body?: string;
  /** Selector for composition meaning */
  meaning?: string;
  /** Selector for saint name */
  saint?: string;
  /** Selector for deity name */
  deity?: string;
  /** Selector for the main content container */
  container?: string;
  /** Selector to exclude/navigate away */
  exclude?: string[];
  /** Selector for next page link */
  nextPage?: string;
  /** Selector for individual composition items in a list */
  item?: string;
}

// ─── Default Configuration ─────────────────────────────────────

export const DEFAULT_CRAWL_CONFIG: CrawlConfig = {
  maxPages: 100,
  maxDepth: 2,
  strategy: 'auto',
  mode: 'full',
  minDelayMs: 2000,
  maxDelayMs: 4000,
  timeoutMs: 30000,
  respectRobotsTxt: true,
  userAgent: 'Vitthalaya/1.0 (Crawl4AI Acquisition Engine; +https://vitthalaya.org)',
  renderJs: false,
  extractMarkdown: true,
  extractScreenshots: false,
  extractMetadata: true,
};

// ─── Crawl Result ──────────────────────────────────────────────

export interface CrawlResult {
  /** Unique crawl ID */
  id: string;
  /** Source URL that was crawled */
  url: string;
  /** Crawl status */
  status: CrawlStatus;
  /** HTTP status code */
  httpStatus?: number;
  /** Strategy used */
  strategy: ExtractionStrategy;
  /** Extracted page content */
  content?: ExtractedContent;
  /** All extracted compositions from this page */
  compositions: ExtractedComposition[];
  /** Error information */
  error?: CrawlError;
  /** Page metadata */
  metadata?: PageMetadata;
  /** Timestamps */
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  /** Screenshot (base64) if enabled */
  screenshot?: string;
}

export interface ExtractedContent {
  /** Raw HTML (if available) */
  html?: string;
  /** Clean markdown */
  markdown?: string;
  /** Clean text without markup */
  text: string;
  /** Extracted links found on page */
  links: string[];
  /** Content hash for deduplication */
  contentHash: string;
  /** Word count */
  wordCount: number;
  /** Detected language(s) */
  detectedLanguages?: string[];
}

export interface ExtractedComposition {
  /** Composition title in Marathi */
  titleMarathi: string;
  /** Romanized/transliterated title */
  titleTranslit?: string;
  /** Composition type (abhang, aarti, bhajan, etc.) */
  type?: string;
  /** Full text/lyrics */
  fullText: string;
  /** Meaning/explanation text */
  meaning?: string;
  /** Saint name in Marathi */
  saintNameMarathi?: string;
  /** Saint name in transliteration */
  saintNameTranslit?: string;
  /** Deity name in Marathi */
  deityNameMarathi?: string;
  /** Deity name in transliteration */
  deityNameTranslit?: string;
  /** Source attribution */
  sourceAttribution: string;
  /** Source URL */
  sourceUrl: string;
  /** Region */
  region?: string;
  /** Language code */
  language: string;
  /** Festival(s) associated */
  festivals?: string[];
  /** Category/categories */
  categories?: string[];
  /** Quality score (0-1) */
  qualityScore?: number;
  /** Extraction confidence (0-1) */
  confidence: number;
  /** Line/chapter reference */
  bookReference?: string;
  /** Verse numbers */
  verseNumbers?: string;
  /** Already existing composition ID if duplicate */
  existingCompositionId?: string;
  /** Additional metadata */
  metadata?: Record<string, string>;
}

export interface CrawlError {
  code: string;
  message: string;
  recoverable: boolean;
  details?: string;
}

export interface PageMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  publishedDate?: string;
  language?: string;
  charset?: string;
  ogImage?: string;
  canonicalUrl?: string;
  contentType?: string;
  contentLength?: number;
}

// ─── Quality Scoring ───────────────────────────────────────────

export interface QualityScore {
  overall: number;
  components: QualityComponents;
  tier: QualityTier;
  recommendation: string;
}

export interface QualityComponents {
  /** Text completeness (0-1) — has full text, not truncated */
  completeness: number;
  /** OCR quality (0-1) — 1.0 for non-OCR, lower for OCR'd text */
  ocrScore: number;
  /** Metadata completeness (0-1) — has saint, deity, type, etc. */
  metadataScore: number;
  /** Uniqueness/duplicate score (0-1) — 1.0 = unique */
  duplicateScore: number;
  /** Source trustworthiness (0-1) */
  sourceTrustScore: number;
  /** Text quality (0-1) — no garbled text, proper Unicode, etc. */
  textQuality: number;
}

export type QualityTier = 'premium' | 'standard' | 'draft' | 'review';

// ─── Source Discovery ──────────────────────────────────────────

export interface DiscoveryCandidate {
  url: string;
  title?: string;
  domain: string;
  discoveredAt: string;
  discoveryMethod: DiscoveryMethod;
  trustEstimate: number;
  contentType?: string;
  estimatedCompositionCount?: number;
  reason?: string;
}

export type DiscoveryMethod =
  | 'search-engine'
  | 'sitemap'
  | 'link-crawl'
  | 'rss-feed'
  | 'community-tip'
  | 'public-archive'
  | 'cross-reference'
  | 'manual'
  | 'related-domain';

// ─── Extraction Template ───────────────────────────────────────

export interface CrawlerTemplate {
  /** Template name/identifier */
  name: string;
  /** Domain pattern this template applies to (glob) */
  domainPattern: string;
  /** Human-readable description */
  description: string;
  /** Extraction strategy */
  strategy: ExtractionStrategy;
  /** CSS selectors if DOM-based */
  selectors?: ContentSelectors;
  /** Strategy-specific configuration */
  strategyConfig?: Record<string, unknown>;
  /** Whether this source has multiple compositions per page */
  multiComposition: boolean;
  /** Content chunking / segmentation config */
  segmentation?: SegmentationConfig;
  /** Licensing info default */
  defaultLicense?: string;
  /** Attribution template (use {url}, {domain}) */
  attributionTemplate?: string;
  /** Staleness check — re-crawl if older than this (hours) */
  recrawlAfterHours: number;
  /** Trust score multiplier for this template */
  trustMultiplier: number;
}

export interface SegmentationConfig {
  /** How to detect individual composition boundaries */
  boundaryStrategy: 'heading' | 'separator' | 'numbering' | 'regex' | 'ai';
  /** Regex pattern for boundary detection (if regex strategy) */
  boundaryPattern?: string;
  /** Heading tag/selector for heading strategy */
  headingSelector?: string;
  /** Separator string for separator strategy */
  separator?: string;
  /** Minimum composition length (chars) */
  minLength: number;
  /** Maximum composition length (chars) */
  maxLength?: number;
}

// ─── Pipeline Events & Monitoring ──────────────────────────────

export interface PipelineEvent {
  type:
    | 'source-discovered'
    | 'crawl-started'
    | 'crawl-completed'
    | 'crawl-failed'
    | 'extraction-completed'
    | 'duplicate-found'
    | 'composition-extracted'
    | 'quality-checked'
    | 'enrichment-queued'
    | 'moderation-submitted'
    | 'moderation-approved'
    | 'moderation-rejected'
    | 'published'
    | 'search-indexed'
    | 'error'
    | 'self-heal';
  sourceId?: string;
  compositionId?: string;
  url?: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

// ─── Analytics ─────────────────────────────────────────────────

export interface AcquisitionAnalytics {
  cycleId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  sources: AnalyticsSourceSummary[];
  totals: AnalyticsTotals;
  errors: AnalyticsError[];
}

export interface AnalyticsSourceSummary {
  sourceId: string;
  sourceName: string;
  domain: string;
  status: 'success' | 'failed' | 'skipped';
  urlsCrawled: number;
  compositionsExtracted: number;
  duplicatesFound: number;
  autoApproved: number;
  sentToModeration: number;
  durationMs: number;
  error?: string;
}

export interface AnalyticsTotals {
  sourcesChecked: number;
  sourcesSucceeded: number;
  sourcesFailed: number;
  urlsCrawled: number;
  compositionsExtracted: number;
  duplicatesFound: number;
  autoApproved: number;
  sentToModeration: number;
  qualityPremium: number;
  qualityStandard: number;
  qualityDraft: number;
  qualityReview: number;
  newSourcesDiscovered: number;
}

export interface AnalyticsError {
  sourceId: string;
  sourceName: string;
  url?: string;
  error: string;
  recoverable: boolean;
  timestamp: string;
}

// ─── Scheduler ─────────────────────────────────────────────────

export interface SchedulerConfig {
  /** How often to run discovery cycle (hours) */
  discoveryIntervalHours: number;
  /** How often to crawl active sources (hours) */
  crawlIntervalHours: number;
  /** Run on start */
  runOnStart: boolean;
  /** Max concurrent crawlers */
  maxConcurrency: number;
  /** Whether to enable self-healing */
  enableSelfHeal: boolean;
  /** Whether to do health checks hourly */
  enableHealthChecks: boolean;
  /** Whether to enable source discovery */
  enableDiscovery: boolean;
  /** Whether to index after crawl */
  enableSearchIndexing: boolean;
  /** Whether to process enrichment automatically */
  enableAutoEnrichment: boolean;
  /** Dry run — no DB writes */
  dryRun: boolean;
}

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  discoveryIntervalHours: 24,
  crawlIntervalHours: 6,
  runOnStart: true,
  maxConcurrency: 3,
  enableSelfHeal: true,
  enableHealthChecks: true,
  enableDiscovery: true,
  enableSearchIndexing: true,
  enableAutoEnrichment: true,
  dryRun: false,
};

// ─── Crawl4AI Bridge ───────────────────────────────────────────

export interface Crawl4AIBridgeConfig {
  /** Crawl4AI REST API base URL */
  baseUrl: string;
  /** Request timeout (ms) */
  timeoutMs: number;
  /** Max retries on failure */
  maxRetries: number;
  /** Health check endpoint */
  healthEndpoint: string;
  /** API key if required */
  apiKey?: string;
}

export const DEFAULT_BRIDGE_CONFIG: Crawl4AIBridgeConfig = {
  baseUrl: 'http://localhost:9876',
  timeoutMs: 120000,
  maxRetries: 2,
  healthEndpoint: '/health',
};

// ─── Self-Healing ──────────────────────────────────────────────

export interface SelfHealReport {
  sourceId: string;
  url: string;
  originalStrategy: ExtractionStrategy;
  attempts: SelfHealAttempt[];
  resolved: boolean;
  finalStrategy: ExtractionStrategy;
  durationMs: number;
  error: string | null;
}

export interface SelfHealAttempt {
  attempt: number;
  strategy: ExtractionStrategy;
  status: 'success' | 'failed';
  error?: string;
  durationMs: number;
  confidence: number;
}

// ─── Content Quality Engine ────────────────────────────────────

export interface ContentQualityReport {
  compositionId?: string;
  sourceId: string;
  url: string;
  score: QualityScore;
  issues: QualityIssue[];
  suggestions: string[];
  passed: boolean;
}

export interface QualityIssue {
  severity: 'critical' | 'major' | 'minor' | 'info';
  category: QualityIssueCategory;
  message: string;
  field?: string;
  value?: string;
}

export type QualityIssueCategory =
  | 'missing-title'
  | 'missing-text'
  | 'truncated-text'
  | 'garbled-text'
  | 'missing-saint'
  | 'missing-type'
  | 'no-marathi-content'
  | 'too-short'
  | 'suspected-duplicate'
  | 'low-confidence'
  | 'incomplete-metadata'
  | 'ocr-artifacts'
  | 'encoding-issues'
  | 'mixed-language';
