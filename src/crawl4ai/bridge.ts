/**
 * Vitthalaya — Crawl4AI REST API Bridge
 *
 * HTTP client for communicating with the Crawl4AI Python backend
 * running in Docker or as a standalone service.
 *
 * Crawl4AI exposes a REST API when running with `crawl4ai-server`:
 *   docker run -p 9876:9876 unclecode/crawl4ai
 *
 * Supports:
 *   - Health checks
 *   - Sync crawling (blocking)
 *   - Async crawling (with job polling)
 *   - Strategy configuration
 *   - Result retrieval
 */

import type { CrawlConfig, CrawlResult, Crawl4AIBridgeConfig } from './types';
import { DEFAULT_BRIDGE_CONFIG } from './types';

export class Crawl4AIBridge {
  private config: Crawl4AIBridgeConfig;
  private healthy = false;
  private lastHealthCheck = 0;

  constructor(config?: Partial<Crawl4AIBridgeConfig>) {
    this.config = { ...DEFAULT_BRIDGE_CONFIG, ...config };
  }

  /**
   * Check if the Crawl4AI server is reachable and healthy.
   */
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.baseUrl}${this.config.healthEndpoint}`, {
        signal: AbortSignal.timeout(5000),
        headers: this.getHeaders(),
      });
      this.healthy = res.ok;
      this.lastHealthCheck = Date.now();
      return this.healthy;
    } catch {
      this.healthy = false;
      return false;
    }
  }

  /**
   * Returns whether the bridge is available (has been healthy recently).
   */
  isAvailable(): boolean {
    // Consider healthy if checked within last 60s
    if (Date.now() - this.lastHealthCheck > 60000) {
      return this.healthy;
    }
    return this.healthy;
  }

  /**
   * Crawl a URL using Crawl4AI server — blocking/sync mode.
   * The server responds once the crawl is complete.
   */
  async crawlSync(
    url: string,
    config?: Partial<CrawlConfig>,
  ): Promise<CrawlResult> {
    const payload = {
      url,
      max_pages: config?.maxPages ?? 10,
      max_depth: config?.maxDepth ?? 1,
      strategy: config?.strategy ?? 'auto',
      render_js: config?.renderJs ?? false,
      extract_markdown: config?.extractMarkdown ?? true,
      extract_metadata: config?.extractMetadata ?? true,
      remove_selectors: config?.selectors?.exclude,
      allowed_domains: config?.allowedPaths,
      excluded_paths: config?.excludedPaths,
      user_agent: config?.userAgent ?? DEFAULT_CRAWL_USER_AGENT,
      timeout: config?.timeoutMs ?? 120000,
    };

    const res = await fetch(`${this.config.baseUrl}/crawl`, {
      method: 'POST',
      headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => 'Unknown error');
      return {
        id: crypto.randomUUID(),
        url,
        status: 'failed',
        strategy: config?.strategy ?? 'auto',
        compositions: [],
        startedAt: new Date().toISOString(),
        error: {
          code: `HTTP_${res.status}`,
          message: `Crawl4AI server error: ${res.status} - ${errorBody.slice(0, 200)}`,
          recoverable: res.status >= 500,
        },
      };
    }

    const data = await res.json() as Crawl4AIResponse;
    return this.mapResponse(data, url, config?.strategy ?? 'auto');
  }

  /**
   * Submit an async crawl job (non-blocking). Returns a job ID.
   */
  async crawlAsync(
    url: string,
    config?: Partial<CrawlConfig>,
  ): Promise<{ jobId: string }> {
    const payload = {
      url,
      max_pages: config?.maxPages ?? 10,
      max_depth: config?.maxDepth ?? 1,
      strategy: config?.strategy ?? 'auto',
      render_js: config?.renderJs ?? false,
    };

    const res = await fetch(`${this.config.baseUrl}/crawl/async`, {
      method: 'POST',
      headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`Failed to submit async crawl: ${res.status}`);
    }

    const data = await res.json() as { job_id: string };
    return { jobId: data.job_id };
  }

  /**
   * Poll the status of an async crawl job.
   */
  async getJobStatus(jobId: string): Promise<{
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: CrawlResult;
  }> {
    const res = await fetch(`${this.config.baseUrl}/crawl/status/${jobId}`, {
      headers: this.getHeaders(),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return { status: 'failed' };
    }

    const data = await res.json() as Crawl4AIJobStatusResponse;
    return {
      status: data.status,
      result: data.result ? this.mapResponse(data.result, '', 'auto') : undefined,
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    return headers;
  }

  private mapResponse(
    data: Crawl4AIResponse,
    url: string,
    strategy: string,
  ): CrawlResult {
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      url: data.url ?? url,
      status: 'completed',
      httpStatus: data.http_status ?? 200,
      strategy: strategy as any,
      content: {
        html: data.raw_html ?? undefined,
        markdown: data.markdown ?? undefined,
        text: data.extracted_text ?? data.markdown ?? '',
        links: data.links ?? [],
        contentHash: this.simpleHash(data.extracted_text ?? data.markdown ?? ''),
        wordCount: (data.extracted_text ?? data.markdown ?? '').split(/\s+/).length,
      },
      compositions: [], // Compositions extracted separately by extractor
      startedAt: now,
      completedAt: now,
      metadata: data.metadata
        ? {
            title: data.metadata.title,
            description: data.metadata.description,
            language: data.metadata.language,
            publishedDate: data.metadata.publish_date,
            canonicalUrl: data.metadata.canonical_url,
          }
        : undefined,
    };
  }

  private simpleHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }
}

// ─── Internal types for Crawl4AI API responses ─────────────────

interface Crawl4AIResponse {
  url?: string;
  http_status?: number;
  markdown?: string;
  extracted_text?: string;
  raw_html?: string;
  links?: string[];
  metadata?: {
    title?: string;
    description?: string;
    language?: string;
    publish_date?: string;
    canonical_url?: string;
    og_image?: string;
    keywords?: string;
  };
  error?: string;
  success: boolean;
}

interface Crawl4AIJobStatusResponse {
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: Crawl4AIResponse;
  error?: string;
}

const DEFAULT_CRAWL_USER_AGENT =
  'Vitthalaya/1.0 (Crawl4AI Acquisition Engine; +https://vitthalaya.org)';
