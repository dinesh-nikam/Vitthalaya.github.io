/**
 * Meilisearch client for Digital Pandharpur
 * Indexes compositions from PostgreSQL for instant search
 */

import { Meilisearch } from 'meilisearch';
import { db } from '@/src/db/client';
import { expandTransliteration, getTransliterationSuggestions } from '@/src/lib/search-transliteration';

const client = new Meilisearch({
  host: process.env.MEILI_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILI_MASTER_KEY || '',
});

const INDEX_NAME = 'compositions';

export interface SearchDocument {
  id: string;
  titleMarathi: string;
  titleTranslit: string;
  fullText: string;
  type: string;
  slug: string;
  saintName: string | null;
  saintTranslit: string | null;
  deityName: string | null;
  hasAudio: boolean;
  popularityScore: number;
}

/** Search result with highlighted field excerpts from Meilisearch */
export interface HighlightedSearchResult extends SearchDocument {
  /** Meilisearch _formatted object with <em> tags */
  _formatted?: {
    titleMarathi?: string;
    fullText?: string;
    saintName?: string;
    deityName?: string;
  };
}

// Initialize index with settings
export async function initializeSearchIndex() {
  const index = client.index(INDEX_NAME);

  // Configure searchable fields and ranking
  await index.updateSettings({
    searchableAttributes: [
      'titleMarathi',
      'titleTranslit',
      'fullText',
      'saintName',
      'saintTranslit',
    ],
    filterableAttributes: ['type', 'deityName', 'hasAudio', 'saintName', 'festivalNames'],
    rankingRules: [
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
      'popularityScore:desc',
    ],
    // Enable transliteration matching
    // "vitthal" will match "विठ्ठल" because we index both
    stopWords: [],
  });

  console.log('✓ Meilisearch index initialized');
}

// Index all compositions from PostgreSQL
export async function indexAllCompositions() {
  const index = client.index(INDEX_NAME);

  const compositions = await db.composition.findMany({
    select: {
      id: true,
      titleMarathi: true,
      titleTranslit: true,
      fullText: true,
      type: true,
      slug: true,
      saint: {
        select: {
          nameMarathi: true,
          nameTranslit: true,
        },
      },
      deity: {
        select: {
          nameMarathi: true,
        },
      },
      audioLinks: true,
      reviewed: true,
    },
    where: {
      reviewed: true, // Only index editorially reviewed content
    },
  });

  const documents: SearchDocument[] = compositions.map((comp: any) => ({
    id: comp.id,
    titleMarathi: comp.titleMarathi,
    titleTranslit: comp.titleTranslit,
    fullText: comp.fullText.substring(0, 500), // First 500 chars for search
    type: comp.type.toLowerCase(),
    slug: comp.slug,
    saintName: comp.saint?.nameMarathi || null,
    saintTranslit: comp.saint?.nameTranslit || null,
    deityName: comp.deity?.nameMarathi || null,
    hasAudio: comp.audioLinks && comp.audioLinks.length > 0,
    popularityScore: 100, // Base score, update based on views
  }));

  // Add documents in batches
  const batchSize = 1000;
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    await index.addDocuments(batch);
  }

  console.log(`✓ Indexed ${documents.length} compositions`);
}

/** Extended filter options with festival support */
export interface SearchFilters {
  type?: string;
  deityName?: string;
  hasAudio?: boolean;
  saintName?: string;
  festivalNames?: string;
}

/** Build Meilisearch filter string from filter object */
function buildFilters(filters?: SearchFilters): string[] {
  const searchFilters: string[] = [];
  if (filters?.type) {
    searchFilters.push(`type = "${filters.type}"`);
  }
  if (filters?.deityName) {
    searchFilters.push(`deityName = "${filters.deityName}"`);
  }
  if (filters?.saintName) {
    searchFilters.push(`saintName = "${filters.saintName}"`);
  }
  if (filters?.festivalNames) {
    searchFilters.push(`festivalNames = "${filters.festivalNames}"`);
  }
  if (filters?.hasAudio !== undefined) {
    searchFilters.push(`hasAudio = ${filters.hasAudio}`);
  }
  return searchFilters;
}

// Search function - supports Devanagari + Latin
export async function searchCompositions(
  query: string,
  filters?: SearchFilters,
  options?: { limit?: number; highlights?: boolean }
): Promise<(SearchDocument | HighlightedSearchResult)[]> {
  const index = client.index(INDEX_NAME);
  const searchFilters = buildFilters(filters);

  try {
    const expandedQuery = expandTransliteration(query);
    const searchQuery = expandedQuery !== query ? expandedQuery : query;

    const results = await index.search(searchQuery, {
      filter: searchFilters.length > 0 ? searchFilters : undefined,
      limit: options?.limit ?? 50,
      attributesToHighlight: options?.highlights ? [
        'titleMarathi',
        'fullText',
        'saintName',
        'deityName',
      ] : undefined,
    });

    return results.hits as (SearchDocument | HighlightedSearchResult)[];
  } catch (error) {
    console.warn('Meilisearch failed, falling back to local database query:', error);

    const expandedQuery = expandTransliteration(query);
    const searchQuery = expandedQuery !== query ? expandedQuery : query;

    const dbCompositions = await db.composition.findMany({
      where: {
        reviewed: true,
        type: filters?.type ? { contains: filters.type, mode: 'insensitive' } : undefined,
        saint: filters?.saintName ? { nameMarathi: { contains: filters.saintName } } : undefined,
        deity: filters?.deityName ? { nameMarathi: { contains: filters.deityName } } : undefined,
        OR: [
          { titleMarathi: { contains: query } },
          { titleMarathi: { contains: searchQuery } },
          { titleTranslit: { contains: query, mode: 'insensitive' } },
          { fullText: { contains: query } },
          { fullText: { contains: searchQuery } },
          { saint: { nameMarathi: { contains: query } } },
          { saint: { nameMarathi: { contains: searchQuery } } },
          { saint: { nameTranslit: { contains: query, mode: 'insensitive' } } },
        ],
      },
      include: {
        saint: {
          select: {
            nameMarathi: true,
            nameTranslit: true,
          },
        },
        deity: {
          select: {
            nameMarathi: true,
          },
        },
      },
      take: 50,
    });

    return dbCompositions.map((comp: any) => ({
      id: comp.id,
      titleMarathi: comp.titleMarathi,
      titleTranslit: comp.titleTranslit,
      fullText: comp.fullText.substring(0, 500),
      type: comp.type.toLowerCase(),
      slug: comp.slug,
      saintName: comp.saint?.nameMarathi || null,
      saintTranslit: comp.saint?.nameTranslit || null,
      deityName: comp.deity?.nameMarathi || null,
      hasAudio: comp.audioLinks && comp.audioLinks.length > 0,
      popularityScore: 100,
    }));
  }
}

/** Search with highlights — returns Meilisearch _formatted data */
export async function searchCompositionsWithHighlights(
  query: string,
  filters?: SearchFilters,
  limit?: number
): Promise<HighlightedSearchResult[]> {
  return (await searchCompositions(query, filters, { limit, highlights: true })) as HighlightedSearchResult[];
}

/** Prefix-based autocomplete suggestions from Meilisearch */
export async function getSearchSuggestions(prefix: string): Promise<{ text: string; type: string }[]> {
  if (!prefix || prefix.length < 2) return [];

  // Also get transliteration-based suggestions
  const translitSuggestions = getTransliterationSuggestions(prefix);
  const suggestions: { text: string; type: string }[] = translitSuggestions.map(
    (s) => ({ text: s.devanagari, type: 'transliteration' })
  );

  try {
    const index = client.index(INDEX_NAME);
    const results = await index.search(prefix, {
      limit: 6,
      attributesToRetrieve: ['titleMarathi', 'titleTranslit', 'type'],
    });

    const titleSuggestions: { text: string; type: string }[] = results.hits
      .filter((hit: any) => {
        const title = (hit.titleMarathi || hit.titleTranslit || '').toLowerCase();
        return title.startsWith(prefix.toLowerCase());
      })
      .slice(0, 5)
      .map((hit: any) => ({
        text: hit.titleMarathi || hit.titleTranslit,
        type: hit.type || 'composition',
      }));

    // Merge — dedup by text, transliteration suggestions first
    const seen = new Set<string>();
    const merged = [...suggestions, ...titleSuggestions].filter((s) => {
      const key = s.text.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return merged.slice(0, 10);
  } catch {
    // Fall back to transliteration-only suggestions
    return suggestions.slice(0, 8);
  }
}

/** Aggregate suggestions from common entities (saints, deities, types) */
export async function getEntitySuggestions(prefix: string): Promise<{ text: string; type: string }[]> {
  if (!prefix || prefix.length < 1) return [];
  const lower = prefix.toLowerCase();

  // Search DB for matching saints and deities
  try {
    const [saints, deities, types] = await Promise.all([
      db.saint.findMany({
        where: {
          OR: [
            { nameTranslit: { contains: lower, mode: 'insensitive' } },
            { nameMarathi: { contains: prefix } },
          ],
        },
        select: { nameMarathi: true, nameTranslit: true },
        take: 4,
      }),
      db.deity.findMany({
        where: {
          OR: [
            { nameTranslit: { contains: lower, mode: 'insensitive' } },
            { nameMarathi: { contains: prefix } },
          ],
        },
        select: { nameMarathi: true, nameTranslit: true },
        take: 4,
      }),
      db.composition.findMany({
        where: { type: { contains: lower, mode: 'insensitive' } },
        select: { type: true },
        distinct: ['type'],
        take: 4,
      }),
    ]);

    const results: { text: string; type: string }[] = [];
    for (const s of saints) {
      results.push({ text: s.nameMarathi || s.nameTranslit || '', type: 'saint' });
    }
    for (const d of deities) {
      results.push({ text: d.nameMarathi || d.nameTranslit || '', type: 'deity' });
    }
    for (const t of types) {
      if (t.type) results.push({ text: t.type, type: 'type' });
    }
    return results.slice(0, 10);
  } catch {
    return [];
  }
}

// Test transliteration matching
export async function testTransliterationSearch() {
  console.log('\n--- Testing Devanagari + Latin Search ---');

  // Test Latin query
  const latinResults = await searchCompositions('vitthal');
  console.log(`Latin "vitthal": ${latinResults.length} results`);

  // Test Devanagari query
  const devaResults = await searchCompositions('विठ्ठल');
  console.log(`Devanagari "विठ्ठल": ${devaResults.length} results`);

  // Both should return same results if transliteration works
  const match = latinResults.length === devaResults.length;
  console.log(`Transliteration match: ${match ? '✓ PASS' : '✗ FAIL'}`);

  return match;
}

// Upsert a single composition to Meilisearch index
export async function upsertCompositionToIndex(id: string): Promise<void> {
  try {
    const comp = await db.composition.findUnique({
      where: { id },
      select: {
        id: true,
        titleMarathi: true,
        titleTranslit: true,
        fullText: true,
        type: true,
        slug: true,
        saint: {
          select: {
            nameMarathi: true,
            nameTranslit: true,
          },
        },
        deity: {
          select: {
            nameMarathi: true,
          },
        },
        audioLinks: true,
        reviewed: true,
      },
    });

    if (!comp) {
      throw new Error(`Composition ${id} not found in database`);
    }

    if (!comp.reviewed) {
      await deleteCompositionFromIndex(id);
      return;
    }

    const doc: SearchDocument = {
      id: comp.id,
      titleMarathi: comp.titleMarathi,
      titleTranslit: comp.titleTranslit,
      fullText: comp.fullText.substring(0, 500),
      type: comp.type.toLowerCase(),
      slug: comp.slug,
      saintName: comp.saint?.nameMarathi || null,
      saintTranslit: comp.saint?.nameTranslit || null,
      deityName: comp.deity?.nameMarathi || null,
      hasAudio: !!(comp.audioLinks && comp.audioLinks.length > 0),
      popularityScore: 100,
    };

    const index = client.index(INDEX_NAME);
    await index.addDocuments([doc]);
    console.log(`✓ Upserted composition ${id} to Meilisearch index`);
  } catch (err: any) {
    console.warn(`⚠️ Failed to upsert composition ${id} to Meilisearch:`, err.message || err);
  }
}

// Delete a single composition from Meilisearch index
export async function deleteCompositionFromIndex(id: string): Promise<void> {
  try {
    const index = client.index(INDEX_NAME);
    await index.deleteDocument(id);
    console.log(`✓ Deleted composition ${id} from Meilisearch index`);
  } catch (err: any) {
    console.warn(`⚠️ Failed to delete composition ${id} from Meilisearch:`, err.message || err);
  }
}