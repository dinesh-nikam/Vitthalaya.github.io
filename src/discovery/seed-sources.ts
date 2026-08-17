#!/usr/bin/env bun
/**
 * Digital Pandharpur — Seed Known Sources
 *
 * Registers all existing scrapers and known content sources into the
 * ContentSource registry. Run once after initial migration.
 *
 * Usage:
 *   bun run src/discovery/seed-sources.ts
 *   bun run src/discovery/seed-sources.ts --dry-run
 */

import { SourceRegistry } from './source-registry';
import type { CreateSourceInput } from './types';

interface KnownSource {
  name: string;
  type: CreateSourceInput['type'];
  url: string;
  scraperType: string | null;
  scrapeInterval: number;
  rateLimitMs: number;
  license: string | null;
  requiresAttribution: boolean;
  attributionTemplate: string | null;
  tags: string[];
  language: string;
  region: string | null;
  notes: string | null;
  trustScore: number;
}

const KNOWN_SOURCES: KnownSource[] = [
  // ─── Existing Scrapers ──────────────────────────────────────
  {
    name: 'Anant Satsang (Tukaram Gatha)',
    type: 'WEBSITE',
    url: 'https://anantasatsang.org',
    scraperType: 'tukaram-gatha',
    scrapeInterval: 24,
    rateLimitMs: 2000,
    license: 'Public Domain',
    requiresAttribution: true,
    attributionTemplate: 'Source: Anant Satsang (anantasatsang.org)',
    tags: ['tukaram', 'abhang', 'gatha'],
    language: 'mr',
    region: 'Maharashtra',
    notes: 'Full Tukaram Gatha with abhang collection. Existing scraper: tukaram-gatha.ts',
    trustScore: 0.85,
  },
  {
    name: 'Warkari Rojnishi',
    type: 'WEBSITE',
    url: 'https://warkarirojnishi.in',
    scraperType: 'warkari-rojnishi',
    scrapeInterval: 24,
    rateLimitMs: 2000,
    license: 'Public Domain',
    requiresAttribution: true,
    attributionTemplate: 'Source: Warkari Rojnishi (warkarirojnishi.in)',
    tags: ['gaulani', 'warkari', 'daily'],
    language: 'mr',
    region: 'Maharashtra',
    notes: 'Daily warkari reflections and gaulani. Existing scraper: warkari-rojnishi.ts',
    trustScore: 0.80,
  },
  {
    name: 'Abhang.in',
    type: 'WEBSITE',
    url: 'https://abhang.in',
    scraperType: 'abhang-in',
    scrapeInterval: 24,
    rateLimitMs: 2000,
    license: 'Public Domain',
    requiresAttribution: true,
    attributionTemplate: 'Source: Abhang.in',
    tags: ['abhang', 'aarti', 'bhajan', 'stotra'],
    language: 'mr',
    region: 'Maharashtra',
    notes: 'Extensive collection of abhang, aarti, bhajan, stotra. Existing scraper: abhang-in.ts',
    trustScore: 0.85,
  },
  {
    name: 'Abhangvani',
    type: 'SITEMAP',
    url: 'https://abhangvani.com',
    scraperType: 'abhangvani',
    scrapeInterval: 24,
    rateLimitMs: 350,
    license: 'robots.txt: Allow all; content for searchable archive with attribution',
    requiresAttribution: true,
    attributionTemplate: 'Source: Abhangvani (abhangvani.com)',
    tags: ['abhang', 'ovi', 'aarti', 'stotra', 'eknath', 'dnyaneshwar', 'gita', 'ramayan'],
    language: 'mr',
    region: 'Maharashtra',
    notes: 'Next.js devotional literature platform (~781 sitemap pages): Eknath Bhagwat ovyas (~10k), Dnyaneshwar Gatha abhangs, aartis, stotras, chalisas, Gita/Ramayan adhyays, palanas. Importer: acquire-abhangvani.ts (walks __NEXT_DATA__, splits multi-verse pages, dedups by canonical title + content hash).',
    trustScore: 0.75,
  },
  {
    name: 'Marathi Aarti',
    type: 'WEBSITE',
    url: 'https://marathiaarti.com',
    scraperType: 'marathi-aarti',
    scrapeInterval: 48,
    rateLimitMs: 3000,
    license: 'Public Domain',
    requiresAttribution: true,
    attributionTemplate: 'Source: Marathi Aarti (marathiaarti.com)',
    tags: ['aarti', 'marathi'],
    language: 'mr',
    region: 'Maharashtra',
    notes: 'Collection of Marathi aartis. Existing scraper: marathi-aarti.ts',
    trustScore: 0.70,
  },
  {
    name: 'Marathi Bhajan Sagar',
    type: 'WEBSITE',
    url: 'https://marathibhajansagar.com',
    scraperType: 'marathi-bhajan-sagar',
    scrapeInterval: 48,
    rateLimitMs: 3000,
    license: 'Public Domain',
    requiresAttribution: true,
    attributionTemplate: 'Source: Marathi Bhajan Sagar (marathibhajansagar.com)',
    tags: ['bhajan', 'marathi', 'sagar'],
    language: 'mr',
    region: 'Maharashtra',
    notes: 'Ocean of Marathi bhajans. Existing scraper: marathi-bhajan-sagar.ts',
    trustScore: 0.65,
  },
  {
    name: 'Sant Eknath',
    type: 'WEBSITE',
    url: 'https://santeknath.org',
    scraperType: 'santeknath',
    scrapeInterval: 24,
    rateLimitMs: 2000,
    license: 'Public Domain',
    requiresAttribution: true,
    attributionTemplate: 'Source: Sant Eknath (santeknath.org)',
    tags: ['sant-eknath', 'abhang', 'marathi'],
    language: 'mr',
    region: 'Maharashtra',
    notes: 'Sant Eknath compositions and biography. Existing scraper: santeknath.ts',
    trustScore: 0.90,
  },
  {
    name: 'Stotra Nidhi',
    type: 'WEBSITE',
    url: 'https://stotranidhi.com',
    scraperType: 'stotra-nidhi',
    scrapeInterval: 48,
    rateLimitMs: 3000,
    license: 'Public Domain',
    requiresAttribution: true,
    attributionTemplate: 'Source: Stotra Nidhi (stotranidhi.com)',
    tags: ['stotra', 'sanskrit', 'marathi'],
    language: 'mr',
    region: 'India',
    notes: 'Stotra collection in Sanskrit and Marathi. Existing scraper: stotra-nidhi.ts',
    trustScore: 0.70,
  },
  {
    name: 'Wikisource Marathi',
    type: 'SITEMAP',
    url: 'https://mr.wikisource.org',
    scraperType: 'wikisource-mr',
    scrapeInterval: 12,
    rateLimitMs: 1000,
    license: 'CC BY-SA 4.0',
    requiresAttribution: true,
    attributionTemplate: 'Source: Wikisource Marathi (mr.wikisource.org) — CC BY-SA 4.0',
    tags: ['wikisource', 'marathi', 'public-domain'],
    language: 'mr',
    region: 'Maharashtra',
    notes: 'Marathi Wikisource — public domain texts. Existing scraper: wikisource-mr.ts',
    trustScore: 0.95,
  },
  {
    name: 'Wikisource Marathi — Bulk Books (Gatha/Haripath/Dnyaneshwari)',
    type: 'SITEMAP',
    url: 'https://mr.wikisource.org',
    scraperType: 'wikisource-bulk',
    scrapeInterval: 24,
    rateLimitMs: 1000,
    license: 'CC BY-SA 4.0',
    requiresAttribution: true,
    attributionTemplate: 'Source: Wikisource Marathi (mr.wikisource.org) — CC BY-SA 4.0',
    tags: ['wikisource', 'tukaram', 'gatha', 'haripath', 'dnyaneshwari', 'public-domain'],
    language: 'mr',
    region: 'Maharashtra',
    notes: 'Bulk structured books: Tukaram Gatha (4,583 abhangs), 5-saint Haripaths, Dnyaneshwari chapters. Idempotent via content-hash dedup.',
    trustScore: 0.95,
  },
  {
    name: 'Internet Archive — Sant Gathas (OCR)',
    type: 'WEBSITE',
    url: 'https://archive.org/details/sant-namdev-gatha',
    scraperType: 'internet-archive',
    scrapeInterval: 72,
    rateLimitMs: 1500,
    license: 'Public Domain',
    requiresAttribution: true,
    attributionTemplate: 'Source: Internet Archive (archive.org) — Public Domain',
    tags: ['tukaram', 'namdev', 'eknath', 'gatha', 'public-domain'],
    language: 'mr',
    region: 'Maharashtra',
    notes: 'Internet Archive OCR text of saint gathas (Namdev, Eknath, Tukaram). Dedup via content hash.',
    trustScore: 0.80,
  },
  {
    name: 'Sant Sahitya',
    type: 'WEBSITE',
    url: 'https://www.santsahitya.in',
    scraperType: 'santsahitya',
    scrapeInterval: 72,
    rateLimitMs: 600,
    license: 'Website terms: search=yes, use=reference; content for searchable archive with attribution',
    requiresAttribution: true,
    attributionTemplate: 'Source: Sant Sahitya (santsahitya.in)',
    tags: ['abhang', 'aarti', 'bhajan', 'sant', 'marathi', 'tukaram', 'eknath', 'namdev'],
    language: 'mr',
    region: 'Maharashtra',
    notes: 'WordPress site with ~10k Marathi devotional posts (abhangs by saint, aartis, bhajans) with verse + अर्थ. Imported via WP REST API; dedup by canonical abhang number against Wikisource corpus.',
    trustScore: 0.80,
  },
  {
    name: 'Ramdas Swami',
    type: 'WEBSITE',
    url: 'https://ramdas-swami.org',
    scraperType: 'ramdas-swami',
    scrapeInterval: 48,
    rateLimitMs: 3000,
    license: 'Public Domain',
    requiresAttribution: true,
    attributionTemplate: 'Source: Ramdas Swami (ramdas-swami.org)',
    tags: ['ramdas', 'dasbodh', 'marathi'],
    language: 'mr',
    region: 'Maharashtra',
    notes: 'Ramdas Swami compositions and Dasbodh. Existing scraper: ramdas-swami.ts',
    trustScore: 0.75,
  },
  {
    name: 'Marathi Bhajan Geet (WordPress.com)',
    type: 'RSS',
    url: 'https://bhajangeet.wordpress.com',
    scraperType: 'bhajangeet',
    scrapeInterval: 168,
    rateLimitMs: 1000,
    license: 'WordPress.com feed; content for searchable archive with attribution',
    requiresAttribution: true,
    attributionTemplate: 'Source: Marathi Bhajan Geet (bhajangeet.wordpress.com)',
    tags: ['abhang', 'bhajan', 'gaulani', 'marathi'],
    language: 'mr',
    region: 'Maharashtra',
    notes: 'Small (100-item) WordPress.com feed of selected abhang, gaulani, bhairavi, santpada from 2014. Imported via paginated RSS feed.',
    trustScore: 0.70,
  },
  {
    name: 'Vedpuran',
    type: 'WEBSITE',
    url: 'https://vedpuran.com',
    scraperType: 'vedpuran',
    scrapeInterval: 48,
    rateLimitMs: 3000,
    license: 'Public Domain',
    requiresAttribution: true,
    attributionTemplate: 'Source: Vedpuran (vedpuran.com)',
    tags: ['vedic', 'puran', 'marathi'],
    language: 'mr',
    region: 'India',
    notes: 'Vedic and Puranic texts in Marathi. Existing scraper: vedpuran.ts',
    trustScore: 0.60,
  },
  {
    name: 'Hindunidhi',
    type: 'WEBSITE',
    url: 'https://hindunidhi.com',
    scraperType: 'hindunidhi',
    scrapeInterval: 48,
    rateLimitMs: 3000,
    license: 'Public Domain',
    requiresAttribution: true,
    attributionTemplate: 'Source: Hindunidhi (hindunidhi.com)',
    tags: ['hindu', 'stotra', 'marathi'],
    language: 'mr',
    region: 'India',
    notes: 'Hindu devotional content. Existing scraper: hindunidhi.ts',
    trustScore: 0.55,
  },
  {
    name: 'Marathi Source',
    type: 'WEBSITE',
    url: 'https://marathisource.com',
    scraperType: 'marathi-source',
    scrapeInterval: 48,
    rateLimitMs: 3000,
    license: 'Public Domain',
    requiresAttribution: true,
    attributionTemplate: 'Source: Marathi Source (marathisource.com)',
    tags: ['marathi', 'general'],
    language: 'mr',
    region: 'Maharashtra',
    notes: 'General Marathi content source. Existing scraper: marathi-source.ts',
    trustScore: 0.50,
  },
  {
    name: 'YouTube — Devotional',
    type: 'YOUTUBE',
    url: 'https://youtube.com',
    scraperType: 'youtube-scraper',
    scrapeInterval: 12,
    rateLimitMs: 5000,
    license: null,
    requiresAttribution: true,
    attributionTemplate: 'Source: YouTube (youtube.com)',
    tags: ['youtube', 'devotional', 'audio', 'video'],
    language: 'mr',
    region: 'India',
    notes: 'YouTube scraper for devotional content. Existing scrapers: youtube-scraper.ts, youtube-deep-scraper.ts',
    trustScore: 0.40,
  },
  // ─── Content Pipeline Crawlers ─────────────────────────────
  {
    name: 'PDF Content Crawler',
    type: 'WEBSITE',
    url: 'https://example.com/pdfs',
    scraperType: 'pdf-crawler',
    scrapeInterval: 72,
    rateLimitMs: 5000,
    license: null,
    requiresAttribution: true,
    attributionTemplate: null,
    tags: ['pdf', 'ocr', 'digitization'],
    language: 'mr',
    region: 'India',
    notes: 'PDF crawler for digitizing book scans. Existing crawler: pdf-crawler.ts',
    trustScore: 0.30,
  },
  {
    name: 'EPUB Content Crawler',
    type: 'WEBSITE',
    url: 'https://example.com/epubs',
    scraperType: 'epub-crawler',
    scrapeInterval: 72,
    rateLimitMs: 5000,
    license: null,
    requiresAttribution: true,
    attributionTemplate: null,
    tags: ['epub', 'ebook', 'digitization'],
    language: 'mr',
    region: 'India',
    notes: 'EPUB crawler for digitizing ebooks. Existing crawler: epub-crawler.ts',
    trustScore: 0.30,
  },
  {
    name: 'OCR Content Crawler',
    type: 'WEBSITE',
    url: 'https://example.com/ocr',
    scraperType: 'ocr-crawler',
    scrapeInterval: 72,
    rateLimitMs: 5000,
    license: null,
    requiresAttribution: true,
    attributionTemplate: null,
    tags: ['ocr', 'scan', 'digitization'],
    language: 'mr',
    region: 'India',
    notes: 'OCR crawler for scanned manuscripts. Existing crawler: ocr-crawler.ts',
    trustScore: 0.30,
  },
  {
    name: 'Upload Content Pipeline',
    type: 'COMMUNITY',
    url: 'https://vitthalaya.github.io',
    scraperType: 'upload-crawler',
    scrapeInterval: 6,
    rateLimitMs: 1000,
    license: null,
    requiresAttribution: true,
    attributionTemplate: 'Community contribution via Vitthalaya',
    tags: ['community', 'upload', 'contribution'],
    language: 'mr',
    region: 'India',
    notes: 'Community upload processing pipeline. Existing crawler: upload-crawler.ts',
    trustScore: 0.60,
  },
];

/**
 * Seed known sources into the ContentSource registry.
 */
export async function seedSources(options?: {
  dryRun?: boolean;
}): Promise<{ registered: number; skipped: number; errors: number }> {
  let registered = 0;
  let skipped = 0;
  let errors = 0;

  for (const source of KNOWN_SOURCES) {
    try {
      // Check if source already exists (by URL or name)
      const existing = await SourceRegistry.getAll({ limit: 5, search: source.name });

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      if (options?.dryRun) {
        console.log(`[DRY-RUN] Would register: ${source.name} (${source.url})`);
        registered++;
        continue;
      }

      await SourceRegistry.create({
        name: source.name,
        type: source.type,
        url: source.url,
        baseDomain: extractDomain(source.url),
        scraperType: source.scraperType,
        scrapeInterval: source.scrapeInterval,
        rateLimitMs: source.rateLimitMs,
        license: source.license,
        requiresAttribution: source.requiresAttribution,
        attributionTemplate: source.attributionTemplate,
        tags: source.tags,
        language: source.language,
        region: source.region,
        notes: source.notes,
        isAutoDiscovered: false,
      });

      // Set trust score after creation
      await SourceRegistry.update(
        (await SourceRegistry.getAll({ limit: 1, search: source.name }))[0].id,
        { trustScore: source.trustScore },
      );

      registered++;
      console.log(`✓ Registered: ${source.name}`);
    } catch (err) {
      errors++;
      console.error(`✗ Failed to register ${source.name}:`, err);
    }
  }

  console.log(`\nSeed complete: ${registered} registered, ${skipped} skipped, ${errors} errors`);
  return { registered, skipped, errors };
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    const match = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?([^:/\n?=]+)/);
    return match?.[1]?.replace(/^www\./, '') ?? url;
  }
}

// ─── CLI Entry Point ──────────────────────────────────────────

if (import.meta.path === Bun.main) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  seedSources({ dryRun })
    .then((result) => {
      if (dryRun) {
        console.log(`\nDry-run: ${result.registered} would be registered`);
      } else {
        console.log(`\nDone: ${result.registered} registered`);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
