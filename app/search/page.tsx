import { Suspense } from 'react';
import SearchPageClient from './search-page-client';
import { getTopCanonicalQueries } from '@/src/lib/canonical-queries';
import { db } from '@/src/db/client';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; deity?: string; saint?: string; festival?: string; hasAudio?: string }>;
}) {
  const params = await searchParams;

  // Pre-fetch filter options (server-side)
  const [saints, deities, festivals] = await Promise.all([
    db.saint.findMany({ select: { nameMarathi: true, slug: true }, orderBy: { nameTranslit: 'asc' } }),
    db.deity.findMany({ select: { nameMarathi: true, slug: true }, orderBy: { nameTranslit: 'asc' } }),
    db.festival.findMany({ select: { nameMarathi: true, slug: true }, orderBy: { name: 'asc' } }),
  ]);

  const canonicalQueries = params.q ? [] : await getTopCanonicalQueries(24);

  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8"><p className="text-muted-foreground">लोड होत आहे...</p></div>}>
      <SearchPageClient
        initialQuery={params.q || ''}
        initialType={params.type || ''}
        initialDeity={params.deity || ''}
        initialSaint={params.saint || ''}
        initialFestival={params.festival || ''}
        initialHasAudio={params.hasAudio === 'true'}
        saints={saints.map((s) => ({ name: s.nameMarathi, slug: s.slug }))}
        deities={deities.map((d) => ({ name: d.nameMarathi, slug: d.slug }))}
        festivals={festivals.map((f) => ({ name: f.nameMarathi, slug: f.slug }))}
        canonicalQueries={canonicalQueries.map((cq) => ({ label: cq.label, slug: cq.slug }))}
      />
    </Suspense>
  );
}

/**
 * For the /search page with ?q=... query params: noindex to prevent
 * infinite crawl of arbitrary search queries.
 * The canonical search pages at /search/[query] are the indexed versions.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const hasQuery = !!params.q;

  if (hasQuery) {
    return {
      robots: { index: false, follow: true },
      title: `शोध निकाल - "${params.q}" - डिजिटल पंढरपूर`,
    };
  }

  return {
    title: 'शोध - डिजिटल पंढरपूर',
    description: 'मराठी भक्ती साहित्य शोधा — अभंग, भजन, आरत्या, स्तोत्रे आणि संत साहित्य',
    openGraph: {
      title: 'शोध - डिजिटल पंढरपूर',
      description: 'लाखो अभंग, भजन, आरत्या शोधा',
      locale: 'mr_IN',
    },
  };
}
