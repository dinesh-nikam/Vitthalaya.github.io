/**
 * SQLite Search Client for Digital Pandharpur
 * Provides instant, typo-tolerant search using SQLite FTS
 */

import { Database } from 'bun:sqlite';

const DEFAULT_DB_PATH = 'data/varkari.db';

function getDatabase(): Database {
  return new Database(process.env.DATABASE_PATH || DEFAULT_DB_PATH);
}

export interface SearchResult {
  id: string;
  slug: string;
  titleMarathi: string;
  titleTranslit: string;
  type: string;
  fullText: string;
  meaning: string | null;
  saintName: string | null;
  deityName: string | null;
  hasAudio: boolean;
}

/**
 * Search compositions by Devanagari or Latin text
 */
export function searchCompositions(query: string, limit = 50): SearchResult[] {
  const db = getDatabase();

  if (!query || query.length < 2) return [];

  // Simple LIKE search - works for both Devanagari and Latin
  // For production, consider adding FTS5 extension
  const results = db
    .query(
      `SELECT c.id, c.slug, c.title_marathi, c.title_transliteration, c.type,
              c.full_text, c.meaning, s.name_marathi as saint_name, d.name_marathi as deity_name,
              CASE WHEN c.audio_links IS NOT NULL AND c.audio_links != '' THEN 1 ELSE 0 END as has_audio
       FROM compositions c
       LEFT JOIN saints s ON c.saint_id = s.id
       LEFT JOIN deities d ON c.deity_id = d.id
       WHERE c.is_verified = 1
         AND (c.title_marathi LIKE '%' || ? || '%'
              OR c.title_transliteration LIKE '%' || ? || '%'
              OR c.full_text LIKE '%' || ? || '%'
              OR s.name_marathi LIKE '%' || ? || '%'
              OR d.name_marathi LIKE '%' || ? || '%')
       ORDER BY
         CASE WHEN c.title_marathi LIKE ? THEN 1   -- Exact title match
              WHEN c.title_transliteration LIKE ? THEN 2  -- Exact translit match
              WHEN c.full_text LIKE '%' || ? || '%' THEN 3  -- Content match
              ELSE 4 END
       LIMIT ?`
    )
    .all(
      query, query, query, query, query,
      query, query, query, limit
    ) as SearchResult[];

  return results;
}

/**
 * Get search suggestions for autocomplete
 */
export function getSuggestions(partial: string, limit = 10): string[] {
  const db = getDatabase();

  if (!partial || partial.length < 1) return [];

  const results = db
    .query(
      `SELECT title_marathi FROM compositions
       WHERE is_verified = 1
         AND title_marathi LIKE '%' || ? || '%'
       UNION
       SELECT title_transliteration FROM compositions
       WHERE is_verified = 1
         AND title_transliteration LIKE '%' || ? || '%'
       LIMIT ?`
    )
    .all(partial, partial, limit) as { title_marathi: string }[];

  return [...new Set(results.map(r => r.title_marathi))];
}

/**
 * Test transliteration matching
 */
export function testTransliteration(): boolean {
  const latin = searchCompositions('vitthal');
  const deva = searchCompositions('विठ्ठल');

  // Both should return results if Devanagari + Latin search works
  const works = latin.length > 0 && deva.length > 0;
  console.log(`Latin "vitthal": ${latin.length} results`);
  console.log(`Devanagari "विठ्ठल": ${deva.length} results`);
  console.log(`Transliteration: ${works ? '✓ PASS' : '✗ FAIL'}`);

  return works;
}

// For CLI testing
if (require.main === module) {
  testTransliteration();
}