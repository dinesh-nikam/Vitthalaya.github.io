/**
 * Vitthalaya — Self-Healing Crawler Engine
 *
 * When extraction fails or produces low-confidence results,
 * the self-healing engine:
 *   1. Analyzes what went wrong
 *   2. Suggests alternative extraction strategy
 *   3. Retries with new strategy
 *   4. Escalates only if confidence remains low
 *
 * This enables adaptive crawling without manual intervention
 * when source layouts change.
 */

import type { CrawlResult, ExtractionStrategy, SelfHealReport, SelfHealAttempt, CrawlerEngine } from './types';

export class SelfHealingCrawler {
  private engine: CrawlerEngine;
  private maxAttempts = 3;

  constructor(engine: CrawlerEngine) {
    this.engine = engine;
  }

  /**
   * Crawl a URL with automatic self-healing on failure.
   * If the primary strategy fails, falls back through alternative strategies.
   */
  async crawlWithHealing(
    url: string,
    primaryStrategy?: ExtractionStrategy,
    _overrides?: Record<string, unknown>,
  ): Promise<{ result: CrawlResult; healReport?: SelfHealReport }> {
    const startTime = Date.now();
    const attempts: SelfHealAttempt[] = [];

    // Build strategy fallback chain
    const strategies = this.buildStrategyChain(primaryStrategy);

    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      const strategy = strategies[attempt] ?? strategies[strategies.length - 1];
      const attemptStart = Date.now();

      try {
        const result = await this.engine.crawl(url, {
          strategy,
          mode: 'full',
        });

        const attemptResult: SelfHealAttempt = {
          attempt: attempt + 1,
          strategy,
          status: result.status === 'completed' ? 'success' : 'failed',
          durationMs: Date.now() - attemptStart,
          confidence: this.estimateConfidence(result),
        };

        if (result.error) {
          attemptResult.error = result.error.message;
        }

        attempts.push(attemptResult);

        // Check if result is good enough
        if (result.status === 'completed' && attemptResult.confidence >= 0.4) {
          const healReport: SelfHealReport = {
            sourceId: url,
            url,
            originalStrategy: primaryStrategy ?? 'auto',
            attempts,
            resolved: true,
            finalStrategy: strategy,
            durationMs: Date.now() - startTime,
            error: null,
          };

          return { result, healReport };
        }

        // If first attempt failed but we have a result, log the failure details
        if (result.status !== 'completed') {
          attempts[attempts.length - 1].status = 'failed';
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        attempts.push({
          attempt: attempt + 1,
          strategy,
          status: 'failed',
          error: message,
          durationMs: Date.now() - attemptStart,
          confidence: 0,
        });
      }

      // Wait between retries
      if (attempt < this.maxAttempts - 1) {
        await this.sleep(2000 * (attempt + 1)); // Increasing backoff
      }
    }

    // All attempts failed — produce failure report
    const healReport: SelfHealReport = {
      sourceId: url,
      url,
      originalStrategy: primaryStrategy ?? 'auto',
      attempts,
      resolved: false,
      finalStrategy: strategies[strategies.length - 1],
      durationMs: Date.now() - startTime,
      error: `All ${this.maxAttempts} strategies failed for ${url}`,
    };

    return {
      result: {
        id: crypto.randomUUID(),
        url,
        status: 'failed',
        strategy: healReport.finalStrategy,
        compositions: [],
        startedAt: new Date().toISOString(),
        error: {
          code: 'SELF_HEAL_FAILED',
          message: healReport.error!,
          recoverable: false,
        },
      },
      healReport,
    };
  }

  /**
   * Analyze a failed extraction and suggest improvements.
   */
  analyzeFailure(
    result: CrawlResult,
  ): { suggestedStrategy: ExtractionStrategy; reason: string } {
    const error = result.error;
    if (!error) {
      return { suggestedStrategy: 'semantic', reason: 'No error detected' };
    }

    // Analyze error patterns
    if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
      return {
        suggestedStrategy: 'markdown',
        reason: 'Page load timeout — switching to lightweight extraction',
      };
    }

    if (error.message.includes('404') || error.message.includes('not found')) {
      return {
        suggestedStrategy: 'sitemap',
        reason: 'Page not found — checking sitemap for updated URLs',
      };
    }

    if (error.message.includes('DOM') || error.message.includes('selector')) {
      return {
        suggestedStrategy: 'semantic',
        reason: 'DOM structure mismatched — switching to semantic extraction',
      };
    }

    // Default: escalate
    return {
      suggestedStrategy: 'semantic',
      reason: 'Unknown error — escalating to AI extraction strategy',
    };
  }

  /**
   * Build a chain of extraction strategies to try in order.
   */
  private buildStrategyChain(
    primary?: ExtractionStrategy,
  ): ExtractionStrategy[] {
    const preferred = primary ?? 'auto';

    // Order strategies by preference
    const allStrategies: ExtractionStrategy[] = [
      preferred,
      'dom-based',
      'semantic',
      'markdown',
    ];

    // Deduplicate while preserving order
    return [...new Set(allStrategies)];
  }

  /**
   * Estimate the confidence of a crawl result based on content quality.
   */
  private estimateConfidence(result: CrawlResult): number {
    if (result.status !== 'completed' || !result.content) return 0;

    const text = result.content.text;
    if (!text || text.length < 50) return 0.1;

    const hasDevanagari = /[\u0900-\u097F]/.test(text);
    const confidence = result.content.wordCount > 50
      ? (hasDevanagari ? 0.8 : 0.4)
      : 0.2;

    return confidence;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
