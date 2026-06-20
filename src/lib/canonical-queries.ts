/**
 * Canonical search query engine.
 *
 * Generates pre-computed search paths from database entity names.
 * These are served as `/search/[query]` static pages instead of
 * `?q=...` query params — making them crawlable and indexable.
 *
 * At 10M scale, this generates ~50K-100K indexable search landing pages.
 */

import { db } from '@/src/db/client';

// ─── Types ────────────────────────────────────────────────────

export interface CanonicalQuery {
  /** URL-safe query slug (e.g. 'vitthal', 'tukaram-maharaj') */
  slug: string;
  /** Display label in Marathi */
  label: string;
  /** Display label in transliteration (English fallback) */
  labelTranslit: string;
  /** Type of entity: saint, category, type, deity, festival */
  source: 'saint' | 'category' | 'type' | 'deity' | 'festival';
  /** Estimated result count for priority sorting */
  resultCount: number;
}

// ─── Query Generators ─────────────────────────────────────────

/**
 * Build canonical queries from all entity types in the database.
 * Queries are ordered by estimated result count descending.
 */
export async function generateCanonicalQueries(): Promise<CanonicalQuery[]> {
  const queries: CanonicalQuery[] = [];

  // 1. Saints — each saint name is a canonical search query
  const saints = await db.saint.findMany({
    select: { nameTranslit: true, nameMarathi: true, slug: true },
  });
  for (const saint of saints) {
    // Saint transliterated name as canonical query
    queries.push({
      slug: saint.slug,
      label: saint.nameMarathi,
      labelTranslit: saint.nameTranslit,
      source: 'saint',
      resultCount: 1000, // Estimated — updated by refresh
    });
  }

  // 2. Categories — each category name
  const categories = await db.category.findMany({
    select: { nameTranslit: true, nameMarathi: true, slug: true },
  });
  for (const cat of categories) {
    queries.push({
      slug: cat.slug,
      label: cat.nameMarathi,
      labelTranslit: cat.nameTranslit,
      source: 'category',
      resultCount: 500,
    });
  }

  // 3. Composition types (enum values)
  const compositionTypes = [
    { slug: 'abhang', label: 'अभंग', labelTranslit: 'Abhang' },
    { slug: 'aarti', label: 'आरती', labelTranslit: 'Aarti' },
    { slug: 'bhajan', label: 'भजन', labelTranslit: 'Bhajan' },
    { slug: 'stotra', label: 'स्तोत्र', labelTranslit: 'Stotra' },
    { slug: 'haripath', label: 'हरिपाठ', labelTranslit: 'Haripath' },
    { slug: 'gaulani', label: 'गौळणी', labelTranslit: 'Gaulani' },
    { slug: 'bharud', label: 'भारूड', labelTranslit: 'Bharud' },
    { slug: 'kirtan', label: 'कीर्तन', labelTranslit: 'Kirtan' },
    { slug: 'namasmaran', label: 'नामस्मरण', labelTranslit: 'Namasmaran' },
    { slug: 'powada', label: 'पोवाडा', labelTranslit: 'Powada' },
  ];
  for (const ct of compositionTypes) {
    const count = await db.composition.count({
      where: { type: ct.slug.toUpperCase() as any },
    });
    queries.push({
      slug: ct.slug,
      label: ct.label,
      labelTranslit: ct.labelTranslit,
      source: 'type',
      resultCount: count,
    });
  }

  // 4. Deities — extracted from AI enrichment results
  const deityNames = await db.aiEnrichmentResult.findMany({
    where: { deityId: { not: null }, reviewed: true },
    select: { deityId: true },
    distinct: ['deityId'],
  });
  if (deityNames.length > 0) {
    const deities = await db.deity.findMany({
      where: { id: { in: deityNames.map((d) => d.deityId!).filter(Boolean) } },
      select: { nameTranslit: true, nameMarathi: true },
    });
    for (const deity of deities) {
      queries.push({
        slug: deity.nameTranslit.toLowerCase().replace(/\s+/g, '-'),
        label: deity.nameMarathi,
        labelTranslit: deity.nameTranslit,
        source: 'deity',
        resultCount: 500,
      });
    }
  }

  // 5. Festivals
  const festivals = await db.festival.findMany({
    select: { nameTranslit: true, nameMarathi: true },
  });
  for (const fest of festivals) {
    queries.push({
      slug: fest.nameTranslit.toLowerCase().replace(/\s+/g, '-'),
      label: fest.nameMarathi,
      labelTranslit: fest.nameTranslit,
      source: 'festival',
      resultCount: 200,
    });
  }

  // Sort by resultCount descending so high-value queries get crawled first
  queries.sort((a, b) => b.resultCount - a.resultCount);

  return queries;
}

/**
 * Get the top N canonical queries (for sitemap generation, cache control, etc).
 */
export async function getTopCanonicalQueries(limit = 10000): Promise<CanonicalQuery[]> {
  const all = await generateCanonicalQueries();
  return all.slice(0, limit);
}

/**
 * Convert a search query slug to a display label.
 * Returns null if the query doesn't match any canonical entity.
 */
export async function resolveCanonicalQuery(
  querySlug: string,
): Promise<CanonicalQuery | null> {
  const all = await generateCanonicalQueries();
  return all.find((q) => q.slug === querySlug) ?? null;
}
