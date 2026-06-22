import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '../../src/db/client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'पुस्तके — Digital Pandharpur',
  description: 'Browse devotional books curated from thousands of Marathi abhang, aarti, bhajan, and stotra compositions. Available in pocket, standard, hardcover, and collector editions.',
  openGraph: {
    title: 'पुस्तके — Digital Pandharpur',
    description: 'Devotional books curated from 1000s of Marathi compositions. Available in multiple formats and editions.',
    type: 'website',
    locale: 'mr_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'पुस्तके — Digital Pandharpur',
    description: 'Devotional books curated from 1000s of Marathi compositions.',
  },
};

interface SearchParams {
  searchParams: Promise<{
    type?: string;
    saint?: string;
    deity?: string;
    sort?: string;
    q?: string;
  }>;
}

const BOOK_TYPE_LABELS: Record<string, string> = {
  POCKET: 'पॉकेट', STANDARD: 'मानक', PREMIUM_HARDCOVER: 'प्रीमियम',
  COLLECTOR: 'कलेक्टर', TEMPLE: 'मंदिर',
};

export default async function BookMarketplacePage({ searchParams }: SearchParams) {
  const params = await searchParams;

  const where: any = { isPublic: true, status: 'PUBLISHED' };

  if (params.type) where.bookType = params.type;
  if (params.saint) where.saintId = params.saint;
  if (params.deity) where.deityId = params.deity;
  if (params.q) {
    where.OR = [
      { titleMarathi: { contains: params.q, mode: 'insensitive' } },
      { titleEnglish: { contains: params.q, mode: 'insensitive' } },
    ];
  }

  const orderBy: any = params.sort === 'oldest'
    ? { createdAt: 'asc' }
    : params.sort === 'price'
      ? { basePrice: 'asc' }
      : { createdAt: 'desc' };

  const books = await db.bookPublication.findMany({
    where,
    orderBy,
    take: 50,
    select: {
      id: true, slug: true, titleMarathi: true, titleEnglish: true,
      bookType: true, totalCompositions: true, totalPages: true,
      createdAt: true,
      editions: { select: { format: true, price: true }, take: 3 },
      _count: { select: { orders: true, compositions: true } },
    },
  });

  const recentBooks = !params.q && !params.type
    ? await db.bookPublication.findMany({
        where: { isPublic: true, status: 'PUBLISHED', bookType: 'PREMIUM_HARDCOVER' },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: { id: true, slug: true, titleMarathi: true, bookType: true, totalPages: true },
      })
    : [];

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-maroon-800 to-maroon-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold">📚 पुस्तके</h1>
          <p className="text-sand-200 mt-2">Devotional books curated from 1000s of compositions</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-8 flex flex-wrap gap-3 items-center">
          <form className="flex-1 min-w-[200px]">
            <input
              name="q"
              defaultValue={params.q}
              placeholder="शीर्षकानुसार शोधा..."
              className="w-full px-4 py-2 border border-sand-200 rounded-lg text-sm focus:ring-2 focus:ring-saffron focus:border-transparent outline-none"
            />
          </form>

          <div className="flex gap-2 flex-wrap">
            {['POCKET', 'STANDARD', 'PREMIUM_HARDCOVER', 'COLLECTOR'].map((t) => (
              <Link
                key={t}
                href={`/books?type=${t}`}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  params.type === t ? 'bg-saffron text-white border-saffron' : 'bg-white text-gray-600 border-sand-200 hover:border-gray-300'
                }`}
              >
                {BOOK_TYPE_LABELS[t] ?? t}
              </Link>
            ))}
            {params.type && (
              <Link href="/books" className="px-3 py-1.5 rounded-full text-xs border border-red-200 text-red-500 hover:bg-red-50">
                रीसेट
              </Link>
            )}
          </div>
        </div>

        {/* Featured */}
        {recentBooks.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-maroon-800 mb-4">✨ प्रीमियम पुस्तके</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {recentBooks.map((book) => (
                <Link key={book.id} href={`/books/${book.slug}`}
                  className="group bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-40 bg-gradient-to-br from-saffron to-maroon-700 flex items-center justify-center p-4">
                    <h3 className="text-white font-bold text-center text-sm leading-relaxed">
                      {book.titleMarathi}
                    </h3>
                  </div>
                  <div className="p-3 text-xs text-gray-500">
                    {BOOK_TYPE_LABELS[book.bookType] ?? book.bookType} · {book.totalPages ?? '-'}p
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Book Grid */}
        {books.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">कोणतीही पुस्तके सापडली नाहीत</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book) => (
              <Link key={book.id} href={`/books/${book.slug}`}
                className="group bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5">
                {/* Cover area */}
                <div className="h-48 bg-gradient-to-br from-maroon-700 to-maroon-900 flex items-center justify-center p-6">
                  <div className="text-center">
                    <h3 className="text-white font-bold text-lg leading-relaxed line-clamp-3">
                      {book.titleMarathi}
                    </h3>
                    {book.titleEnglish && (
                      <p className="text-saffron-300 text-xs mt-1">{book.titleEnglish}</p>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="px-2 py-0.5 bg-saffron-50 text-saffron-700 rounded">
                      {BOOK_TYPE_LABELS[book.bookType] ?? book.bookType}
                    </span>
                    <span>{book._count.compositions} रचना</span>
                    <span>{book.totalPages ?? '-'} पाने</span>
                  </div>
                  {book._count.orders > 0 && (
                    <p className="text-xs text-gray-400">{book._count.orders} विक्री झाली</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
