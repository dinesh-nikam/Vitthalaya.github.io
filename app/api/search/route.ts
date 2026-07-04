import { NextRequest, NextResponse } from 'next/server';
import {
  searchCompositions,
  getSearchSuggestions,
  getEntitySuggestions,
  type SearchFilters,
  type HighlightedSearchResult,
} from '@/src/lib/search-client';
import { hybridSearch } from '@/src/lib/semantic-search';
import {
  errorResponse,
  parsePagination,
  buildPagination,
  CORS_HEADERS,
} from '@/src/lib/api-response';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const mode = searchParams.get('mode') || 'search';

    if (!query || query.length < 1) {
      return NextResponse.json(
        { results: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } },
        { headers: CORS_HEADERS }
      );
    }

    // Mode: suggestions
    if (mode === 'suggest') {
      const [searchSuggestions, entitySuggestions] = await Promise.all([
        getSearchSuggestions(query),
        getEntitySuggestions(query),
      ]);
      return NextResponse.json(
        { suggestions: [...searchSuggestions, ...entitySuggestions].slice(0, 12) },
        { headers: CORS_HEADERS }
      );
    }

    // Build filters from query params
    const filters: SearchFilters = {};
    const filterType = searchParams.get('type')?.trim();
    const deityName = searchParams.get('deity')?.trim();
    const saintName = searchParams.get('saint')?.trim();
    const hasAudio = searchParams.get('hasAudio');
    if (filterType) filters.type = filterType;
    if (deityName) filters.deityName = deityName;
    if (saintName) filters.saintName = saintName;
    if (hasAudio === 'true') filters.hasAudio = true;

    // Pagination
    const { page, limit } = parsePagination(searchParams);

    // Enable semantic search by default (can be disabled via query param)
    const useSemantic = searchParams.get('semantic') !== 'false';

    let results: (HighlightedSearchResult | { id: string; titleMarathi: string; titleTranslit: string; fullText: string; type: string; slug: string; saintName: string | null; deityName: string | null; hasAudio: boolean })[];
    let searchType: 'lexical' | 'hybrid' = 'lexical';

    // Use hybrid search if semantic is enabled and we have enough query length
    if (useSemantic && query.length >= 3) {
      try {
        const hybridResults = await hybridSearch(query, {
          limit: page * limit,
          type: filterType,
          deityName,
          saintName,
          useSemantic: true,
        });

        results = hybridResults.map(r => ({
          id: r.id,
          titleMarathi: r.titleMarathi,
          titleTranslit: r.titleTranslit,
          fullText: r.fullText,
          type: r.type,
          slug: r.slug,
          saintName: r.saintName,
          deityName: r.deityName,
          hasAudio: r.hasAudio,
          // Preserve hybrid search metadata
          _hybridScore: r.score,
          _source: r.source,
        }));
        searchType = 'hybrid';
      } catch {
        // Fallback to lexical-only search
        results = await searchCompositions(query, filters, { limit: page * limit, highlights: true }) as HighlightedSearchResult[];
      }
    } else {
      // Use lexical-only search for short queries
      results = await searchCompositions(query, filters, { limit: page * limit, highlights: true }) as HighlightedSearchResult[];
    }

    const startIndex = (page - 1) * limit;
    const paginatedResults = results.slice(startIndex, startIndex + limit);
    const total = results.length;

    return NextResponse.json(
      {
        results: paginatedResults.map((doc) => ({
          id: doc.id,
          titleMarathi: doc.titleMarathi,
          titleTranslit: doc.titleTranslit,
          slug: doc.slug,
          type: doc.type,
          saintName: doc.saintName,
          saintTranslit: 'saintTranslit' in doc ? doc.saintTranslit : null,
          deityName: doc.deityName,
          hasAudio: doc.hasAudio,
          snippet: doc.fullText,
          formatted: '_formatted' in doc && doc._formatted ? {
            titleMarathi: doc._formatted.titleMarathi,
            fullText: doc._formatted.fullText,
            saintName: doc._formatted.saintName,
            deityName: doc._formatted.deityName,
          } : undefined,
          // Include hybrid search metadata if available
          _score: '_hybridScore' in doc ? (doc as any)._hybridScore : undefined,
          _source: '_source' in doc ? (doc as any)._source : undefined,
        })),
        pagination: buildPagination(page, limit, total),
        // Include search type in response for debugging/analytics
        searchType,
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Search API error:', err);
    return errorResponse(msg, 500);
  }
}
