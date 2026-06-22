'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search } from 'lucide-react';
import SearchInput from '@/components/search-input';
import SearchFilters, { type FilterState } from '@/components/search-filters';
import SearchResultsList, { type SearchResultItem } from '@/components/search-results-list';


interface Props {
  initialQuery: string;
  initialType: string;
  initialDeity: string;
  initialSaint: string;
  initialFestival: string;
  initialHasAudio: boolean;
  saints: { name: string; slug: string }[];
  deities: { name: string; slug: string }[];
  festivals: { name: string; slug: string }[];
  canonicalQueries: { label: string; slug: string }[];
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function SearchPageClient({
  initialQuery,
  initialType,
  initialDeity,
  initialSaint,
  initialFestival,
  initialHasAudio,
  saints,
  deities,
  festivals,
  canonicalQueries,
}: Props) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    type: initialType,
    deityName: initialDeity,
    saintName: initialSaint,
    festivalNames: initialFestival,
    hasAudio: initialHasAudio,
  });
  const debouncedQuery = useDebounce(query, 300);
  const debouncedFilters = useDebounce(filters, 300);
  const isFirstRender = useRef(true);

  // Fetch search results whenever query or filters change
  useEffect(() => {
    // Skip the initial render — data comes from server props
    if (isFirstRender.current) {
      isFirstRender.current = false;
      const hasInitialFilterOrQuery = initialQuery || initialType || initialDeity || initialSaint || initialFestival || initialHasAudio;
      if (!hasInitialFilterOrQuery) return;
    }

    if (!debouncedQuery && !debouncedFilters.type && !debouncedFilters.deityName && !debouncedFilters.saintName && !debouncedFilters.festivalNames && !debouncedFilters.hasAudio) {
      setResults([]);
      setTotal(0);
      return;
    }

    setIsLoading(true);

    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (debouncedFilters.type) params.set('type', debouncedFilters.type);
    if (debouncedFilters.deityName) params.set('deity', debouncedFilters.deityName);
    if (debouncedFilters.saintName) params.set('saint', debouncedFilters.saintName);
    if (debouncedFilters.festivalNames) params.set('festival', debouncedFilters.festivalNames);
    if (debouncedFilters.hasAudio) params.set('hasAudio', 'true');

    const controller = new AbortController();

    fetch(`/api/search?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setResults(data.results || []);
        setTotal(data.pagination?.total || 0);
        setIsLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    // Update URL without navigation
    const newParams = new URLSearchParams(searchParams.toString());
    if (debouncedQuery) {
      newParams.set('q', debouncedQuery);
    } else {
      newParams.delete('q');
    }

    if (debouncedFilters.type) {
      newParams.set('type', debouncedFilters.type);
    } else {
      newParams.delete('type');
    }

    if (debouncedFilters.deityName) {
      newParams.set('deity', debouncedFilters.deityName);
    } else {
      newParams.delete('deity');
    }

    if (debouncedFilters.saintName) {
      newParams.set('saint', debouncedFilters.saintName);
    } else {
      newParams.delete('saint');
    }

    if (debouncedFilters.festivalNames) {
      newParams.set('festival', debouncedFilters.festivalNames);
    } else {
      newParams.delete('festival');
    }

    if (debouncedFilters.hasAudio) {
      newParams.set('hasAudio', 'true');
    } else {
      newParams.delete('hasAudio');
    }

    const url = `/search?${newParams.toString()}`;
    window.history.replaceState(null, '', url);

    return () => controller.abort();
  }, [debouncedQuery, debouncedFilters]);

  // Sync URL params back to state on mount (browser back/forward)
  useEffect(() => {
    const q = searchParams.get('q') || '';
    if (q !== query) {
      setQuery(q);
    }

    const type = searchParams.get('type') || '';
    const deity = searchParams.get('deity') || '';
    const saint = searchParams.get('saint') || '';
    const festival = searchParams.get('festival') || '';
    const hasAudio = searchParams.get('hasAudio') === 'true';

    setFilters((prev) => {
      if (
        prev.type !== type ||
        prev.deityName !== deity ||
        prev.saintName !== saint ||
        prev.festivalNames !== festival ||
        prev.hasAudio !== hasAudio
      ) {
        return {
          type,
          deityName: deity,
          saintName: saint,
          festivalNames: festival,
          hasAudio,
        };
      }
      return prev;
    });
  }, [searchParams]); // eslint-disable-line

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
  }, []);

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ type: '', deityName: '', saintName: '', festivalNames: '', hasAudio: false });
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-marathiHeading text-maroon mb-6">
        {query ? `शोध निकाल - "${query}"` : 'शोध'}
      </h1>

      {/* Search Input */}
      <div className="mb-8 max-w-2xl">
        <SearchInput
          initialQuery={query}
          onSearch={handleSearch}
          navigateOnSubmit={false}
          showSuggestions={true}
          variant="default"
          placeholder="अभंग, संत, देवता, कीवर्ड शोधा..."
          autoFocus={!initialQuery}
        />
      </div>

      {/* Canonical search suggestions (no query yet) */}
      {!query && canonicalQueries.length > 0 && (
        <section className="mb-10" aria-labelledby="popular-searches">
          <h2 id="popular-searches" className="font-marathiHeading text-xl text-maroon mb-4">
            लोकप्रिय शोध
          </h2>
          <div className="flex flex-wrap gap-2">
            {canonicalQueries.map((cq) => (
              <Link
                key={cq.slug}
                href={`/search/${cq.slug}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-saffron/20 bg-saffron/5 text-sm hover:bg-saffron/10 hover:border-saffron/30 transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-saffron" />
                {cq.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Search Results with Filters Sidebar */}
      {query && (
        <div className="flex flex-col md:flex-row gap-6">
          {/* Filters sidebar */}
          <aside className="md:w-64 shrink-0" aria-label="शोध फिल्टर">
            <SearchFilters
              filters={filters}
              onChange={handleFilterChange}
              onReset={resetFilters}
              saints={saints}
              deities={deities}
              festivals={festivals}
            />
          </aside>

          {/* Results */}
          <main className="flex-1 min-w-0">
            <SearchResultsList
              results={results}
              query={query}
              isLoading={isLoading}
              total={total}
            />
          </main>
        </div>
      )}
    </div>
  );
}
