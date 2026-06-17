'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Frown, Music } from 'lucide-react';

interface SearchResult {
  id: string;
  title_marathi: string;
  title_transliteration: string;
  slug: string;
  type: string;
  full_text: string;
  saint_name: string;
  deity_name: string;
  has_audio: boolean;
}

export function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  // Mock search results - replace with actual search API integration
  const results: SearchResult[] = query
    ? [
        {
          id: '1',
          title_marathi: 'तुज रूप चिती राहो',
          title_transliteration: 'Tuze Rup Chitti Rahō',
          slug: 'tuze-rup-chitti-raho',
          type: 'abhang',
          full_text: 'तुज रूप चिती राहो । तुज चरण रमाठी राहो...',
          saint_name: 'तुकाराम महाराज',
          deity_name: 'विठ्ठल',
          has_audio: true,
        },
        {
          id: '2',
          title_marathi: 'विठ्ठल वारकरीची',
          title_transliteration: 'Vitthal Varkarichi',
          slug: 'vitthal-varkarichi',
          type: 'abhang',
          full_text: 'विठ्ठल वारकरीची चालली निरंजनी...',
          saint_name: 'तुकाराम महाराज',
          deity_name: 'विठ्ठल',
          has_audio: true,
        },
      ]
    : [];

  if (!query) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">
          कृपया शोध म्हणजेचा शब्द टाइप करा
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <Frown className="w-12 h-12 mx-auto mb-4 text-muted-foreground" aria-hidden="true" />
        <p className="text-lg text-foreground">
          "{query}" साठी कोणतेही निकाल आढळले नाही
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          इतर शब्दांनी पुन्हा प्रयत्न केला या
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-4">
        {results.length} निकाल आढळले
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((result) => (
          <Link
            key={result.id}
            href={`/abhang/${result.slug}`}
            className="block rounded-lg border border-saffron/10 bg-card p-5 hover:shadow-md hover:border-saffron/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-saffron"
          >
            <h2 className="font-marathiHeading text-lg text-maroon mb-2 line-clamp-2">
              {result.title_marathi}
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              {result.title_transliteration}
            </p>

            <div className="flex items-center gap-2 mb-3">
              {result.has_audio && (
                <Music className="w-4 h-4 text-saffron" aria-label="ऑडियो उपलब्ध" />
              )}
              <span className="text-xs px-2 py-1 bg-saffron/10 text-saffron rounded">
                {result.type}
              </span>
            </div>

            <p className="text-sm text-foreground line-clamp-3 mb-4">
              {result.full_text.substring(0, 120)}...
            </p>

            <div className="flex justify-between items-center text-sm">
              <span className="text-maroon">{result.saint_name}</span>
              <span className="text-muted-foreground">{result.deity_name}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      <nav
        className="flex justify-center gap-2 mt-8"
        aria-label="पन्नासूचक"
      >
        <button
          disabled
          className="px-4 py-2 rounded border border-saffron/20 text-saffron disabled:opacity-50 disabled:cursor-not-allowed"
        >
          मागे
        </button>
        <button className="px-4 py-2 rounded bg-saffron text-white">
          १
        </button>
        <button className="px-4 py-2 rounded border border-saffron/20 hover:bg-saffron/10">
          २
        </button>
        <button className="px-4 py-2 rounded border border-saffron/20 hover:bg-saffron/10">
          ३
        </button>
        <button className="px-4 py-2 rounded border border-saffron/20 hover:bg-saffron/10">
          पुढे
        </button>
      </nav>
    </div>
  );
}