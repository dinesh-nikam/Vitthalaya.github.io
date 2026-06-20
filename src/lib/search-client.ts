/**
 * Meilisearch client for Digital Pandharpur
 * Indexes compositions from PostgreSQL for instant search
 */

import { Meilisearch } from 'meilisearch';
import { db } from '@/src/db/client';

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
    filterableAttributes: ['type', 'deityName', 'hasAudio'],
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

// Search function - supports Devanagari + Latin
export async function searchCompositions(
  query: string,
  filters?: {
    type?: string;
    deityName?: string;
    hasAudio?: boolean;
  }
): Promise<SearchDocument[]> {
  const index = client.index(INDEX_NAME);

  const searchFilters: string[] = [];
  if (filters?.type) {
    searchFilters.push(`type = "${filters.type}"`);
  }
  if (filters?.deityName) {
    searchFilters.push(`deityName = "${filters.deityName}"`);
  }
  if (filters?.hasAudio !== undefined) {
    searchFilters.push(`hasAudio = ${filters.hasAudio}`);
  }

  try {
    const lowercaseQuery = query.toLowerCase().trim();
    const dict: Record<string, string> = {
      'vitthal': 'विठ्ठल',
      'vithoba': 'विठोबा',
      'pandurang': 'पांडुरंग',
      'vithu': 'विठू',
      'pandharpur': 'पंढरपूर',
      'tukaram': 'तुकाराम',
      'dnyaneshwar': 'ज्ञानेश्वर',
      'eknath': 'एकनाथ',
      'namdev': 'नामदेव',
      'haripath': 'हरिपाठ',
      'abhang': 'अभंग',
      'aarti': 'आरती',
    };
    const expandedQuery = dict[lowercaseQuery];
    const searchQuery = expandedQuery ? `${query} ${expandedQuery}` : query;

    const results = await index.search(searchQuery, {
      filter: searchFilters.length > 0 ? searchFilters : undefined,
      limit: 50,
    });

    return results.hits as SearchDocument[];
  } catch (error) {
    console.warn('Meilisearch failed, falling back to local database query:', error);

    const hasLatin = /[a-zA-Z]/.test(query);
    const lowercaseQuery = query.toLowerCase().trim();

    // Basic transliteration dictionary for key words
    const dict: Record<string, string> = {
      'vitthal': 'विठ्ठल',
      'vithoba': 'विठोबा',
      'pandurang': 'पांडुरंग',
      'vithu': 'विठू',
      'pandharpur': 'पंढरपूर',
      'tukaram': 'तुकाराम',
      'dnyaneshwar': 'ज्ञानेश्वर',
      'eknath': 'एकनाथ',
      'namdev': 'नामदेव',
      'haripath': 'हरिपाठ',
      'abhang': 'अभंग',
      'aarti': 'आरती',
    };
    const expandedQuery = dict[lowercaseQuery] || query;

    const dbCompositions = await db.composition.findMany({
      where: {
        reviewed: true,
        type: filters?.type ? { equals: filters.type, mode: 'insensitive' } : undefined,
        deity: filters?.deityName ? { nameMarathi: { contains: filters.deityName } } : undefined,
        OR: [
          { titleMarathi: { contains: query } },
          { titleMarathi: { contains: expandedQuery } },
          { titleTranslit: { contains: query, mode: 'insensitive' } },
          { fullText: { contains: query } },
          { fullText: { contains: expandedQuery } },
          { saint: { nameMarathi: { contains: query } } },
          { saint: { nameMarathi: { contains: expandedQuery } } },
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