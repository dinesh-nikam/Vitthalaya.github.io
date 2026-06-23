import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/src/db/client';
import { resolveCanonicalQuery } from '@/src/lib/canonical-queries';
import { searchCompositions } from '@/src/lib/search-client';
import { canonicalMetadata } from '@/src/lib/seo';
import { Music } from 'lucide-react';

interface Props {
  params: Promise<{ query: string }>;
}

export default async function CanonicalSearchPage({ params }: Props) {
  const rawParams = await params;
  const query = decodeURIComponent(rawParams.query);

  // Resolve canonical query — if it doesn't match a known entity, redirect to main search
  const canonicalQuery = await resolveCanonicalQuery(query);
  if (!canonicalQuery) {
    notFound();
  }

  // Fetch compositions from Meilisearch using the canonical query label
  const results = await searchCompositions(canonicalQuery.labelTranslit, {});

  // Also fetch by category/type for richer context
  const typeLabel = canonicalQuery.source === 'type' ? canonicalQuery.slug.toUpperCase() : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* JSON-LD for SearchResultsPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SearchResultsPage',
            name: `${canonicalQuery.label} - शोध निकाल`,
            description: `${canonicalQuery.label} यासाठीचे साहित्य — अभंग, भजन, आरत्या आणि अधिक`,
            inLanguage: 'mr',
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: results.slice(0, 10).map((r, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://digitalpandharpur.com'}/abhang/${r.slug}`,
              })),
            },
          }),
        }}
      />

      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground" aria-label="ब्रेडक्रंब">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="hover:text-saffron">मुख्यपृष्ठ</Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <Link href="/search" className="hover:text-saffron">शोध</Link>
          </li>
          <li aria-hidden="true">›</li>
          <li className="text-foreground font-medium">{canonicalQuery.label}</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-marathiHeading text-maroon mb-2">
          {canonicalQuery.label}
        </h1>
        <p className="text-muted-foreground">
          {canonicalQuery.labelTranslit}
          {results.length > 0 && (
            <span> — {results.length} निकाल</span>
          )}
        </p>
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-saffron/10 text-saffron">
            {canonicalQuery.source === 'saint' && 'संत'}
            {canonicalQuery.source === 'category' && 'श्रेणी'}
            {canonicalQuery.source === 'type' && 'प्रकार'}
            {canonicalQuery.source === 'deity' && 'देवता'}
            {canonicalQuery.source === 'festival' && 'सण'}
          </span>
        </div>
      </header>

      {/* Results */}
      {results.length === 0 ? (
        <div className="bg-card rounded-lg p-8 border border-saffron/10 text-center">
          <p className="text-muted-foreground">
            {canonicalQuery.label} यासाठी कोणतेही निकाल आढळले नाहीत.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {results.map((result, index) => (
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
                  <Music className="w-4 h-4 text-saffron" aria-label="ऑडियो उपलब्ध" />
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
      )}

      {/* Navigation links to entity pages */}
      <nav className="mt-10 pt-8 border-t border-saffron/10" aria-label="संबंधित पाने">
        <h2 className="font-marathiHeading text-xl text-maroon mb-4">
          यासंबंधी
        </h2>
        <div className="flex flex-wrap gap-3">
          {canonicalQuery.source === 'saint' && (
            <Link
              href={`/sant/${canonicalQuery.slug}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-saffron/20 text-sm hover:bg-saffron/10 transition-colors"
            >
              {canonicalQuery.label} यांची मुख्यपान
            </Link>
          )}
          {canonicalQuery.source === 'category' && (
            <Link
              href={`/category/${canonicalQuery.slug}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-saffron/20 text-sm hover:bg-saffron/10 transition-colors"
            >
              {canonicalQuery.label} श्रेणी
            </Link>
          )}
          {canonicalQuery.source === 'festival' && (
            <Link
              href={`/festival/${canonicalQuery.slug}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-saffron/20 text-sm hover:bg-saffron/10 transition-colors"
            >
              {canonicalQuery.label} सण
            </Link>
          )}
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-saffron/20 text-sm hover:bg-saffron/10 transition-colors"
          >
            मुख्यपृष्ठ
          </Link>
        </div>
      </nav>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const rawParams = await params;
  const query = decodeURIComponent(rawParams.query);
  const canonicalQuery = await resolveCanonicalQuery(query);

  if (!canonicalQuery) {
    return { title: 'शोध निकाल - डिजिटल पंढरपूर' };
  }

  return {
    title: `${canonicalQuery.label} - शोध निकाल - डिजिटल पंढरपूर`,
    description: `${canonicalQuery.label} (${canonicalQuery.labelTranslit}) यासाठीचे साहित्य — अभंग, भजन, आरत्या व संत साहित्य डिजिटल पंढरपूर वर`,
    ...canonicalMetadata({ canonical: `/search/${query}` }),
    openGraph: {
      title: `${canonicalQuery.label} - शोध`,
      description: `${canonicalQuery.label} यासाठीचे साहित्य`,
      type: 'website',
      locale: 'mr_IN',
    },
  };
}
