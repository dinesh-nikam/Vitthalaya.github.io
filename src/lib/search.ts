/**
 * Search client facade for Digital Pandharpur.
 * Resolves to the active Meilisearch implementation with DB fallback.
 */

import { searchCompositions, getSearchSuggestions } from './search-client';

export interface CompositionDocument {
  id: string;
  title_marathi: string;
  title_transliteration: string;
  slug: string;
  type: string;
  full_text: string;
  meaning: string | null;
  saint_id: string | null;
  saint_name: string | null;
  saint_transliteration: string | null;
  deity_name: string | null;
  has_audio: boolean;
  popularity_score: number;
}

// Forward to active Meilisearch search client
export async function searchServer(query: string): Promise<CompositionDocument[]> {
  const hits = await searchCompositions(query);
  return hits.map((hit: any) => ({
    id: hit.id,
    title_marathi: hit.titleMarathi,
    title_transliteration: hit.titleTranslit,
    slug: hit.slug,
    type: hit.type,
    full_text: hit.fullText,
    meaning: hit.meaning || null,
    saint_id: hit.saintId || null,
    saint_name: hit.saintName || null,
    saint_transliteration: hit.saintTranslit || null,
    deity_name: hit.deityName || null,
    has_audio: hit.hasAudio,
    popularity_score: hit.popularityScore || 100,
  }));
}

export function searchClientSide(query: string, callback: (results: CompositionDocument[]) => void) {
  searchServer(query).then(callback);
}

export async function getSuggestions(partial: string): Promise<string[]> {
  const suggestions = await getSearchSuggestions(partial);
  return suggestions.map((s) => s.text);
}