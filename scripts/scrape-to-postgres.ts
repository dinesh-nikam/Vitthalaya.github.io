#!/usr/bin/env bun
/**
 * scrape-to-postgres.ts
 * Runs existing site scrapers and saves results directly into the PostgreSQL
 * database via Prisma. This is the bridge between the scraping pipeline and
 * the production database.
 *
 * Usage:
 *   bun run scripts/scrape-to-postgres.ts --source=tukaram-gatha --limit=200
 *   bun run scripts/scrape-to-postgres.ts --source=wikisource-mr --limit=500
 *   bun run scripts/scrape-to-postgres.ts --source=all --limit=300
 *   bun run scripts/scrape-to-postgres.ts --dry-run --source=abhangvani --limit=10
 */

import { parseArgs } from 'util';
import { createHash } from 'crypto';
import { db } from '../src/db/client';

import { TukaramGathaScraper } from '../src/scraper/tukaram-gatha';
import { WikisourceMarathiScraper } from '../src/scraper/wikisource-mr';
import { WarkariRojnishiScraper } from '../src/scraper/warkari-rojnishi';
import { AbhangInScraper } from '../src/scraper/abhang-in';
import { AbhangvaniScraper } from '../src/scraper/abhangvani';
import { StotraNidhiScraper } from '../src/scraper/stotra-nidhi';
import { MarathiAartiScraper } from '../src/scraper/marathi-aarti';
import { HindunidhiScraper } from '../src/scraper/hindunidhi';
import { VedPuranScraper } from '../src/scraper/vedpuran';
import { SantEknathScraper } from '../src/scraper/santeknath';
import { MarathiBhajanSagarScraper } from '../src/scraper/marathi-bhajan-sagar';
import { RamdasSwamiScraper } from '../src/scraper/ramdas-swami';
import type { ScrapedComposition } from '../src/scraper/types';

// ── CLI Args ────────────────────────────────────────────────────────────────

const SOURCES = [
  'tukaram-gatha',   // 4,500+ Tukaram abhangas (public domain via anantasatsang.org)
  'wikisource-mr',   // Marathi Wikisource — CC licensed, stotras & abhangas
  'warkari-rojnishi',// Traditional Varkari compositions
  'abhang-in',       // Abhang.in catalogue
  'abhangvani',      // Abhangvani.com catalogue
  'stotra-nidhi',    // StotraNidhi — Sanskrit/Marathi stotras
  'marathi-aarti',   // Traditional Marathi aartis
  'hindunidhi',      // HinduNidhi — aarti, stotra, bhajan, chalisa
  'vedpuran',        // VedPuran
  'santeknath',      // Sant Eknath
  'marathi-bhajan-sagar', // Marathi Bhajan Sagar
  'ramdas-swami',    // Ramdas Swami
  'all',             // Run all of the above
] as const;

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    source:    { type: 'string', short: 's', default: 'all' },
    limit:     { type: 'string', short: 'l', default: '500' },
    'dry-run': { type: 'boolean', default: false },
    verbose:   { type: 'boolean', short: 'v', default: false },
    help:      { type: 'boolean', default: false },
  },
  allowPositionals: false,
});

const SOURCE    = values.source   as string;
const LIMIT     = parseInt(values.limit as string, 10) || 500;
const DRY_RUN   = values['dry-run'] as boolean;
const VERBOSE   = values.verbose  as boolean;

if (values.help) {
  console.log(`
Usage: bun run scripts/scrape-to-postgres.ts [options]

  -s, --source <name>   Scraper to run (default: all)
                        Choices: ${SOURCES.join(', ')}
  -l, --limit <n>       Max compositions per source (default: 500)
      --dry-run         Parse & print only — do NOT save to database
  -v, --verbose         Verbose output
      --help            Show this help
  `);
  process.exit(0);
}

if (!SOURCES.includes(SOURCE as any)) {
  console.error(`❌ Unknown source: "${SOURCE}". Valid: ${SOURCES.join(', ')}`);
  process.exit(1);
}

// ── Type Mapping ─────────────────────────────────────────────────────────────

const TYPE_MAP: Record<string, string> = {
  abhang: 'ABHANG', aarti: 'AARTI', bhajan: 'BHAJAN',
  stotra: 'STOTRA', haripath: 'HARIPATH', gaulani: 'GAULANI',
  kirtan: 'KIRTAN', namasmaran: 'NAMASMARAN', powada: 'POWADA',
  bharud: 'BHARUD', deviche_gane: 'DEVICHE_GANE',
};

const CATEGORY_SLUG_MAP: Record<string, string> = {
  ABHANG: 'abhang', AARTI: 'aarti', BHAJAN: 'bhajan',
  STOTRA: 'stotra', HARIPATH: 'haripath', GAULANI: 'gaulani',
  KIRTAN: 'kirtan',
};

// ── Saint Name → Slug Map ────────────────────────────────────────────────────

const SAINT_KEYWORD_MAP: [string[], string][] = [
  [['तुकाराम', 'Tukaram', 'तुकोबा'],              'tukaram-maharaj'],
  [['ज्ञानेश्वर', 'ज्ञानदेव', 'Dnyaneshwar', 'द्न्यादेश्वर'], 'dnyaneshwar-maharaj'],
  [['नामदेव', 'Namdev'],                          'namdev-maharaj'],
  [['एकनाथ', 'Eknath'],                          'eknath-maharaj'],
  [['रामदास', 'Ramdas'],                          'samarth-ramdas-swami'],
  [['जनाबाई', 'Janabai'],                        'sant-janabai'],
];

function resolveSaintSlug(name?: string): string | null {
  if (!name) return null;
  for (const [keywords, slug] of SAINT_KEYWORD_MAP) {
    if (keywords.some(kw => name.includes(kw))) return slug;
  }
  return null;
}

// ── Deity Name → Slug Map ────────────────────────────────────────────────────

const DEITY_KEYWORD_MAP: [string[], string][] = [
  [['विठ्ठल', 'पांडुरंग', 'Vitthal', 'Pandurang'], 'vitthal'],
  [['शिव', 'शंभू', 'महादेव', 'Shiva'],             'shiv'],
  [['देवी', 'अंबा', 'दुर्गा', 'Devi', 'Ambha'],    'devi'],
  [['गणपती', 'गणेश', 'Ganpati', 'Ganesh'],         'ganpati'],
  [['राम', 'Ram'],                                  'ram'],
  [['कृष्ण', 'Krishna'],                            'krishna'],
];

function resolveDeitySlug(name?: string): string | null {
  if (!name) return null;
  for (const [keywords, slug] of DEITY_KEYWORD_MAP) {
    if (keywords.some(kw => name.includes(kw))) return slug;
  }
  return null;
}

function makeSlug(title: string, idx: number): string {
  const clean = title
    .replace(/[^\u0900-\u097F\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 50)
    .toLowerCase();
  return `scraped-${clean || 'comp'}-${idx}`.replace(/-+/g, '-');
}

function contentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex').substring(0, 32);
}

function deterministicId(text: string): string {
  const h = createHash('md5').update(text).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}

// ── Load Database Lookups ─────────────────────────────────────────────────────

async function loadLookups() {
  const [saints, deities, categories, existingHashes] = await Promise.all([
    db.saint.findMany({ select: { id: true, slug: true, nameMarathi: true } }),
    db.deity.findMany({ select: { id: true, nameTranslit: true, nameMarathi: true } }),
    db.category.findMany({ select: { id: true, slug: true } }),
    db.composition.findMany({ select: { contentHash: true }, where: { contentHash: { not: null } } }),
  ]);

  const saintBySlug = new Map(saints.map(s => [s.slug, s.id]));
  const deityBySlug = new Map(deities.map(d => [d.nameTranslit.toLowerCase().replace(/\s+/g, '-'), d.id]));
  const catBySlug   = new Map(categories.map(c => [c.slug, c.id]));
  const hashSet     = new Set(existingHashes.map(h => h.contentHash!));

  console.log(`📚 Lookup tables loaded:`);
  console.log(`   Saints: ${saints.length} | Deities: ${deities.length} | Categories: ${categories.length}`);
  console.log(`   Existing hashes (dedup): ${hashSet.size}`);

  return { saintBySlug, deityBySlug, catBySlug, hashSet };
}

// ── Save batch to DB ──────────────────────────────────────────────────────────

async function saveBatch(
  compositions: ScrapedComposition[],
  lookups: Awaited<ReturnType<typeof loadLookups>>,
  source: string,
): Promise<{ inserted: number; skipped: number; errors: number }> {
  const { saintBySlug, deityBySlug, catBySlug, hashSet } = lookups;

  let inserted = 0, skipped = 0, errors = 0;

  for (let i = 0; i < compositions.length; i++) {
    const c = compositions[i];

    const fullText = c.full_text?.trim();
    if (!fullText || fullText.length < 15) { skipped++; continue; }

    const hash = contentHash(fullText);
    if (hashSet.has(hash)) { skipped++; continue; }
    hashSet.add(hash);

    // Map type
    const dbType = TYPE_MAP[c.type] || c.type.toUpperCase();

    // Resolve saint
    const saintSlug = resolveSaintSlug(c.saint_name_marathi || c.saint_name_transliteration);
    const saintId   = saintSlug ? saintBySlug.get(saintSlug) : undefined;

    // Resolve deity
    const deitySlug = resolveDeitySlug(c.deity_name_marathi || c.deity_name_transliteration);
    const deityId   = deitySlug ? deityBySlug.get(deitySlug) : undefined;

    // Resolve category
    const catSlug = CATEGORY_SLUG_MAP[dbType];
    const catId   = catSlug ? catBySlug.get(catSlug) : undefined;

    // Also map vitthal category for Vitthal-related compositions
    const vitthalCatId = catBySlug.get('vitthal');

    const title = (c.title_marathi || fullText.split(/[।॥\n]/)[0]).trim().substring(0, 200);
    const slug  = makeSlug(title, i + 1);
    const id    = deterministicId(source + ':' + hash);

    if (DRY_RUN) {
      if (VERBOSE) {
        console.log(`  [DRY RUN] ${title.substring(0, 60)} → saint:${saintSlug ?? 'none'} deity:${deitySlug ?? 'none'} type:${dbType}`);
      }
      inserted++;
      continue;
    }

    try {
      await db.composition.create({
        data: {
          id,
          titleMarathi:    title,
          titleTranslit:   c.title_transliteration || '',
          slug,
          type:            dbType,
          fullText,
          meaning:         c.meaning || null,
          region:          c.region || 'महाराष्ट्र',
          source:          c.source_attribution || source,
          reviewed:        false,
          contentHash:     hash,
          audioLinks:      '[]',
          ...(saintId ? { saint: { connect: { id: saintId } } } : {}),
          ...(deityId ? { deity: { connect: { id: deityId } } } : {}),
          categories: catId ? {
            create: [
              { category: { connect: { id: catId } } },
              ...(vitthalCatId && deitySlug === 'vitthal' ? [{ category: { connect: { id: vitthalCatId } } }] : []),
            ],
          } : undefined,
        },
      });
      inserted++;
      if (VERBOSE) console.log(`  ✅ Saved: ${title.substring(0, 60)}`);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        // Unique constraint — already exists
        skipped++;
      } else {
        if (VERBOSE) console.error(`  ❌ Error saving "${title.substring(0, 40)}": ${err?.message}`);
        errors++;
      }
    }
  }

  return { inserted, skipped, errors };
}

// ── Scraper Factory ──────────────────────────────────────────────────────────

function createScraper(sourceName: string, limit: number) {
  switch (sourceName) {
    case 'tukaram-gatha':   return new TukaramGathaScraper(limit);
    case 'wikisource-mr':   return new WikisourceMarathiScraper(limit);
    case 'warkari-rojnishi': return new WarkariRojnishiScraper(limit);
    case 'abhang-in':       return new AbhangInScraper(limit);
    case 'abhangvani':      return new AbhangvaniScraper(limit);
    case 'stotra-nidhi':    return new StotraNidhiScraper(limit);
    case 'marathi-aarti':   return new MarathiAartiScraper(limit);
    case 'hindunidhi':      return new HindunidhiScraper(limit);
    case 'vedpuran':         return new VedPuranScraper(limit);
    case 'santeknath':       return new SantEknathScraper(limit);
    case 'marathi-bhajan-sagar': return new MarathiBhajanSagarScraper(limit);
    case 'ramdas-swami':     return new RamdasSwamiScraper(limit);
    default: throw new Error(`Unknown source: ${sourceName}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║       Digital Pandharpur — Scrape → PostgreSQL      ║`);
  console.log(`╚══════════════════════════════════════════════════════╝`);
  console.log(`Mode:    ${DRY_RUN ? '🟡 DRY RUN (no DB writes)' : '🟢 LIVE (writing to PostgreSQL)'}`);
  console.log(`Sources: ${SOURCE}`);
  console.log(`Limit:   ${LIMIT} per source\n`);

  const lookups = await loadLookups();

  const sourcesToRun = SOURCE === 'all'
    ? [
        'wikisource-mr',
        'tukaram-gatha',
        'warkari-rojnishi',
        'abhang-in',
        'abhangvani',
        'stotra-nidhi',
        'marathi-aarti',
        'hindunidhi',
        'vedpuran',
        'santeknath',
        'marathi-bhajan-sagar',
        'ramdas-swami'
      ]
    : [SOURCE];

  let grandTotal = { inserted: 0, skipped: 0, errors: 0 };
  const runStart = Date.now();

  for (const sourceName of sourcesToRun) {
    console.log(`\n▶ Running scraper: ${sourceName}`);
    console.log(`  ${'─'.repeat(48)}`);

    const scraper = createScraper(sourceName, LIMIT);
    let result;
    try {
      result = await scraper.run();
    } catch (err: any) {
      console.error(`  ❌ Scraper failed: ${err?.message}`);
      continue;
    }

    console.log(`  📦 Scraped: ${result.compositions.length} compositions in ${(result.durationMs / 1000).toFixed(1)}s`);
    if (result.errors.length) console.log(`  ⚠️  Errors: ${result.errors.length}`);

    const stats = await saveBatch(result.compositions, lookups, sourceName);
    grandTotal.inserted += stats.inserted;
    grandTotal.skipped  += stats.skipped;
    grandTotal.errors   += stats.errors;

    console.log(`  💾 Saved: ${stats.inserted} | Skipped (dup): ${stats.skipped} | Errors: ${stats.errors}`);
  }

  const elapsed = ((Date.now() - runStart) / 1000).toFixed(1);
  const dbTotal = await db.composition.count();

  console.log(`\n${'═'.repeat(54)}`);
  console.log(`✅  SCRAPING PIPELINE COMPLETE`);
  console.log(`${'═'.repeat(54)}`);
  console.log(`Newly inserted:   ${grandTotal.inserted}`);
  console.log(`Skipped (dups):   ${grandTotal.skipped}`);
  console.log(`Errors:           ${grandTotal.errors}`);
  console.log(`Elapsed:          ${elapsed}s`);
  console.log(`Total in DB now:  ${dbTotal.toLocaleString()}`);
  console.log(`${'═'.repeat(54)}\n`);
}

main()
  .catch(err => {
    console.error('❌ Fatal:', err);
    process.exit(1);
  })
  .finally(async () => {
    if (typeof db.$disconnect === 'function') {
      await db.$disconnect();
    }
  });
