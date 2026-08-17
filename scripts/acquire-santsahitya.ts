/**
 * Vitthalaya — SantSahitya.in Acquisition
 *
 * Imports Marathi devotional compositions (abhangs, aartis, bhajans)
 * from the santsahitya.in WordPress REST API. Each post is a single
 * composition: an h2 header, the verse (with ॥ stanza numbers ॥),
 * and an "अर्थ" (meaning) block.
 *
 * Deduplication is two-layer:
 *   1. Cross-source: numbered abhangs (e.g. "sant-tukaram-abhang-163")
 *      are checked against the existing "Tukaram Abhang 163" titles from
 *      the Wikisource bulk import — same composition, different source.
 *   2. Exact: the crawl pipeline's content-hash check catches any text
 *      already in the database.
 *
 * Usage:
 *   bun run scripts/acquire-santsahitya.ts                # all categories
 *   bun run scripts/acquire-santsahitya.ts --dry-run
 *   bun run scripts/acquire-santsahitya.ts --category=tukaram
 *   bun run scripts/acquire-santsahitya.ts --limit=20
 */

import { db } from '../src/db/client';
import { contentHash, isMarathiText, normalizeForComparison } from '../src/canonical/normalization';
import { AcquisitionPipeline } from '../src/crawl4ai/pipeline';
import { ContentExtractor } from '../src/crawl4ai/content-extractor';
import { ContentSegmenter } from '../src/crawl4ai/content-segmenter';
import { MetadataExtractor } from '../src/crawl4ai/metadata-extractor';
import { QualityScorer } from '../src/crawl4ai/quality-scorer';
import { decodeHtmlEntities, htmlToText } from '../src/lib/html-text';
import type { CrawlerEngine, ExtractedComposition } from '../src/crawl4ai/types';

// ─── Noop Crawler Engine ───────────────────────────────────────────
// Satisfies the CrawlerEngine interface but does nothing.
// Used only because AcquisitionPipeline constructor requires an engine;
// runForExtractedCompositions() never calls it.
function createNoopEngine(): CrawlerEngine {
  return {
    initialize: async () => {},
    crawl: async () => ({
      id: '', url: '', status: 'completed' as const, strategy: 'ocr' as const,
      compositions: [], startedAt: new Date().toISOString(),
    }),
    crawlBatch: async () => [],
    crawlDeep: async () => [],
    destroy: async () => {},
    getStats: () => ({ pagesCrawled: 0, uptimeMs: 0 }),
  };
}

// ─── Configuration ───────────────────────────────────────────────

const API_BASE = 'https://www.santsahitya.in/wp-json/wp/v2';
const USER_AGENT = 'Vitthalaya/1.0 (content acquisition; contact@vitthalaya)';
const PER_PAGE = 50;
const REQUEST_DELAY_MS = 400;

interface CategoryTarget {
  slug: string;
  /** Saint name in Marathi, when the category maps to one saint. */
  saintMarathi?: string;
  /** Saint name in transliteration, when the category maps to one saint. */
  saintTranslit?: string;
  /** Composition type override. */
  type?: string;
}

/**
 * Categories that hold actual composition posts. Explicitly excludes
 * blog/articles, kirtan lectures, singer profiles, tirthkshetra guides,
 * festival articles and saint biographies (no lyrics).
 */
const CATEGORY_TARGETS: CategoryTarget[] = [
  { slug: 'tukaram', saintMarathi: 'तुकाराम महाराज', saintTranslit: 'Tukaram Maharaj', type: 'abhang' },
  { slug: 'abhang-gatha' },
  { slug: 'dnyaneshwar', saintMarathi: 'संत ज्ञानेश्वर महाराज', saintTranslit: 'Dnyaneshwar Maharaj' },
  { slug: 'eknath', saintMarathi: 'संत एकनाथ महाराज', saintTranslit: 'Eknath Maharaj' },
  { slug: 'namdev', saintMarathi: 'संत नामदेव महाराज', saintTranslit: 'Namdev Maharaj' },
  { slug: 'janabai', saintMarathi: 'जनाबाई', saintTranslit: 'Janabai' },
  { slug: 'chokhamela', saintMarathi: 'संत चोखामेळा', saintTranslit: 'Chokhamela' },
  { slug: 'nivruttinath', saintMarathi: 'संत निवृत्तीनाथ', saintTranslit: 'Nivruttinath' },
  { slug: 'sopandev', saintMarathi: 'संत सोपानदेव', saintTranslit: 'Sopandev' },
  { slug: 'muktabai', saintMarathi: 'संत मुक्ताबाई', saintTranslit: 'Muktabai' },
  { slug: 'bhanudas', saintMarathi: 'संत भानुदास', saintTranslit: 'Bhanudas' },
  { slug: 'sant-sena', saintMarathi: 'संत सेना महाराज', saintTranslit: 'Sant Sena' },
  { slug: 'soyarabai', saintMarathi: 'संत सोयराबाई', saintTranslit: 'Soyarabai' },
  { slug: 'santaji-maharaj', saintMarathi: 'संत संताजी जगनाडे', saintTranslit: 'Santaji Maharaj' },
  { slug: 'tukdoji-maharaj', saintMarathi: 'संत तुकडोजी महाराज', saintTranslit: 'Tukdoji Maharaj' },
  { slug: 'kanhoba', saintMarathi: 'संत कान्होबा राय', saintTranslit: 'Kanhoba' },
  { slug: 'banka', saintMarathi: 'संत बंका', saintTranslit: 'Banka' },
  { slug: 'narhari-sonar', saintMarathi: 'संत नरहरी सोनार', saintTranslit: 'Narhari Sonar' },
  { slug: 'narsi-mehta', saintMarathi: 'संत नरसी मेहता', saintTranslit: 'Narsi Mehta' },
  { slug: 'karmamela', saintMarathi: 'संत कर्ममेळा', saintTranslit: 'Karmamela' },
  { slug: 'kanhopatra', saintMarathi: 'संत कान्होपात्रा', saintTranslit: 'Kanhopatra' },
  { slug: 'mankoji-bodhale', saintMarathi: 'संत माणकोजी बोधले', saintTranslit: 'Mankoji Bodhale' },
  { slug: 'sant-samarth-ramdash', saintMarathi: 'संत समर्थ रामदास', saintTranslit: 'Ramdas Maharaj' },
  { slug: 'shree-datta', saintMarathi: 'श्री दत्त', saintTranslit: 'Dattatreya' },
  { slug: 'arti', type: 'aarti' },
];

/** WordPress category slugs that are NOT lyrics (kept out of the scan). */
const EXCLUDED_CATEGORY_SLUGS = new Set([
  'blog', 'articles', 'other', 'kirtankar-pravachankar', 'singer', 'mrudang',
  'harmonium', 'tirthkshetra', 'festivals', 'mahati-santanchi', 'ha-bha-p',
  'gramgeeta', 'bhakti-sahitya', 'news', 'photos',
]);

/** Sections in a post's content that mark non-lyric trailer content. */
const TRAILER_MARKERS = [
  'अभंग विडिओ स्वरूपात पहा',
  'विडिओ स्वरूपात पहा',
  'video स्वरूपात',
  'YouTube',
  'youtube',
  'अधिक माहितीसाठी',
  'संपूर्ण अभंग वाचण्यासाठी',
];

// ─── WordPress API helpers ───────────────────────────────────────

export interface WpPost {
  id: number;
  slug: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
  categories: number[];
}

async function wpFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`WordPress API ${path} → HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function listCategories(): Promise<Array<{ id: number; slug: string; count: number }>> {
  const out: Array<{ id: number; slug: string; count: number }> = [];
  for (let page = 1; page <= 3; page++) {
    const batch = await wpFetch<Array<{ id: number; slug: string; count: number }>>(
      `/categories?per_page=100&page=${page}&_fields=id,slug,count`,
    );
    out.push(...batch);
    if (batch.length < 100) break;
    await sleep(REQUEST_DELAY_MS);
  }
  return out;
}

/** List posts for a category id across pages (stops at page 25 / 1250 posts). */
async function listPosts(categoryId: number, maxPosts?: number): Promise<WpPost[]> {
  const out: WpPost[] = [];
  for (let page = 1; page <= 40; page++) {
    const batch = await wpFetch<WpPost[]>(
      `/posts?categories=${categoryId}&per_page=${PER_PAGE}&page=${page}&_fields=id,slug,link,title,content,categories`,
    );
    out.push(...batch);
    if (batch.length < PER_PAGE) break;
    if (maxPosts && out.length >= maxPosts) break;
    await sleep(REQUEST_DELAY_MS);
  }
  return maxPosts ? out.slice(0, maxPosts) : out;
}

// ─── Extraction ──────────────────────────────────────────────────

interface ParsedPost {
  /** Verse text (stanzas with ॥ markers). */
  verse: string;
  /** अर्थ (meaning) block, if present. */
  meaning: string | null;
  /** Title without the "– संत X अभंग – N" suffix. */
  cleanTitle: string;
}

/**
 * Split a post's HTML into (verse, meaning).
 * Structure: h2 header, verse <p> blocks, "अर्थ" <p>, meaning <p>,
 * then trailer junk (video links, photos).
 */
export function parsePostContent(post: WpPost): ParsedPost | null {
  const text = htmlToText(post.content.rendered);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  if (lines.length === 0) return null;

  // Skip the first line if it duplicates the title (h2 header).
  // The title arrives with HTML entities (&#8211;) — decode first.
  let start = 0;
  const titleNorm = normalizeForComparison(decodeHtmlEntities(post.title.rendered));
  if (normalizeForComparison(lines[0]).startsWith(titleNorm.slice(0, Math.min(40, titleNorm.length)))) {
    start = 1;
  }

  // Find the अर्थ section boundary.
  let meaningStart = -1;
  for (let i = start; i < lines.length; i++) {
    const n = normalizeForComparison(lines[i]);
    if (n === 'अर्थ' || n.startsWith('अर्थ') && n.length <= 12) {
      meaningStart = i;
      break;
    }
  }

  const verseLines: string[] = [];
  const meaningLines: string[] = [];

  const verseEnd = meaningStart === -1 ? lines.length : meaningStart;
  for (let i = start; i < verseEnd; i++) {
    const line = lines[i];
    if (isTrailer(line)) continue;
    if (/^(फोटो|HD फोटो|संत |सद्गुरू |ह\.भ\.प\.)/.test(line) && line.length < 40) continue;
    verseLines.push(line);
  }

  if (meaningStart !== -1) {
    for (let i = meaningStart + 1; i < lines.length; i++) {
      const line = lines[i];
      if (isTrailer(line)) break;
      meaningLines.push(line);
    }
  }

  // Strip inline "also read" widget text (e.g. "हे पण वाचा: संत जनाबाईचे सर्व अभंग …").
  const verse = verseLines
    .join('\n')
    .replace(/हे\s*पण\s*वाचा[:\s]*[^\n]*/giu, '')
    .replace(/हेही\s*वाचा[:\s]*[^\n]*/giu, '')
    .replace(/हे\s*सुद्धा\s*वाचा[:\s]*[^\n]*/giu, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
  if (verse.length < 40 || !isMarathiText(verse)) return null;

  // Clean title: strip " – संत तुकाराम अभंग – 163" / " - ..." suffix.
  const cleanTitle = decodeHtmlEntities(post.title.rendered)
    .replace(/[\s\u00A0]*[–—-][\s\u00A0]*संत.*/u, '')
    .replace(/[\s\u00A0]*[–—-][\s\u00A0]*[A-Za-z].*$/u, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    verse,
    meaning: meaningLines.length > 0 ? meaningLines.join('\n').trim() : null,
    cleanTitle: cleanTitle || post.title.rendered,
  };
}

function isTrailer(line: string): boolean {
  const n = normalizeForComparison(line);
  return TRAILER_MARKERS.some((m) => n.includes(normalizeForComparison(m)));
}

/** Photo / non-lyric pages (e.g. "संत तुकाराम महाराज HD फोटो"). */
function isPhotoPage(post: WpPost): boolean {
  const t = normalizeForComparison(decodeHtmlEntities(post.title.rendered));
  if (t.includes('फोटो')) return true;
  if (/(photos|hd-photo|wallpaper)/i.test(post.slug)) return true;
  return false;
}

// ─── Cross-source dedup ──────────────────────────────────────────

/**
 * Extract the canonical "Saint Abhang N" title from a santsahitya slug
 * when possible, so we can skip compositions already imported from
 * Wikisource / other numbered corpora.
 *
 *   sant-tukaram-abhang-163          → Tukaram Abhang 163
 *   sant-tukaram-gatha-1845          → Tukaram Abhang 1845
 *   sant-eknath-gatha-abhang-85      → Eknath Abhang 85
 *   sant-namdev-abhang-12            → Namdev Abhang 12
 */
function canonicalTitleFromSlug(slug: string): string | null {
  const m = slug.match(/^sant-([a-z]+)-(?:gatha-)?(?:abhang-)?(?:krmank-)?(\d+)$/);
  if (!m) return null;
  const saintKey = m[1];
  const num = m[2];
  const saint = saintKey.charAt(0).toUpperCase() + saintKey.slice(1);
  return `${saint} Abhang ${num}`;
}

async function findExistingByTitle(titleTranslit: string): Promise<string | null> {
  const existing = await db.composition.findFirst({
    where: { titleTranslit },
    select: { id: true },
  });
  return existing?.id ?? null;
}

// ─── Main ────────────────────────────────────────────────────────

export interface SantSahityaOptions {
  dryRun?: boolean;
  /** Restrict to one category slug (e.g. 'tukaram'). */
  category?: string;
  /** Cap on posts fetched per category. */
  limit?: number;
  /** Skip banner logging (driven by discovery worker). */
  quiet?: boolean;
}

export interface SantSahityaResult {
  itemsFound: number;
  itemsNew: number;
  itemsDuplicates: number;
  itemsErrored: number;
  itemsSkippedNoLyrics: number;
  categoriesProcessed: number;
  durationMs: number;
}

export async function acquireSantSahitya(options: SantSahityaOptions = {}): Promise<SantSahityaResult> {
  const { dryRun = false, category, limit, quiet = false } = options;

  if (!quiet) {
    console.log('═'.repeat(60));
    console.log('  Vitthalaya — SantSahitya.in Acquisition');
    console.log('═'.repeat(60));
    console.log(`  Dry run: ${dryRun ? 'YES' : 'NO'}`);
    if (category) console.log(`  Category: ${category}`);
    if (limit) console.log(`  Post limit: ${limit}`);
    console.log();
  }

  const startTime = Date.now();

  // ─── Step 1: resolve categories ─────────────────────────────
  let cats = await listCategories();
  const bySlug = new Map(cats.map((c) => [c.slug, c]));

  const targets = CATEGORY_TARGETS.filter((t) => !category || t.slug === category);
  if (targets.length === 0) {
    console.error(`❌ Unknown category: ${category}`);
    console.log(`  Available: ${CATEGORY_TARGETS.map((t) => t.slug).join(', ')}`);
    return { itemsFound: 0, itemsNew: 0, itemsDuplicates: 0, itemsErrored: 1, itemsSkippedNoLyrics: 0, categoriesProcessed: 0, durationMs: 0 };
  }

  let totalFound = 0;
  let totalNew = 0;
  let totalDuplicates = 0;
  let totalErrors = 0;
  let totalSkippedNoLyrics = 0;
  let categoriesProcessed = 0;

  const allCompositions: ExtractedComposition[] = [];
  // In-batch dedup: skip the same abhang appearing in two categories.
  const seenHashes = new Set<string>();
  const seenCanonicalTitles = new Set<string>();

  for (const target of targets) {
    const cat = bySlug.get(target.slug);
    if (!cat) {
      if (!quiet) console.log(`  ⚠️  Category "${target.slug}" not found on the site — skipping`);
      continue;
    }
    if (EXCLUDED_CATEGORY_SLUGS.has(target.slug)) continue;

    if (!quiet) {
      console.log(`📂 ${target.slug} (${cat.count} posts)`);
    }
    categoriesProcessed++;

    let posts: WpPost[];
    try {
      posts = await listPosts(cat.id, limit);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!quiet) console.error(`   ❌ Category ${target.slug}: ${msg}`);
      totalErrors++;
      continue;
    }

    if (!quiet) console.log(`   Fetched ${posts.length} posts`);

    for (const post of posts) {
      totalFound++;

      // Skip photo pages and other non-lyric posts outright.
      if (isPhotoPage(post)) {
        totalSkippedNoLyrics++;
        continue;
      }

      let parsed: ParsedPost | null;
      try {
        parsed = parsePostContent(post);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!quiet) console.error(`   ❌ Parse ${post.slug}: ${msg}`);
        totalErrors++;
        continue;
      }

      if (!parsed) {
        totalSkippedNoLyrics++;
        continue;
      }

      // ─── Layer 1: cross-source dedup by canonical title ──────
      // Read-only DB query — safe in dry-run too.
      const canonicalTitle = canonicalTitleFromSlug(post.slug);
      if (canonicalTitle) {
        if (seenCanonicalTitles.has(canonicalTitle)) {
          totalDuplicates++;
          continue;
        }
        const existingId = await findExistingByTitle(canonicalTitle);
        if (existingId) {
          seenCanonicalTitles.add(canonicalTitle);
          totalDuplicates++;
          continue;
        }
      }

      // ─── Layer 2: in-batch content-hash dedup ────────────────
      const hash = contentHash(parsed.verse);
      if (seenHashes.has(hash)) {
        totalDuplicates++;
        continue;
      }
      seenHashes.add(hash);

      // Build the composition for the pipeline (layer 3: DB hash check inside).
      allCompositions.push({
        titleMarathi: parsed.cleanTitle,
        titleTranslit: canonicalTitle ?? slugToTranslit(post.slug),
        fullText: parsed.verse,
        meaning: parsed.meaning ?? undefined,
        type: target.type,
        saintNameMarathi: target.saintMarathi,
        saintNameTranslit: target.saintTranslit,
        sourceAttribution: 'Source: Sant Sahitya (santsahitya.in)',
        sourceUrl: post.link,
        language: 'mr',
        region: 'Maharashtra',
        confidence: 0.75,
      });
    }

    if (!quiet) console.log();
  }

  if (allCompositions.length === 0) {
    const durationMs = Date.now() - startTime;
    if (!quiet) {
      console.log('  No new compositions to process.');
      console.log(`  Found ${totalFound}, duplicates ${totalDuplicates}, no-lyrics ${totalSkippedNoLyrics}, errors ${totalErrors}`);
    }
    return { itemsFound: totalFound, itemsNew: 0, itemsDuplicates: totalDuplicates, itemsErrored: totalErrors, itemsSkippedNoLyrics: totalSkippedNoLyrics, categoriesProcessed, durationMs };
  }

  if (!quiet) {
    console.log(`  → ${allCompositions.length} compositions to pipeline (after cross-source + in-batch dedup)`);
  }

  if (dryRun) {
    if (!quiet) {
      for (const c of allCompositions.slice(0, 6)) {
        const preview = c.fullText.split('\n')[0].slice(0, 80);
        console.log(`     • ${c.titleTranslit ?? c.titleMarathi}: ${preview}`);
      }
      if (allCompositions.length > 6) console.log(`     … and ${allCompositions.length - 6} more`);
    }
    const durationMs = Date.now() - startTime;
    return { itemsFound: totalFound, itemsNew: allCompositions.length, itemsDuplicates: totalDuplicates, itemsErrored: totalErrors, itemsSkippedNoLyrics: totalSkippedNoLyrics, categoriesProcessed, durationMs };
  }

  // ─── Pipeline (content-hash dedup, scoring, persist) ────────
  const pipeline = new AcquisitionPipeline(
    createNoopEngine(),
    new ContentExtractor(),
    new ContentSegmenter(),
    new MetadataExtractor(),
    new QualityScorer(),
    { dryRun: false, maxCompositionsPerSource: 5000, autoApproveThreshold: 0.70, enableEnrichment: false },
  );

  const result = await pipeline.runForExtractedCompositions(allCompositions, 'santsahitya.in', {
    sourceUrl: 'https://www.santsahitya.in',
    sourceTrustScore: 0.8,
    dryRun: false,
  });

  totalNew = result.compositionsExtracted;
  totalDuplicates += result.duplicatesFound;
  totalErrors += result.errors.length;

  const durationMs = Date.now() - startTime;
  const elapsed = (durationMs / 1000).toFixed(1);

  if (!quiet) {
    console.log('═'.repeat(60));
    console.log('  ACQUISITION COMPLETE');
    console.log('═'.repeat(60));
    console.log(`  Categories:   ${categoriesProcessed}`);
    console.log(`  Posts found:  ${totalFound}`);
    console.log(`  New:          ${totalNew}`);
    console.log(`  Duplicates:   ${totalDuplicates}`);
    console.log(`  No lyrics:    ${totalSkippedNoLyrics}`);
    console.log(`  Errors:       ${totalErrors}`);
    console.log(`  Time:         ${elapsed}s`);
    const finalCount = await db.composition.count();
    console.log(`  DB count:     ${finalCount} total`);
    console.log();
  }

  return { itemsFound: totalFound, itemsNew: totalNew, itemsDuplicates: totalDuplicates, itemsErrored: totalErrors, itemsSkippedNoLyrics: totalSkippedNoLyrics, categoriesProcessed, durationMs };
}

function slugToTranslit(slug: string): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    decoded = slug;
  }
  return decoded.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim() || 'Composition';
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── CLI Entry Point ───────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('--dryrun');
  const category = args.find((a) => a.startsWith('--category='))?.split('=')[1];
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

  await acquireSantSahitya({
    dryRun,
    category,
    limit: Number.isFinite(limit) ? limit : undefined,
  });
}

if (import.meta.main) {
  main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}
