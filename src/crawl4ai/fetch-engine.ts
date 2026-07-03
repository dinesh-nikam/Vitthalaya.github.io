/**
 * Vitthalaya — Lightweight HTTP Fetch Crawler Engine
 *
 * Drop-in replacement for PlaywrightCrawlerEngine that uses plain HTTP fetch
 * + regex-based HTML-to-text extraction. Works on any platform without a
 * browser binary. Supports DOM, markdown, semantic, and sitemap strategies.
 *
 * Trade-off: No JS rendering. For static HTML pages this is faster and
 * more reliable. Falls back gracefully when Playwright is unavailable.
 */

import type {
  CrawlConfig,
  CrawlResult,
  ExtractedContent,
  ExtractionStrategy,
  CrawlerEngine,
} from './types';
import { DEFAULT_CRAWL_CONFIG } from './types';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Vitthalaya/1.0';

export class FetchCrawlerEngine implements CrawlerEngine {
  private config: CrawlConfig;
  private pagesCrawled = 0;
  private startTime = 0;
  private destroyed = false;

  constructor(config?: Partial<CrawlConfig>) {
    this.config = { ...DEFAULT_CRAWL_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    // No-op for fetch engine — nothing to initialize
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
  }

  async crawl(
    url: string,
    overrides?: Partial<CrawlConfig>,
  ): Promise<CrawlResult> {
    const config = { ...this.config, ...overrides };
    this.startTime = Date.now();
    const crawlId = crypto.randomUUID();
    const startedAt = new Date().toISOString();

    try {
      // Determine strategy
      const strategy = config.strategy === 'auto'
        ? this.detectStrategy(url)
        : config.strategy;

      // Fetch the page
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'mr,en-US;q=0.9,en;q=0.8',
        },
        redirect: 'follow',
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return {
          id: crawlId,
          url,
          status: 'failed',
          httpStatus: response.status,
          strategy,
          compositions: [],
          startedAt,
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - this.startTime,
          error: {
            code: 'HTTP_ERROR',
            message: `HTTP ${response.status} ${response.statusText}`,
            recoverable: response.status >= 500 || response.status === 429,
          },
        };
      }

      const html = await response.text();
      const contentType = response.headers.get('content-type') ?? '';

      // Extract content based on strategy
      const extractedContent = this.extractByStrategy(html, url, strategy, contentType);

      this.pagesCrawled++;

      return {
        id: crawlId,
        url,
        status: 'completed',
        httpStatus: response.status,
        strategy,
        content: extractedContent,
        compositions: [],
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - this.startTime,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        id: crawlId,
        url,
        status: 'failed',
        strategy: config.strategy,
        compositions: [],
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - this.startTime,
        error: {
          code: 'FETCH_FAILED',
          message,
          recoverable: this.isRecoverableError(err),
        },
      };
    }
  }

  async crawlBatch(
    urls: string[],
    overrides?: Partial<CrawlConfig>,
  ): Promise<CrawlResult[]> {
    const results: CrawlResult[] = [];
    for (const url of urls) {
      const result = await this.crawl(url, overrides);
      results.push(result);
      const delay = this.randomDelay();
      if (delay > 0) await this.sleep(delay);
    }
    return results;
  }

  async crawlDeep(
    seedUrl: string,
    maxDepth: number = this.config.maxDepth,
  ): Promise<CrawlResult[]> {
    const results: CrawlResult[] = [];
    const visited = new Set<string>();
    const queue: Array<{ url: string; depth: number }> = [
      { url: seedUrl, depth: 0 },
    ];

    while (queue.length > 0 && results.length < this.config.maxPages && !this.destroyed) {
      const { url, depth } = queue.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);

      const result = await this.crawl(url, { ...this.config, mode: depth === 0 ? 'full' : 'deep' });
      results.push(result);

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

      const delay = this.randomDelay();
      if (delay > 0) await this.sleep(delay);
    }

    return results;
  }

  getStats(): { pagesCrawled: number; uptimeMs: number } {
    return {
      pagesCrawled: this.pagesCrawled,
      uptimeMs: this.startTime > 0 ? Date.now() - this.startTime : 0,
    };
  }

  // ─── Strategy Detection ──────────────────────────────────

  private detectStrategy(url: string): ExtractionStrategy {
    if (url.includes('sitemap') || url.endsWith('.xml')) return 'sitemap';
    return 'semantic';
  }

  // ─── Extraction Strategies ───────────────────────────────

  private extractByStrategy(
    html: string,
    url: string,
    strategy: ExtractionStrategy,
    _contentType: string,
  ): ExtractedContent {
    // Domain-specific handlers — use when the auto-detected strategy fails
    // to extract meaningful content from known site structures.
    if (strategy === 'auto' || strategy === 'semantic') {
      const wikisourceResult = this.tryExtractWikisource(html, url);
      if (wikisourceResult) return wikisourceResult;
    }
    switch (strategy) {
      case 'sitemap':
        return this.extractSitemap(html);
      case 'dom-based':
        return this.extractDOM(html, url);
      case 'markdown':
        return this.extractMarkdown(html);
      case 'semantic':
      default:
        return this.extractSemantic(html, url);
    }
  }

  /**
   * DOM-based extraction: targets known content containers via heuristics.
   */
  private extractDOM(html: string, url: string): ExtractedContent {
    const text = this.stripHtml(html);
    const links = this.extractLinks(html, url);

    return {
      text,
      html: this.trimHtml(html),
      links,
      contentHash: this.hashContent(text),
      wordCount: text.split(/\s+/).length,
    };
  }

  /**
   * Semantic extraction: strips navigation/UI elements, keeps meaningful text.
   */
  private extractSemantic(html: string, url: string): ExtractedContent {
    // Remove known non-content elements via regex
    let cleaned = html;
    const noisePatterns = [
      /<script[\s\S]*?<\/script>/gi,
      /<style[\s\S]*?<\/style>/gi,
      /<nav[\s\S]*?<\/nav>/gi,
      /<footer[\s\S]*?<\/footer>/gi,
      /<header[\s\S]*?<\/header>/gi,
      /<aside[\s\S]*?<\/aside>/gi,
      /\.(?:sidebar|menu|nav|ads|advertisement)[\s\S]*?<\/div>/gi,
      /<noscript[\s\S]*?<\/noscript>/gi,
      /<svg[\s\S]*?<\/svg>/gi,
      /<!--[\s\S]*?-->/g,
    ];
    for (const pattern of noisePatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    // Extract text from meaningful block elements
    // NOTE: Tag name MUST be a capturing group for the \1 backreference to work
    const blockPattern = /<(p|div|article|section|main|pre|blockquote|h[1-6]|li|td|th)[^>]*>([\s\S]*?)<\/\1>/gi;
    const blocks: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = blockPattern.exec(cleaned)) !== null) {
      const text = this.stripHtml(match[2]).trim();
      if (text && text.length > 20) {
        blocks.push(text);
      }
    }

    const fullText = blocks.join('\n\n');
    const links = this.extractLinks(html, url);

    return {
      text: fullText,
      links,
      contentHash: this.hashContent(fullText),
      wordCount: fullText.split(/\s+/).length,
    };
  }

  /**
   * Wikisource-specific extraction: targets MediaWiki HTML structure.
   * Returns null if the page isn't Wikisource or content can't be found.
   */
  private tryExtractWikisource(html: string, url: string): ExtractedContent | null {
    if (!url.includes('wikisource.org')) return null;

    // Find the main content container: prefer mw-parser-output inside mw-content-text
    // We use a nesting-aware approach: find mw-parser-output, then count <div> opens
    // and closes to find its matching close tag — avoiding the lazy-repeat bug
    // that truncated content at the first 3 </div>s.
    const contentOpenMatch = html.match(/<div[^>]*(?:id="mw-content-text"|class="mw-parser-output")[^>]*>/i);
    if (!contentOpenMatch) return null;

    const openIdx = contentOpenMatch.index! + contentOpenMatch[0].length;
    let depth = 1; // we are inside the matched opening div
    let closeIdx = -1;
    // Search within reasonable bounds (next 200KB)
    const searchEnd = Math.min(openIdx + 200_000, html.length);
    let pos = openIdx;
    while (pos < searchEnd && depth > 0) {
      const nextOpen = html.indexOf('<div', pos);
      const nextClose = html.indexOf('</div>', pos);
      if (nextClose < 0 || (nextOpen >= 0 && nextOpen < nextClose)) {
        // Opening div
        depth++;
        pos = nextOpen + 4;
      } else if (nextClose >= 0) {
        // Closing div
        depth--;
        if (depth === 0) {
          closeIdx = nextClose;
        }
        pos = nextClose + 6;
      } else {
        break;
      }
    }

    if (closeIdx < 0) return null;

    const contentHtml = html.substring(openIdx, closeIdx);

    // Strip scripts/styles from the extracted content
    let cleaned = contentHtml
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // Extract text from block elements
    const blockPattern = /<(p|div|li|h[1-6]|pre|blockquote|td|th)[^>]*>([\s\S]*?)<\/\1>/gi;
    const blocks: string[] = [];
    let bm: RegExpExecArray | null;
    while ((bm = blockPattern.exec(cleaned)) !== null) {
      const text = this.stripHtml(bm[2]).trim();
      if (text && text.length > 15) {
        blocks.push(text);
      }
    }

    // Also try old-style Wikisource format where text is inside <div class="poem">
    if (blocks.length === 0) {
      const poemMatch = cleaned.match(/<div[^>]*class="poem[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      if (poemMatch) {
        const text = this.stripHtml(poemMatch[1]).trim();
        if (text) blocks.push(text);
      }
    }

    if (blocks.length > 0) {
      const fullText = blocks.join('\n\n');
      const links = this.extractLinks(html, url);
      return {
        text: fullText,
        links,
        contentHash: this.hashContent(fullText),
        wordCount: fullText.split(/\s+/).filter(Boolean).length,
      };
    }

    return null;
  }

  /**
   * Markdown-style extraction: headings get # prefix, blockquotes get >.
   */
  private extractMarkdown(html: string): ExtractedContent {
    // Strip scripts/style
    let cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    const parts: string[] = [];

    // Headings
    const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
    let match: RegExpExecArray | null;
    while ((match = headingRegex.exec(cleaned)) !== null) {
      const text = this.stripHtml(match[2]).trim();
      if (text) parts.push(`${'#'.repeat(parseInt(match[1]))} ${text}`);
    }

    // Paragraphs
    const paraRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    while ((match = paraRegex.exec(cleaned)) !== null) {
      const text = this.stripHtml(match[1]).trim();
      if (text && text.length > 10) parts.push(text);
    }

    // Blockquotes
    const bqRegex = /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi;
    while ((match = bqRegex.exec(cleaned)) !== null) {
      const text = this.stripHtml(match[1]).trim();
      if (text) parts.push(`> ${text}`);
    }

    // Pre blocks
    const preRegex = /<pre[^>]*>([\s\S]*?)<\/pre>/gi;
    while ((match = preRegex.exec(cleaned)) !== null) {
      const text = this.stripHtml(match[1]).trim();
      if (text) parts.push('```\n' + text + '\n```');
    }

    const markdown = parts.join('\n\n');

    return {
      text: this.stripHtml(cleaned).replace(/\s+/g, ' ').trim(),
      markdown,
      links: [],
      contentHash: this.hashContent(markdown),
      wordCount: markdown.split(/\s+/).length,
    };
  }

  /**
   * Sitemap XML extraction: parse <loc> tags.
   */
  private extractSitemap(html: string): ExtractedContent {
    const urlMatches = html.match(/<loc>(https?:\/\/[^<]+)<\/loc>/g);
    const links = urlMatches
      ? [...new Set(urlMatches.map((m) => m.replace(/<\/?loc>/g, '').trim()))]
      : [];

    const text = this.stripHtml(html);
    return {
      text,
      links,
      contentHash: this.hashContent(html),
      wordCount: text.split(/\s+/).length,
    };
  }

  // ─── Helpers ─────────────────────────────────────────────

  private extractTitle(html: string): string | null {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return match ? this.stripHtml(match[1]).trim() || null : null;
  }

  private stripHtml(html: string): string {
    let text = html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    // Decode decimal HTML entities (&#XXXX;) used by Wikisource and other sites
    text = text.replace(/&#(\d+);/g, (_m, code) => String.fromCodePoint(parseInt(code, 10)));
    // Decode hex HTML entities (&#xXXXX;)
    text = text.replace(/&#x([0-9a-fA-F]+);/g, (_m, code) => String.fromCodePoint(parseInt(code, 16)));
    return text.replace(/\s+/g, ' ').trim();
  }

  private trimHtml(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .trim();
  }

  private extractLinks(html: string, baseUrl: string): string[] {
    const links = new Set<string>();
    const hrefRegex = /href="([^"]+)"/gi;
    let match: RegExpExecArray | null;
    while ((match = hrefRegex.exec(html)) !== null) {
      try {
        const url = new URL(match[1], baseUrl).href;
        if (url.startsWith('http')) links.add(url);
      } catch {
        // Skip malformed URLs
      }
    }
    return [...links];
  }

  private isRecoverableError(err: unknown): boolean {
    const message = err instanceof Error ? err.message : String(err);
    const recoverablePatterns = [
      'timeout',
      'ETIMEDOUT',
      'ECONNRESET',
      '429',
      '503',
      '502',
    ];
    return recoverablePatterns.some((p) => message.includes(p));
  }

  private randomDelay(): number {
    const min = this.config.minDelayMs;
    const max = this.config.maxDelayMs;
    const base = min + Math.random() * (max - min);
    const jitter = base * 0.3 * (Math.random() * 2 - 1);
    return Math.max(100, Math.round(base + jitter));
  }

  private hashContent(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
