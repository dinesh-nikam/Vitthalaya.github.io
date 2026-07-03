/**
 * Vitthalaya — Unified Acquisition Scheduler
 *
 * Central scheduler that orchestrates the full content acquisition lifecycle:
 *   Hourly:   Crawler health checks
 *   Daily:    Source discovery (new sources)
 *   Per-Source: Content crawling based on configured interval
 *   Continuous: Pipeline processing (extract → enrich → dedup → moderate)
 *
 * Integrates with the existing DiscoveryScheduler from src/discovery/
 * and extends it with Crawl4AI-powered acquisition capabilities.
 */

import type { SchedulerConfig, AcquisitionAnalytics, PipelineEvent } from './types';
import { DEFAULT_SCHEDULER_CONFIG } from './types';
import { FetchCrawlerEngine } from './fetch-engine';
import { ContentExtractor } from './content-extractor';
import { ContentSegmenter } from './content-segmenter';
import { MetadataExtractor } from './metadata-extractor';
import { QualityScorer } from './quality-scorer';
import { SelfHealingCrawler } from './self-heal';
import { DiscoveryEngineV2 } from './discovery-engine-v2';
import { SourceRegistry } from '../discovery/source-registry';
import { registerSeedSources } from './seed-sources';
import { AcquisitionPipeline } from './pipeline';

export class UnifiedScheduler {
  private config: SchedulerConfig;
  private running = false;
  private cycleInProgress = false;
  private intervalIds: ReturnType<typeof setInterval>[] = [];
  private startTime: Date | null = null;

  // Engine instances
  private engine!: FetchCrawlerEngine;
  private extractor!: ContentExtractor;
  private segmenter!: ContentSegmenter;
  private metadataExtractor!: MetadataExtractor;
  private qualityScorer!: QualityScorer;
  private selfHealer!: SelfHealingCrawler;
  private discoveryEngine!: DiscoveryEngineV2;
  private pipeline!: AcquisitionPipeline;

  // Event listeners
  private eventListeners: Array<(event: PipelineEvent) => void> = [];

  // Stats
  private totalPagesCrawled = 0;
  private totalCompositionsExtracted = 0;
  private totalDuplicatesFound = 0;
  private lastAnalytics: AcquisitionAnalytics | null = null;

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = { ...DEFAULT_SCHEDULER_CONFIG, ...config };
  }

  /**
   * Initialize all engines and seed sources.
   */
  async initialize(): Promise<void> {
    console.log('[UnifiedScheduler] Initializing acquisition engines...');

    this.engine = new FetchCrawlerEngine({
      minDelayMs: 2000,
      maxDelayMs: 4000,
      respectRobotsTxt: true,
    });

    this.extractor = new ContentExtractor();
    this.segmenter = new ContentSegmenter();
    this.metadataExtractor = new MetadataExtractor();
    this.qualityScorer = new QualityScorer();
    this.selfHealer = new SelfHealingCrawler(this.engine);
    this.discoveryEngine = new DiscoveryEngineV2();
    this.pipeline = new AcquisitionPipeline(
      this.engine,
      this.extractor,
      this.segmenter,
      this.metadataExtractor,
      this.qualityScorer,
      { dryRun: this.config.dryRun },
    );

    // Register seed sources
    if (!this.config.dryRun) {
      await registerSeedSources(this.extractor);
    }

    console.log('[UnifiedScheduler] All engines initialized');
  }

  /**
   * Start the unified scheduler. Idempotent.
   */
  async start(): Promise<void> {
    if (this.running) {
      console.log('[UnifiedScheduler] Already running');
      return;
    }

    this.running = true;
    this.startTime = new Date();
    console.log('[UnifiedScheduler] Starting acquisition engine...');

    await this.initialize();

    // Run initial cycle
    if (this.config.runOnStart) {
      this.runFullCycle().catch((err) => {
        console.error('[UnifiedScheduler] Initial cycle failed:', err);
      });
    }

    // Schedule periodic jobs
    this.scheduleJobs();

    this.emitEvent({
      type: 'crawl-started',
      message: 'UnifiedScheduler started',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Stop the scheduler. Idempotent.
   */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    for (const id of this.intervalIds) {
      clearInterval(id);
    }
    this.intervalIds = [];

    this.engine.destroy().catch(() => {});

    console.log('[UnifiedScheduler] Stopped');
    this.emitEvent({
      type: 'crawl-completed',
      message: 'UnifiedScheduler stopped',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Run a full acquisition cycle.
   * 1. Run source discovery (if enabled)
   * 2. Crawl active sources
   * 3. Run pipeline (extract → segment → quality check → dedup → enrich → moderate)
   * 4. Update search index
   * 5. Run health checks
   */
  async runFullCycle(): Promise<AcquisitionAnalytics> {
    if (this.cycleInProgress) {
      console.warn('[UnifiedScheduler] Cycle already in progress — skipping');
      return this.lastAnalytics ?? this.createEmptyAnalytics();
    }

    this.cycleInProgress = true;
    const cycleId = `cycle_${Date.now()}`;
    const cycleStart = Date.now();

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🔄 ACQUISITION CYCLE [${cycleId}]`);
    console.log(`${'═'.repeat(60)}`);

    try {
      // ─── Phase 1: Source Discovery ────────────────────────
      if (this.config.enableDiscovery) {
        console.log('\n📡 Phase 1: Source Discovery');
        try {
          const templates = this.extractor.getTemplates();
          const candidates = await this.discoveryEngine.discoverCycle(templates);

          if (candidates.length > 0) {
            console.log(`  → ${candidates.length} new source candidates discovered`);
            const results = await this.discoveryEngine.registerCandidates(candidates);
            const registered = results.filter((r) => r.result.success).length;
            console.log(`  → ${registered} new sources registered`);

            this.emitEvent({
              type: 'source-discovered',
              message: `${candidates.length} sources discovered, ${registered} registered`,
              metadata: { candidates: candidates.length, registered },
              timestamp: new Date().toISOString(),
            });
          } else {
            console.log('  → No new sources discovered');
          }
        } catch (err) {
          console.error('[UnifiedScheduler] Discovery phase failed:', err);
        }
      }

      // ─── Phase 2: Crawl Active Sources ────────────────────
      console.log('\n🕸️  Phase 2: Crawling Active Sources');
      let totalCompositions = 0;
      let totalDuplicates = 0;
      let sourcesCrawled = 0;
      let sourcesFailed = 0;

      try {
        const activeSources = await SourceRegistry.getActive();
        console.log(`  → ${activeSources.length} active sources to crawl`);

        for (const source of activeSources) {
          console.log(`\n  Crawling: ${source.name} (${source.url})`);

          try {
            // Run the pipeline for this source
            const result = await this.pipeline.runForSource(source);

            totalCompositions += result.compositionsExtracted;
            totalDuplicates += result.duplicatesFound;

            if (result.status === 'success') {
              sourcesCrawled++;
              console.log(`  ✅ ${result.compositionsExtracted} compositions extracted`);
            } else {
              sourcesFailed++;
            }
          } catch (err) {
            sourcesFailed++;
            console.error(`  ❌ Source ${source.name} failed:`, err);
          }
        }

        this.totalPagesCrawled += sourcesCrawled;
        this.totalCompositionsExtracted += totalCompositions;
        this.totalDuplicatesFound += totalDuplicates;

        console.log(`\n  📊 Crawl complete: ${sourcesCrawled} OK, ${sourcesFailed} failed`);
        console.log(`     ${totalCompositions} compositions, ${totalDuplicates} duplicates`);

        this.emitEvent({
          type: 'extraction-completed',
          message: `Crawl phase: ${sourcesCrawled} sources, ${totalCompositions} compositions`,
          metadata: { sourcesCrawled, sourcesFailed, totalCompositions, totalDuplicates },
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[UnifiedScheduler] Crawl phase failed:', err);
      }

      // ─── Phase 3: Health Checks ───────────────────────────
      if (this.config.enableHealthChecks) {
        console.log('\n❤️  Phase 3: Source Health Checks');
        try {
          const { ScraperMonitor } = await import('../discovery/scraper-monitor');
          const alerts = await ScraperMonitor.getActiveAlerts();
          if (alerts.length > 0) {
            console.log(`  ⚠️  ${alerts.length} active alerts`);
            for (const alert of alerts) {
              console.log(`     [${alert.severity}] ${alert.sourceName}: ${alert.message}`);
            }
          } else {
            console.log('  ✅ All sources healthy');
          }
        } catch (err) {
          console.error('[UnifiedScheduler] Health check failed:', err);
        }
      }

      // Build analytics
      const durationMs = Date.now() - cycleStart;
      this.lastAnalytics = {
        cycleId,
        startedAt: new Date(cycleStart).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs,
        sources: [],
        totals: {
          sourcesChecked: sourcesCrawled + sourcesFailed,
          sourcesSucceeded: sourcesCrawled,
          sourcesFailed,
          urlsCrawled: this.totalPagesCrawled,
          compositionsExtracted: totalCompositions,
          duplicatesFound: totalDuplicates,
          autoApproved: 0,
          sentToModeration: 0,
          qualityPremium: 0,
          qualityStandard: 0,
          qualityDraft: 0,
          qualityReview: 0,
          newSourcesDiscovered: 0,
        },
        errors: [],
      };

      console.log(`\n${'═'.repeat(60)}`);
      console.log(`✅ CYCLE COMPLETE — ${(durationMs / 1000).toFixed(1)}s`);
      console.log(`${'═'.repeat(60)}`);
      console.log(`Sources:    ${sourcesCrawled} OK, ${sourcesFailed} failed`);
      console.log(`Content:    ${totalCompositions} compositions, ${totalDuplicates} duplicates`);

    } catch (err) {
      console.error('[UnifiedScheduler] Cycle failed:', err);
    } finally {
      this.cycleInProgress = false;
    }

    return this.lastAnalytics ?? this.createEmptyAnalytics();
  }

  /**
   * Run a single cycle and return analytics (for CLI one-shot mode).
   */
  async runOnce(): Promise<AcquisitionAnalytics> {
    await this.initialize();
    return this.runFullCycle();
  }

  /**
   * Register event listener.
   */
  onEvent(listener: (event: PipelineEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Get scheduler status.
   */
  getStatus(): {
    running: boolean;
    uptime: string;
    totalPagesCrawled: number;
    totalCompositionsExtracted: number;
    lastAnalytics: AcquisitionAnalytics | null;
    config: SchedulerConfig;
  } {
    const uptime = this.startTime
      ? `${((Date.now() - this.startTime.getTime()) / 1000).toFixed(0)}s`
      : '0s';

    return {
      running: this.running,
      uptime,
      totalPagesCrawled: this.totalPagesCrawled,
      totalCompositionsExtracted: this.totalCompositionsExtracted,
      lastAnalytics: this.lastAnalytics,
      config: this.config,
    };
  }

  // ─── Private ─────────────────────────────────────────────────

  private scheduleJobs(): void {
    if (!this.running) return;

    // Health check: every hour
    if (this.config.enableHealthChecks) {
      const hourly = setInterval(async () => {
        if (!this.running) return;
        console.log('[UnifiedScheduler] Running hourly health check...');
        try {
          const { ScraperMonitor } = await import('../discovery/scraper-monitor');
          const alerts = await ScraperMonitor.getActiveAlerts();
          if (alerts.length > 0) {
            console.log(`[UnifiedScheduler] ${alerts.length} active alerts`);
          }
        } catch (err) {
          console.error('[UnifiedScheduler] Hourly health check failed:', err);
        }
      }, 60 * 60 * 1000);
      this.intervalIds.push(hourly);
    }

    // Discovery: every 24 hours
    if (this.config.enableDiscovery) {
      const daily = setInterval(async () => {
        if (!this.running) return;
        console.log('[UnifiedScheduler] Running daily source discovery...');
        try {
          const templates = this.extractor.getTemplates();
          const candidates = await this.discoveryEngine.discoverCycle(templates);
          if (candidates.length > 0) {
            await this.discoveryEngine.registerCandidates(candidates);
            console.log(`[UnifiedScheduler] ${candidates.length} new sources discovered`);
          }
        } catch (err) {
          console.error('[UnifiedScheduler] Daily discovery failed:', err);
        }
      }, 24 * 60 * 60 * 1000);
      this.intervalIds.push(daily);
    }

    // Full cycle: per config interval
    const cycleInterval = setInterval(async () => {
      if (!this.running) return;
      await this.runFullCycle();
    }, this.config.crawlIntervalHours * 60 * 60 * 1000);
    this.intervalIds.push(cycleInterval);

    console.log(`[UnifiedScheduler] Jobs scheduled:`);
    console.log(`  - Health check: every hour`);
    console.log(`  - Source discovery: every 24 hours`);
    console.log(`  - Full cycle: every ${this.config.crawlIntervalHours} hours`);
  }

  private emitEvent(event: PipelineEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch { /* ignore listener errors */ }
    }
  }

  private createEmptyAnalytics(): AcquisitionAnalytics {
    return {
      cycleId: 'empty',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 0,
      sources: [],
      totals: {
        sourcesChecked: 0, sourcesSucceeded: 0, sourcesFailed: 0,
        urlsCrawled: 0, compositionsExtracted: 0, duplicatesFound: 0,
        autoApproved: 0, sentToModeration: 0,
        qualityPremium: 0, qualityStandard: 0, qualityDraft: 0, qualityReview: 0,
        newSourcesDiscovered: 0,
      },
      errors: [],
    };
  }
}
