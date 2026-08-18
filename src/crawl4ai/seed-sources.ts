/**
 * Vitthalaya — Seed Sources for Marathi Devotional Content
 *
 * Pre-configured seed sources to bootstrap the content acquisition engine.
 * These are high-trust, publicly accessible sources of Marathi devotional
 * compositions that have been manually verified.
 *
 * Each source includes:
 *   - URL and domain
 *   - Extraction strategy and selectors
 *   - Licensing information
 *   - Trust score
 *   - Crawler template for structured extraction
 */

import type { CrawlerTemplate } from './types';
import { SourceRegistry } from '../discovery/source-registry';
import type { CreateSourceInput } from '../discovery/types';
import { ContentExtractor } from './content-extractor';

export interface SeedSourceConfig {
  source: CreateSourceInput;
  template?: CrawlerTemplate;
}

/**
 * Register all seed sources into the SourceRegistry.
 * Idempotent — skips sources whose domains are already registered.
 */
export async function registerSeedSources(
  extractor?: ContentExtractor,
): Promise<{ registered: number; skipped: number; errors: number }> {
  let registered = 0;
  let skipped = 0;
  let errors = 0;

  for (const seed of SEED_SOURCES) {
    try {
      // Check if domain already registered
      const existing = await SourceRegistry.getAll({
        baseDomain: seed.source.baseDomain,
        limit: 1,
      });

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      // Register in SourceRegistry
      await SourceRegistry.create(seed.source);
      registered++;

      // Register template in extractor
      if (seed.template && extractor) {
        extractor.registerTemplate(seed.template);
      }
    } catch (err) {
      console.error(`[SeedSources] Failed to register ${seed.source.name}:`, err);
      errors++;
    }
  }

  console.log(
    `[SeedSources] Registration complete: ${registered} new, ${skipped} skipped, ${errors} errors`,
  );
  return { registered, skipped, errors };
}

/**
 * Get all seed source configurations.
 */
export function getSeedSources(): SeedSourceConfig[] {
  return SEED_SOURCES;
}

// ─── Seed Sources ─────────────────────────────────────────────

const SEED_SOURCES: SeedSourceConfig[] = [
  // ═══════════════════════════════════════════════════════════════
  // HIGH TRUST — Public Domain / Verified Sources
  // ═══════════════════════════════════════════════════════════════

  // NOTE: AnantaSatsang previously had /tukaram-gatha/ but returns 404 as of 2026.
  // Tukaram Gatha content is available on mr.wikisource.org (Category:तुकाराम_गाथा)
  // with pages like तुकाराम_गाथा/गाथा_३००१_ते_३३००
  {
    source: {
      name: 'Abhang.in — Marathi Devotional Database',
      type: 'WEBSITE',
      url: 'https://abhang.in/',
      baseDomain: 'abhang.in',
      scraperType: 'abhang-in',
      scrapeInterval: 168,
      rateLimitMs: 2000,
      license: 'Public Domain',
      requiresAttribution: true,
      attributionTemplate: 'Source: abhang.in',
      tags: ['abhang', 'aarti', 'bhajan', 'stotra', 'marathi'],
      language: 'mr',
      region: 'Maharashtra',
      isAutoDiscovered: false,

    },
    template: {
      name: 'abhang-in',
      domainPattern: 'abhang\\.in',
      description: 'Abhang.in — Large collection of Marathi devotional compositions',
      strategy: 'dom-based',
      selectors: {
        title: 'h1',
        body: '.content, .lyrics, pre',
        container: 'main, article',
      },
      multiComposition: false,
      defaultLicense: 'Public Domain',
      attributionTemplate: 'Source: abhang.in',
      recrawlAfterHours: 168,
      trustMultiplier: 0.85,
    },
  },
  {
    source: {
      name: 'Warkari Rojnishi — Daily Warkari Calendar',
      type: 'WEBSITE',
      url: 'https://warkarirojnishi.in/',
      baseDomain: 'warkarirojnishi.in',
      scraperType: 'warkari-rojnishi',
      scrapeInterval: 24,
      rateLimitMs: 3000,
      license: 'Public Domain',
      requiresAttribution: true,
      attributionTemplate: 'Source: warkarirojnishi.in',
      tags: ['gaulani', 'warkari', 'marathi', 'daily'],
      language: 'mr',
      region: 'Maharashtra',
      isAutoDiscovered: false,

    },
    template: {
      name: 'warkari-rojnishi',
      domainPattern: 'warkarirojnishi\\.in',
      description: 'Warkari Rojnishi — Daily devotional calendar with multiple compositions',
      strategy: 'dom-based',
      selectors: {
        container: '.entry-content, article',
        body: 'pre, .lyrics',
        exclude: ['.sharedaddy', '.jp-relatedposts'],
      },
      multiComposition: true,
      segmentation: {
        boundaryStrategy: 'heading',
        headingSelector: 'h2, h3',
        minLength: 100,
      },
      defaultLicense: 'Public Domain',
      attributionTemplate: 'Source: warkarirojnishi.in',
      recrawlAfterHours: 24,
      trustMultiplier: 0.85,
    },
  },
  {
    source: {
      name: 'Marathi Wikisource — Abhangs',
      type: 'SITEMAP',
      url: 'https://mr.wikisource.org/',
      baseDomain: 'mr.wikisource.org',
      scrapeInterval: 336,
      rateLimitMs: 1000,
      license: 'CC-BY-SA 4.0',
      requiresAttribution: true,
      attributionTemplate: 'Source: mr.wikisource.org — CC-BY-SA 4.0',
      tags: ['wikisource', 'abhang', 'public-domain', 'marathi'],
      language: 'mr',
      isAutoDiscovered: false,

    },
    template: {
      name: 'wikisource-mr',
      domainPattern: 'mr\\.wikisource\\.org',
      description: 'Marathi Wikisource — Community-maintained public domain texts',
      strategy: 'semantic',
      multiComposition: false,
      defaultLicense: 'CC-BY-SA 4.0',
      attributionTemplate: 'Source: mr.wikisource.org ({url}) — CC-BY-SA 4.0',
      recrawlAfterHours: 336,
      trustMultiplier: 0.95,
    },
  },
  // NOTE: santeknath.org is unreachable/returns no content as of 2026.
  // Sant Eknath compositions available on mr.wikisource.org (हरिपाठ/श्री_एकनाथ_हरिपाठ)

  // ═══════════════════════════════════════════════════════════════
  // MEDIUM TRUST — Community-Managed Sources
  // ═══════════════════════════════════════════════════════════════

  {
    source: {
      name: 'Stotra Nidhi — Stotras & Hymns',
      type: 'WEBSITE',
      url: 'https://stotranidhi.com/',
      baseDomain: 'stotranidhi.com',
      scraperType: 'stotra-nidhi',
      scrapeInterval: 168,
      rateLimitMs: 2000,
      license: 'Public Domain',
      requiresAttribution: true,
      attributionTemplate: 'Source: stotranidhi.com',
      tags: ['stotra', 'hymns', 'sanskrit', 'marathi'],
      language: 'mr',
      isAutoDiscovered: false,

    },
    template: {
      name: 'stotra-nidhi',
      domainPattern: 'stotranidhi\\.com',
      description: 'Stotra Nidhi — Collection of stotras in Sanskrit and Marathi',
      strategy: 'dom-based',
      selectors: {
        title: 'h1',
        body: '.entry-content, .lyrics',
        container: 'article',
      },
      multiComposition: false,
      defaultLicense: 'Public Domain',
      attributionTemplate: 'Source: stotranidhi.com',
      recrawlAfterHours: 168,
      trustMultiplier: 0.75,
    },
  },
  {
    source: {
      name: 'Abhangvani — Devotional Abhangs',
      type: 'WEBSITE',
      url: 'https://abhangvani.com/',
      baseDomain: 'abhangvani.com',
      scraperType: 'abhangvani',
      scrapeInterval: 168,
      rateLimitMs: 2000,
      license: 'Public Domain',
      requiresAttribution: true,
      attributionTemplate: 'Source: abhangvani.com',
      tags: ['abhang', 'vani', 'marathi'],
      language: 'mr',
      isAutoDiscovered: false,

    },
    template: {
      name: 'abhangvani',
      domainPattern: 'abhangvani\\.com',
      description: 'Abhangvani — Collection of abhangs and devotional poetry',
      strategy: 'semantic',
      multiComposition: false,
      defaultLicense: 'Public Domain',
      attributionTemplate: 'Source: abhangvani.com',
      recrawlAfterHours: 168,
      trustMultiplier: 0.75,
    },
  },
  // NOTE: marathiaarti.com is unreachable as of 2026.
  // Aarti content available on mr.wikisource.org (Category:आरती, गणपतीची_आरती, etc.)
  {
    source: {
      name: 'Marathi Bhajan Sagar — Bhajan Ocean',
      type: 'WEBSITE',
      url: 'https://marathibhajansagar.com/',
      baseDomain: 'marathibhajansagar.com',
      scrapeInterval: 168,
      rateLimitMs: 3000,
      license: 'Public Domain',
      requiresAttribution: true,
      attributionTemplate: 'Source: marathibhajansagar.com',
      tags: ['bhajan', 'marathi'],
      language: 'mr',
      isAutoDiscovered: false,

    },
    template: {
      name: 'marathi-bhajan-sagar',
      domainPattern: 'marathibhajansagar\\.com',
      description: 'Marathi Bhajan Sagar — Large collection of bhajans',
      strategy: 'semantic',
      multiComposition: false,
      defaultLicense: 'Public Domain',
      attributionTemplate: 'Source: marathibhajansagar.com',
      recrawlAfterHours: 168,
      trustMultiplier: 0.7,
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // PREVIOUS SCRAPERS CONVERTED TO CRAWL4AI TEMPLATES
  // ═══════════════════════════════════════════════════════════════

  // NOTE: ramdasswami.org is unreachable as of 2026.
  // Ramdas Swami content may be available on mr.wikisource.org
  {
    source: {
      name: 'MarathiSource.com — Marathi Literature',
      type: 'WEBSITE',
      url: 'https://marathisource.com/',
      baseDomain: 'marathisource.com',
      scrapeInterval: 168,
      rateLimitMs: 2000,
      license: 'Public Domain',
      requiresAttribution: true,
      attributionTemplate: 'Source: marathisource.com',
      tags: ['abhang', 'aarti', 'stotra', 'marathi'],
      language: 'mr',
      isAutoDiscovered: false,

    },
    template: {
      name: 'marathi-source',
      domainPattern: 'marathisource\\.com',
      description: 'MarathiSource — Abhangs, aartis, and stotras',
      strategy: 'dom-based',
      selectors: {
        title: 'h1',
        body: 'pre, .lyrics, .content',
        container: 'main',
      },
      multiComposition: false,
      defaultLicense: 'Public Domain',
      attributionTemplate: 'Source: marathisource.com',
      recrawlAfterHours: 168,
      trustMultiplier: 0.8,
    },
  },
  {
    source: {
      name: 'Hindu Nidhi',
      type: 'WEBSITE',
      url: 'https://hindunidhi.com/',
      baseDomain: 'hindunidhi.com',
      scrapeInterval: 168,
      rateLimitMs: 2000,
      license: 'Public Domain',
      requiresAttribution: true,
      attributionTemplate: 'Source: hindunidhi.com',
      tags: ['stotra', 'aarti', 'marathi', 'sanskrit'],
      language: 'mr',
      isAutoDiscovered: false,
    },
    template: {
      name: 'hindunidhi',
      domainPattern: 'hindunidhi\\.com',
      description: 'Hindu Nidhi — Devotional texts and stotras',
      strategy: 'dom-based',
      selectors: {
        title: 'h1',
        body: '.entry-content, .post-content',
        container: 'article',
      },
      multiComposition: false,
      defaultLicense: 'Public Domain',
      attributionTemplate: 'Source: hindunidhi.com',
      recrawlAfterHours: 168,
      trustMultiplier: 0.75,
    },
  },
  {
    source: {
      name: 'Ved Puran',
      type: 'WEBSITE',
      url: 'https://vedpuran.com/',
      baseDomain: 'vedpuran.com',
      scrapeInterval: 336,
      rateLimitMs: 3000,
      license: 'Public Domain',
      requiresAttribution: true,
      attributionTemplate: 'Source: vedpuran.com',
      tags: ['puran', 'vedas', 'marathi'],
      language: 'mr',
      isAutoDiscovered: false,
    },
    template: {
      name: 'vedpuran',
      domainPattern: 'vedpuran\\.com',
      description: 'Ved Puran — Ancient texts in Marathi',
      strategy: 'semantic',
      multiComposition: false,
      defaultLicense: 'Public Domain',
      attributionTemplate: 'Source: vedpuran.com',
      recrawlAfterHours: 336,
      trustMultiplier: 0.8,
    },
  },
];
