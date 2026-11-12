import { Suspense } from 'react';
import SearchPageClient from './search-page-client';
import SearchLoading from './loading';
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
    db.deity.findMany({ select: { nameMarathi: true, nameTranslit: true }, orderBy: { nameTranslit: 'asc' } }),
    db.festival.findMany({ select: { nameMarathi: true, nameTranslit: true }, orderBy: { nameTranslit: 'asc' } }),
  ]);

  const canonicalQueries = params.q ? [] : await getTopCanonicalQueries(24);

  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchPageClient
        initialQuery={params.q || ''}
        initialType={params.type || ''}
        initialDeity={params.deity || ''}
        initialSaint={params.saint || ''}
        initialFestival={params.festival || ''}
        initialHasAudio={params.hasAudio === 'true'}
        saints={saints.map((s) => ({ name: s.nameMarathi, slug: s.slug }))}
        deities={deities.map((d) => ({ name: d.nameMarathi, slug: d.nameTranslit.toLowerCase().replace(/\s+/g, '-') }))}
        festivals={festivals.map((f) => ({ name: f.nameMarathi, slug: f.nameTranslit.toLowerCase().replace(/\s+/g, '-') }))}
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
  const q = params.q?.trim();

  if (q) {
    return {
      title: `"${q}" — शोध | Digital Pandharpur`,
      description: `Search results for "${q}" across abhangs, saints, deities, and festivals.`,
      robots: { index: false, follow: true },
    };
  }

  return {
    title: 'शोध — Digital Pandharpur',
    description: 'Search thousands of abhangs, poems, saints, deities, and pilgrimage themes.',
    robots: { index: true, follow: true },
  };
}
