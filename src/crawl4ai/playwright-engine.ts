/**
 * Vitthalaya — Playwright-Powered Crawl4AI-Style Crawler Engine
 *
 * Primary crawling engine that uses Playwright (already installed) to
 * implement Crawl4AI-style extraction strategies:
 *   - DOM-based extraction (CSS selectors)
 *   - Semantic extraction (AI-assisted text analysis)
 *   - Markdown extraction
 *   - Sitemap-based extraction
 *   - Recursive/deep crawling
 *
 * This is the workhorse engine — functional immediately without Python/Crawl4AI.
 * Works alongside Crawl4AI Bridge when Docker backend is available.
 */

import { chromium, type Browser, type Page } from 'playwright';
import type {
  CrawlConfig,
  CrawlResult,
  ExtractedContent,
  ExtractionStrategy,
  ContentSelectors,
  CrawlerEngine,
} from './types';
import { DEFAULT_CRAWL_CONFIG } from './types';

export class PlaywrightCrawlerEngine implements CrawlerEngine {
  private config: CrawlConfig;
  private browser: Browser | null = null;
  private pagesCrawled = 0;
  private startTime = 0;

  constructor(config?: Partial<CrawlConfig>) {
    this.config = { ...DEFAULT_CRAWL_CONFIG, ...config };
  }

  /**
   * Initialize the browser instance.
   * Connects to an existing Chrome instance or launches a new one.
   */
  async initialize(): Promise<void> {
    if (this.browser) return;
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
  }

  /**
   * Close the browser and clean up.
   */
  async destroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }

  /**
   * Crawl a single URL with auto-detected or specified strategy.
   */
  async crawl(
    url: string,
    overrides?: Partial<CrawlConfig>,
  ): Promise<CrawlResult> {
    const config = { ...this.config, ...overrides };
    this.startTime = Date.now();
    const crawlId = crypto.randomUUID();
    const startedAt = new Date().toISOString();

    await this.initialize();

    const context = await this.browser!.newContext({
      userAgent: config.userAgent,
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();

    try {
      // Set timeout
      page.setDefaultTimeout(config.timeoutMs);

      // Navigate
      const response = await page.goto(url, {
        waitUntil: config.renderJs ? 'networkidle' : 'domcontentloaded',
        timeout: config.timeoutMs,
      });

      const httpStatus = response?.status() ?? 0;

      // Detect strategy if auto
      const strategy = config.strategy === 'auto'
        ? await this.detectStrategy(page, url)
        : config.strategy;

      // Wait for content to stabilize
      if (config.renderJs) {
        await page.waitForTimeout(2000);
      }

      // Extract content based on strategy
      const extractedContent = await this.extractByStrategy(page, strategy, config.selectors);

      // Extract page metadata
      const metadata = config.extractMetadata
        ? await this.extractPageMetadata(page)
        : undefined;

      // Get all links for future crawling
      const links = config.mode === 'deep'
        ? await this.extractLinks(page, url)
        : [];

      this.pagesCrawled++;

      const result: CrawlResult = {
        id: crawlId,
        url,
        status: 'completed',
        httpStatus,
        strategy,
        content: extractedContent,
        compositions: [], // Compositions are extracted by content-extractor separately
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - this.startTime,
        metadata,
      };

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        id: crawlId,
        url,
        status: 'failed',
        strategy: config.strategy,
        compositions: [],
        startedAt,
        error: {
          code: 'CRAWL_FAILED',
          message,
          recoverable: this.isRecoverableError(err),
        },
      };
    } finally {
      await context.close();
    }
  }

  /**
   * Crawl multiple URLs (respecting rate limits).
   */
  async crawlBatch(
    urls: string[],
    overrides?: Partial<CrawlConfig>,
  ): Promise<CrawlResult[]> {
    const results: CrawlResult[] = [];
    for (const url of urls) {
      const result = await this.crawl(url, overrides);
      results.push(result);
      // Rate limiting
      const delay = this.randomDelay();
      if (delay > 0) await this.sleep(delay);
    }
    return results;
  }

  /**
   * Recursively crawl starting from a seed URL up to maxDepth.
   */
  async crawlDeep(
    seedUrl: string,
    maxDepth: number = this.config.maxDepth,
  ): Promise<CrawlResult[]> {
    const results: CrawlResult[] = [];
    const visited = new Set<string>();
    const queue: Array<{ url: string; depth: number }> = [
      { url: seedUrl, depth: 0 },
    ];

    while (queue.length > 0 && results.length < this.config.maxPages) {
      const { url, depth } = queue.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);

      const result = await this.crawl(url, { ...this.config, mode: depth === 0 ? 'full' : 'deep' });
      results.push(result);

      // If successful and not at max depth, queue discovered links
      if (result.status === 'completed' && depth < maxDepth && result.content) {
        const newLinks = result.content.links
          .filter((link) => !visited.has(link) && link.startsWith('http'))
          .slice(0, this.config.maxPages - results.length);

        for (const link of newLinks) {
          if (!queue.some((q) => q.url === link)) {
            queue.push({ url: link, depth: depth + 1 });
          }
        }
      }

      // Rate limiting between requests
      const delay = this.randomDelay();
      if (delay > 0) await this.sleep(delay);
    }

    return results;
  }

  // ─── Extraction Strategies ───────────────────────────────────

  /**
   * Auto-detect the best extraction strategy for a page.
   */
  private async detectStrategy(page: Page, url: string): Promise<ExtractionStrategy> {
    // Check if it's a sitemap
    if (url.includes('sitemap') || url.endsWith('.xml')) {
      return 'sitemap';
    }

    // Get page content type
    const contentType = await page.evaluate(() => document.contentType || '');

    // Check existing scrapers / known patterns via URL
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }

    // Check if page has well-structured content with headings
    const hasStructure = await page.evaluate(() => {
      const headings = document.querySelectorAll('h1, h2, h3');
      const paragraphs = document.querySelectorAll('p, pre, blockquote');
      return headings.length >= 1 && paragraphs.length >= 1;
    });

    // Check for Devanagari/Marathi text presence
    const hasMarathi = await page.evaluate(() => {
      const text = document.body?.innerText || '';
      // Match Devanagari Unicode range
      const devanagariRegex = /[\u0900-\u097F]/;
      return devanagariRegex.test(text);
    });

    if (hasMarathi && hasStructure) return 'semantic';
    if (hasStructure) return 'dom-based';
    return 'markdown';
  }

  /**
   * Extract content using the selected strategy.
   */
  private async extractByStrategy(
    page: Page,
    strategy: ExtractionStrategy,
    selectors?: ContentSelectors,
  ): Promise<ExtractedContent> {
    switch (strategy) {
      case 'dom-based':
        return this.extractDOM(page, selectors);
      case 'semantic':
        return this.extractSemantic(page);
      case 'markdown':
        return this.extractMarkdown(page);
      case 'sitemap':
        return this.extractSitemap(page);
      default:
        return this.extractMarkdown(page);
    }
  }

  /**
   * DOM-based extraction using CSS selectors.
   */
  private async extractDOM(
    page: Page,
    selectors?: ContentSelectors,
  ): Promise<ExtractedContent> {
    const result = await page.evaluate((sel) => {
      const titleEl = sel?.title
        ? document.querySelector(sel.title)
        : document.querySelector('h1');
      const bodyEl = sel?.body
        ? document.querySelector(sel.body)
        : document.querySelector('article, main, .content, .entry-content, pre');
      const container = sel?.container
        ? document.querySelector(sel.container)
        : document.body;

      // Get all links
      const links = Array.from(document.querySelectorAll('a[href]'))
        .map((a) => (a as HTMLAnchorElement).href)
        .filter((href) => href.startsWith('http'));

      // Clean text content
      const fullText = container?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

      // Remove excluded elements
      if (sel?.exclude) {
        for (const excl of sel.exclude) {
          const elements = container?.querySelectorAll(excl);
          elements?.forEach((el) => {
            el.remove();
          });
        }
      }

      return {
        title: titleEl?.textContent?.trim() ?? null,
        body: bodyEl?.innerHTML ?? null,
        text: container?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        links,
      };
    }, selectors);

    return {
      html: result.body ?? undefined,
      text: result.text,
      links: result.links ?? [],
      contentHash: this.hashContent(result.text),
      wordCount: result.text.split(/\s+/).length,
    };
  }

  /**
   * Semantic extraction — identifies meaningful content blocks.
   */
  private async extractSemantic(page: Page): Promise<ExtractedContent> {
    return page.evaluate(() => {
      // Remove script, style, nav, footer, header
      const clone = document.body.cloneNode(true) as HTMLElement;
      const removeSelectors = ['script', 'style', 'nav', 'footer', 'header', '.sidebar', '#sidebar', '.menu', '.nav', '.ads', '.advertisement'];
      for (const sel of removeSelectors) {
        clone.querySelectorAll(sel).forEach((el) => el.remove());
      }

      // Extract meaningful text blocks
      const textBlocks: string[] = [];
      const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT, null);
      let node: Text | null;
      while ((node = walker.nextNode() as Text | null)) {
        const text = node.textContent?.trim();
        if (text && text.length > 20) {
          textBlocks.push(text);
        }
      }

      const fullText = textBlocks.join('\n\n');

      // Get all links
      const links = Array.from(document.querySelectorAll('a[href]'))
        .map((a) => (a as HTMLAnchorElement).href)
        .filter((href) => href.startsWith('http'));

      return {
        text: fullText,
        links: [...new Set(links)],
        contentHash: simpleHash(fullText),
        wordCount: fullText.split(/\s+/).length,
      };
    });
  }

  /**
   * Markdown-based extraction.
   */
  private async extractMarkdown(page: Page): Promise<ExtractedContent> {
    // Simple markdown-like extraction from DOM
    return page.evaluate(() => {
      const clone = document.body.cloneNode(true) as HTMLElement;
      // Remove non-content elements
      const removeSelectors = ['script', 'style', 'nav', 'footer', '.sidebar', '.nav', '.ads'];
      for (const sel of removeSelectors) {
        clone.querySelectorAll(sel).forEach((el) => el.remove());
      }

      const parts: string[] = [];

      // Process headings
      clone.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => {
        const level = el.tagName[1];
        const text = el.textContent?.trim();
        if (text) parts.push(`${'#'.repeat(parseInt(level))} ${text}`);
      });

      // Process paragraphs
      clone.querySelectorAll('p, pre, blockquote, li').forEach((el) => {
        const text = el.textContent?.trim();
        if (text && text.length > 10) {
          if (el.tagName === 'BLOCKQUOTE') {
            parts.push(`> ${text}`);
          } else {
            parts.push(text);
          }
        }
      });

      const markdown = parts.join('\n\n');
      const links = Array.from(document.querySelectorAll('a[href]'))
        .map((a) => (a as HTMLAnchorElement).href)
        .filter((href) => href.startsWith('http'));

      return {
        text: markdown,
        markdown,
        links: [...new Set(links)],
        contentHash: simpleHash(markdown),
        wordCount: markdown.split(/\s+/).length,
      };
    });
  }

  /**
   * Sitemap XML extraction.
   */
  private async extractSitemap(page: Page): Promise<ExtractedContent> {
    const text = await page.evaluate(() => document.body?.textContent ?? '');
    // Extract URLs from sitemap XML text
    const urlMatches = text.match(/<loc>(https?:\/\/[^<]+)<\/loc>/g);
    const links = urlMatches
      ? urlMatches.map((m) => m.replace(/<\/?loc>/g, '').trim())
      : [];

    return {
      text,
      links: [...new Set(links)],
      contentHash: this.hashContent(text),
      wordCount: text.split(/\s+/).length,
    };
  }

  /**
   * Extract all links from a page.
   */
  private async extractLinks(page: Page, baseUrl: string): Promise<string[]> {
    return page.evaluate((base) => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const urls = links.map((a) => {
        try {
          return new URL((a as HTMLAnchorElement).href, base).href;
        } catch {
          return null;
        }
      }).filter((u): u is string => u !== null && u.startsWith('http'));

      return [...new Set(urls)];
    }, baseUrl);
  }

  /**
   * Extract page metadata.
   */
  private async extractPageMetadata(page: Page): Promise<Record<string, any>> {
    return page.evaluate(() => {
      const getMeta = (name: string): string | null => {
        const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
        return el?.getAttribute('content') ?? null;
      };

      return {
        title: document.title || null,
        description: getMeta('description') || getMeta('og:description'),
        keywords: getMeta('keywords')?.split(',').map((k) => k.trim()) ?? [],
        language: document.documentElement.lang || null,
        canonicalUrl: getMeta('og:url') || document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href || null,
        ogImage: getMeta('og:image'),
        contentType: document.contentType || null,
      };
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────

  /**
   * Determine if an error is recoverable (can be retried).
   */
  private isRecoverableError(err: unknown): boolean {
    const message = err instanceof Error ? err.message : String(err);
    const recoverablePatterns = [
      'timeout',
      'ETIMEDOUT',
      'ECONNRESET',
      'net::ERR_CONNECTION_',
      'net::ERR_TIMED_OUT',
      'net::ERR_ABORTED',
      'net::ERR_DNS_',
      '429',
      '503',
      '502',
    ];
    return recoverablePatterns.some((p) => message.includes(p));
  }

  /**
   * Generate a random delay between min and max.
   */
  private randomDelay(): number {
    const min = this.config.minDelayMs;
    const max = this.config.maxDelayMs;
    // Add ±30% jitter
    const base = min + Math.random() * (max - min);
    const jitter = base * 0.3 * (Math.random() * 2 - 1);
    return Math.max(100, Math.round(base + jitter));
  }

  /**
   * Simple content hash for dedup.
   */
  private hashContent(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get crawl stats for monitoring.
   */
  getStats(): { pagesCrawled: number; uptimeMs: number } {
    return {
      pagesCrawled: this.pagesCrawled,
      uptimeMs: this.startTime > 0 ? Date.now() - this.startTime : 0,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Inline helper that also exists in Playwright page.evaluate context
function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
