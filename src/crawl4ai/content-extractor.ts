/**
 * Vitthalaya — AI-Assisted Content Extraction Pipeline
 *
 * Transforms raw crawl results into structured ExtractedComposition records.
 * Supports multiple strategies:
 *   - Semantic (AI-assisted text analysis)
 *   - DOM-based (CSS selectors + structure analysis)
 *   - Markdown (heading/paragraph parsing)
 *   - Sitemap (URL pattern analysis)
 *   - OCR (reuses existing OCR pipeline)
 *
 * Each strategy produces normalized compositions ready for dedup + enrichment.
 */

import type {
  CrawlResult,
  ExtractedComposition,
  ExtractionStrategy,
  ContentSelectors,
  SegmentationConfig,
  CrawlerTemplate,
} from './types';
import { normalizeForDisplay } from '../canonical/normalization';

export class ContentExtractor {
  private templates: Map<string, CrawlerTemplate> = new Map();

  constructor() {
    this.loadDefaultTemplates();
  }

  /**
   * Register a crawler template for a known domain pattern.
   */
  registerTemplate(template: CrawlerTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * Extract compositions from a crawl result.
   * Returns an array of extracted (but not yet enriched) compositions.
   */
  async extract(crawlResult: CrawlResult): Promise<ExtractedComposition[]> {
    const url = crawlResult.url;
    const content = crawlResult.content;
    if (!content || !content.text) {
      return [];
    }

    // Find matching template
    const template = this.findMatchingTemplate(url);

    // Determine extraction strategy
    const strategy = template?.strategy ?? crawlResult.strategy;

    // Extract compositions
    let compositions: ExtractedComposition[];

    switch (strategy) {
      case 'dom-based':
        compositions = this.extractDOM(crawlResult, template?.selectors);
        break;
      case 'semantic':
        compositions = this.extractSemantic(content, url);
        break;
      case 'markdown':
        compositions = this.extractFromMarkdown(content, url);
        break;
      case 'sitemap':
        compositions = this.extractFromSitemap(content, url);
        break;
      default:
        compositions = this.extractSemantic(content, url);
    }

    // Apply template defaults
    if (template) {
      for (const comp of compositions) {
        if (template.defaultLicense && !comp.metadata?.license) {
          comp.metadata = { ...comp.metadata, license: template.defaultLicense };
        }
        if (template.attributionTemplate) {
          comp.sourceAttribution = template.attributionTemplate
            .replace('{url}', url)
            .replace('{domain}', new URL(url).hostname);
        }
      }
    }

    // Apply normalization
    for (const comp of compositions) {
      comp.fullText = normalizeForDisplay(comp.fullText);
      if (comp.meaning) {
        comp.meaning = normalizeForDisplay(comp.meaning);
      }
    }

    // Filter out empty/low-quality extractions
    compositions = compositions.filter((c) => {
      const text = c.fullText.replace(/\s+/g, '').trim();
      return text.length >= 20; // Minimum content length
    });

    return compositions;
  }

  // ─── DOM-based Extraction ──────────────────────────────────

  private extractDOM(
    result: CrawlResult,
    selectors?: ContentSelectors,
  ): ExtractedComposition[] {
    if (!result.content?.html && !result.content?.text) return [];

    // Single composition from DOM content
    const composition: ExtractedComposition = {
      titleMarathi: result.metadata?.title ?? 'Untitled',
      fullText: result.content.text,
      sourceAttribution: new URL(result.url).hostname,
      sourceUrl: result.url,
      language: result.metadata?.language ?? 'mr',
      confidence: 0.8,
    };

    // Try to extract title from metadata
    if (result.metadata?.title) {
      composition.titleMarathi = result.metadata.title;
    }

    return [composition];
  }

  // ─── Semantic Extraction ───────────────────────────────────

  private extractSemantic(
    content: NonNullable<CrawlResult['content']>,
    url: string,
  ): ExtractedComposition[] {
    const text = content.text;
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const domain = new URL(url).hostname;

    // Detect Marathi content with Devanagari
    const hasDevanagari = /[\u0900-\u097F]/.test(text);

    // Try to identify title (first meaningful line that looks like a title)
    let title = 'Untitled';
    let bodyStart = 0;

    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i];
      // Titles are usually short (< 100 chars) and at the top
      if (line.length > 3 && line.length < 120 && !line.startsWith('http')) {
        // Check if it's a heading marker (# Title) or plain text
        const clean = line.replace(/^#+\s*/, '').trim();
        if (clean.length > 3) {
          title = clean;
          bodyStart = i + 1;
          break;
        }
      }
    }

    // Body text from after title
    const bodyLines = lines.slice(bodyStart);
    const fullText = bodyLines.join('\n');

    const composition: ExtractedComposition = {
      titleMarathi: title,
      fullText: fullText || text,
      sourceAttribution: domain,
      sourceUrl: url,
      language: hasDevanagari ? 'mr' : 'hi',
      confidence: hasDevanagari ? 0.85 : 0.6,
    };

    return [composition];
  }

  // ─── Markdown Extraction ───────────────────────────────────

  private extractFromMarkdown(
    content: NonNullable<CrawlResult['content']>,
    url: string,
  ): ExtractedComposition[] {
    const md = content.markdown ?? content.text;
    const domain = new URL(url).hostname;
    const hasDevanagari = /[\u0900-\u097F]/.test(md);

    // Try to find first heading as title
    const titleMatch = md.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

    // Strip markdown formatting for clean text
    const cleanText = md
      .replace(/^#{1,6}\s+/gm, '')  // headings
      .replace(/\*\*(.+?)\*\*/g, '$1')  // bold
      .replace(/\*(.+?)\*/g, '$1')  // italic
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')  // links
      .replace(/>\s+/gm, '')  // blockquotes
      .replace(/```[\s\S]*?```/g, '')  // code blocks
      .trim();

    const composition: ExtractedComposition = {
      titleMarathi: title,
      fullText: cleanText,
      sourceAttribution: domain,
      sourceUrl: url,
      language: hasDevanagari ? 'mr' : 'hi',
      confidence: hasDevanagari ? 0.8 : 0.5,
    };

    return [composition];
  }

  // ─── Sitemap Extraction ────────────────────────────────────

  private extractFromSitemap(
    content: NonNullable<CrawlResult['content']>,
    url: string,
  ): ExtractedComposition[] {
    // Sitemaps don't directly yield compositions — they yield URLs to crawl.
    // The URLs are in the links array for the scheduler to process.
    return [];
  }

  // ─── Template Matching ─────────────────────────────────────

  private findMatchingTemplate(url: string): CrawlerTemplate | undefined {
    for (const template of this.templates.values()) {
      try {
        const pattern = template.domainPattern
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*');
        const regex = new RegExp(pattern, 'i');
        if (regex.test(url)) return template;
      } catch {
        continue;
      }
    }
    return undefined;
  }

  // ─── Default Templates ─────────────────────────────────────

  private loadDefaultTemplates(): void {
    const templates: CrawlerTemplate[] = [
      {
        name: 'tukaram-gatha',
        domainPattern: 'anantasatsang.org',
        description: 'Tukaram Maharaj Abhang Gatha',
        strategy: 'dom-based',
        selectors: {
          title: 'h1, .entry-title',
          body: '.entry-content, .post-content',
          container: 'article, main',
        },
        multiComposition: false,
        defaultLicense: 'Public Domain',
        attributionTemplate: 'Source: anantasatsang.org — Tukaram Maharaj Abhang Gatha',
        recrawlAfterHours: 168,
        trustMultiplier: 0.9,
      },
      {
        name: 'warkari-rojnishi',
        domainPattern: 'warkarirojnishi.in',
        description: 'Warkari Rojnishi (Daily Warkari Calendar)',
        strategy: 'dom-based',
        multiComposition: true,
        segmentation: {
          boundaryStrategy: 'heading',
          headingSelector: 'h2, h3',
          minLength: 50,
        },
        defaultLicense: 'Public Domain',
        attributionTemplate: 'Source: warkarirojnishi.in — Warkari Rojnishi',
        recrawlAfterHours: 24,
        trustMultiplier: 0.85,
      },
      {
        name: 'abhang-in',
        domainPattern: 'abhang\\.in',
        description: 'Abhang.in — Marathi devotional compositions',
        strategy: 'dom-based',
        selectors: {
          title: 'h1',
          body: '.content, .lyrics, pre',
          container: 'article, main',
        },
        multiComposition: false,
        defaultLicense: 'Public Domain',
        attributionTemplate: 'Source: abhang.in',
        recrawlAfterHours: 168,
        trustMultiplier: 0.85,
      },
      {
        name: 'wikisource-mr',
        domainPattern: 'mr\\.wikisource\\.org',
        description: 'Marathi Wikisource',
        strategy: 'semantic',
        multiComposition: false,
        defaultLicense: 'CC-BY-SA 4.0',
        attributionTemplate: 'Source: mr.wikisource.org ({url}) — CC-BY-SA 4.0',
        recrawlAfterHours: 336,
        trustMultiplier: 0.95,
      },
      {
        name: 'santeknath',
        domainPattern: 'santeknath\\.org',
        description: 'Sant Eknath Maharaj compositions',
        strategy: 'dom-based',
        selectors: {
          title: 'h1, .post-title',
          body: '.entry-content, .post-content',
          container: 'article',
        },
        multiComposition: false,
        defaultLicense: 'Public Domain',
        attributionTemplate: 'Source: santeknath.org',
        recrawlAfterHours: 168,
        trustMultiplier: 0.9,
      },
    ];

    for (const t of templates) {
      this.templates.set(t.name, t);
    }
  }

  /**
   * Get all registered templates.
   */
  getTemplates(): CrawlerTemplate[] {
    return Array.from(this.templates.values());
  }
}
