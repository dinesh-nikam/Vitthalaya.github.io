/**
 * Reading Lists — browse public user-curated composition collections.
 */
import Link from 'next/link';
import type { Metadata } from 'next';
import { db } from '../../src/db/client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'वाचन यादी — Digital Pandharpur',
  description: 'Browse public reading lists curated by the community. Collections of abhang, bhajan, aarti, stotra, and Marathi devotional compositions.',
  openGraph: {
    title: 'वाचन यादी — Digital Pandharpur',
    description: 'Community-curated devotional reading lists.',
    locale: 'mr_IN',
  },
};

interface SearchParams {
  searchParams: Promise<{ page?: string }>;
}

export default async function ReadingListsPage({ searchParams }: SearchParams) {
  const params = await searchParams;
  const page = parseInt(params.page ?? '1', 10);
  const limit = 20;

  const [lists, total] = await Promise.all([
    db.userCollection.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        creator: { select: { id: true, name: true, imageUrl: true } },
        _count: { select: { compositions: true } },
      },
    }),
    db.userCollection.count({ where: { isPublic: true } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="bg-gradient-to-br from-maroon-800 to-maroon-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold">📖 वाचन यादी</h1>
          <p className="text-sand-200 mt-2">Community-curated reading lists of devotional compositions</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {lists.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">No reading lists yet. Be the first to create one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {lists.map((list) => (
              <Link
                key={list.id}
                href={`/reading-lists/${list.slug}`}
                className="group bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                <h2 className="text-lg font-bold text-maroon-800 mb-2 group-hover:text-saffron transition-colors line-clamp-2">
                  {list.name}
                </h2>
                {list.description && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{list.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{list._count.compositions} compositions</span>
                  {list.creator?.name && (
                    <span className="flex items-center gap-1">
                      <span className="w-5 h-5 bg-saffron-100 rounded-full flex items-center justify-center text-[10px] text-saffron-600 font-bold">
                        {list.creator.name.charAt(0)}
                      </span>
                      {list.creator.name}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            {page > 1 && (
              <Link
                href={`/reading-lists?page=${page - 1}`}
                className="px-4 py-2 bg-white rounded-lg shadow-sm text-sm hover:bg-sand-50"
              >
                ← Previous
              </Link>
            )}
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <Link
                href={`/reading-lists?page=${page + 1}`}
                className="px-4 py-2 bg-white rounded-lg shadow-sm text-sm hover:bg-sand-50"
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
