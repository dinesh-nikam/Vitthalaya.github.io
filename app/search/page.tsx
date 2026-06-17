import { searchCompositions, type SearchDocument } from '@/src/lib/search-client';
import Link from 'next/link';
import { Frown, Music } from 'lucide-react';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; deity?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || '';
  const typeFilter = params.type;
  const deityFilter = params.deity;

  let results: SearchDocument[] = [];

  if (query) {
    try {
      results = await searchCompositions(query, {
        type: typeFilter,
        deityName: deityFilter,
      });
    } catch (error) {
      console.error('Search error:', error);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-marathiHeading text-maroon mb-6">
        शोध निकाल{query && ` - "${query}"`}
      </h1>

      {query && results.length === 0 && (
        <div className="text-center py-12">
          <Frown className="w-12 h-12 mx-auto mb-4 text-muted-foreground" aria-hidden="true" />
          <p className="text-lg text-foreground">
            "{query}" साठी कोणतेही निकाल आढळले नाही
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            इतर शब्दांनी पुन्हा प्रयत्न केला या
          </p>
        </div>
      )}

      {results.length > 0 && (
        <>
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
                  {result.titleMarathi}
                </h2>
                <p className="text-sm text-muted-foreground mb-3">
                  {result.titleTranslit}
                </p>

                <div className="flex items-center gap-2 mb-3">
                  {result.hasAudio && (
                    <Music
                      className="w-4 h-4 text-saffron"
                      aria-label="ऑडियो उपलब्ध"
                    />
                  )}
                  <span className="text-xs px-2 py-1 bg-saffron/10 text-saffron rounded">
                    {result.type}
                  </span>
                </div>

                <p className="text-sm text-foreground line-clamp-3 mb-4">
                  {result.fullText}...
                </p>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-maroon">{result.saintName}</span>
                  <span className="text-muted-foreground">{result.deityName}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}