import { NextRequest, NextResponse } from 'next/server';
import {
  searchCompositions,
  getSearchSuggestions,
  getEntitySuggestions,
  type SearchFilters,
  type HighlightedSearchResult,
} from '@/src/lib/search-client';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const mode = searchParams.get('mode') || 'search';

    if (!query || query.length < 1) {
      return NextResponse.json({ results: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } });
    }

    // Mode: suggestions
    if (mode === 'suggest') {
      const [searchSuggestions, entitySuggestions] = await Promise.all([
        getSearchSuggestions(query),
        getEntitySuggestions(query),
      ]);
      return NextResponse.json({
        suggestions: [...searchSuggestions, ...entitySuggestions].slice(0, 12),
      });
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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const results = await searchCompositions(query, filters, { limit: page * limit, highlights: true }) as HighlightedSearchResult[];

    const startIndex = (page - 1) * limit;
    const paginatedResults = results.slice(startIndex, startIndex + limit);
    const total = results.length;

    return NextResponse.json({
      results: paginatedResults.map((doc) => ({
        id: doc.id,
        titleMarathi: doc.titleMarathi,
        titleTranslit: doc.titleTranslit,
        slug: doc.slug,
        type: doc.type,
        saintName: doc.saintName,
        saintTranslit: doc.saintTranslit,
        deityName: doc.deityName,
        hasAudio: doc.hasAudio,
        snippet: doc.fullText,
        formatted: doc._formatted ? {
          titleMarathi: doc._formatted.titleMarathi,
          fullText: doc._formatted.fullText,
          saintName: doc._formatted.saintName,
          deityName: doc._formatted.deityName,
        } : undefined,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Search API error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
