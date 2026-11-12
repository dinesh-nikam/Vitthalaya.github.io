import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '../../src/db/client';
import { BookOpen, Search, Sparkles, ChevronRight, ArrowRight } from 'lucide-react';
import '@/app/homepage.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'भक्ती ग्रंथ संग्रह : डिजिटल पंढरपूर',
  description: 'वारकरी संतांचे अभंग, आरत्या, भजने आणि स्तोत्रांचे प्रमाणित ग्रंथ आणि मुद्रित आवृत्त्या.',
  openGraph: {
    title: 'भक्ती ग्रंथ संग्रह : डिजिटल पंढरपूर',
    description: 'वारकरी संतांचे अभंग, आरत्या, भजने आणि स्तोत्रांचे प्रमाणित ग्रंथ आणि मुद्रित आवृत्त्या.',
    type: 'website',
    locale: 'mr_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'भक्ती ग्रंथ संग्रह : डिजिटल पंढरपूर',
    description: 'वारकरी संतांचे अभंग, आरत्या, भजने आणि स्तोत्रांचे प्रमाणित ग्रंथ आणि मुद्रित आवृत्त्या.',
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
  POCKET: 'पॉकेट आवृत्ती',
  STANDARD: 'मानक आवृत्ती',
  PREMIUM_HARDCOVER: 'प्रीमियम हार्डकव्हर',
  COLLECTOR: 'कलेक्टर आवृत्ती',
  TEMPLE: 'मंदिर आवृत्ती',
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

  const orderBy: any =
    params.sort === 'oldest'
      ? { createdAt: 'asc' }
      : params.sort === 'price'
      ? { basePrice: 'asc' }
      : { createdAt: 'desc' };

  const books = await db.bookPublication.findMany({
    where,
    orderBy,
    take: 50,
    select: {
      id: true,
      slug: true,
      titleMarathi: true,
      titleEnglish: true,
      bookType: true,
      totalCompositions: true,
      totalPages: true,
      createdAt: true,
      editions: { select: { format: true, price: true }, take: 3 },
      _count: { select: { orderItems: true, compositions: true } },
    },
  });

  const recentBooks =
    !params.q && !params.type
      ? await db.bookPublication.findMany({
          where: { isPublic: true, status: 'PUBLISHED', bookType: 'PREMIUM_HARDCOVER' },
          orderBy: { createdAt: 'desc' },
          take: 4,
          select: { id: true, slug: true, titleMarathi: true, bookType: true, totalPages: true },
        })
      : [];

  return (
    <div className="vitthalaya-shell min-h-screen py-10">
      <div className="vitthalaya-container max-w-5xl">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6" aria-label="ब्रेडक्रंब">
          <ol className="flex items-center gap-2 text-xs font-marathi text-[var(--dp-muted)]">
            <li>
              <Link href="/" className="hover:text-[var(--dp-gold)] transition-colors">
                मुख्यपृष्ठ
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li className="text-[var(--dp-ink)]">भक्ती ग्रंथ भांडार</li>
          </ol>
        </nav>

        {/* Page Header */}
        <header className="mb-12 text-center max-w-3xl mx-auto">
          <p className="text-xs text-[var(--dp-gold)] font-marathi mb-2">
            पवित्र साहित्य मुद्रण व वाचन
          </p>
          <h1 className="vitthalaya-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
            वारकरी भक्ती ग्रंथ संग्रह
          </h1>
          <p className="vitthalaya-prose text-sm sm:text-base text-[var(--dp-ink-dim)] leading-relaxed mb-6">
            हजारो अभंग, आरत्या आणि स्तोत्रांमधून संपादित केलेले प्रमाणित ग्रंथ, पोथ्या आणि विशेष आवृत्त्या.
          </p>

          <div className="flex flex-wrap justify-center gap-6 text-xs font-marathi text-[var(--dp-muted)] py-3 px-6 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] max-w-md mx-auto">
            <span>उपलब्ध ग्रंथ: <strong className="text-[var(--dp-ink)]">{books.length}</strong></span>
            <span>प्रकार: <strong className="text-[var(--dp-ink)]">५ आवृत्त्या</strong></span>
          </div>
        </header>

        {/* Search and Filters */}
        <div className="vitthalaya-card rounded p-4 mb-10 border border-[var(--dp-rule)] flex flex-wrap gap-4 items-center">
          <form className="flex-1 min-w-[240px] relative">
            <label htmlFor="book-search-input" className="sr-only">
              ग्रंथ शोधा
            </label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--dp-muted)]" aria-hidden="true" />
            <input
              id="book-search-input"
              name="q"
              defaultValue={params.q}
              placeholder="ग्रंथाच्या शीर्षकानुसार शोधा…"
              className="w-full pl-10 pr-4 py-2 bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] rounded text-xs font-marathi text-[var(--dp-ink)] focus:outline-none focus:border-[var(--dp-gold)] focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </form>

          <div className="flex gap-2 flex-wrap items-center">
            {['POCKET', 'STANDARD', 'PREMIUM_HARDCOVER', 'COLLECTOR'].map((t) => (
              <Link
                key={t}
                href={`/books?type=${t}`}
                className={`px-3 py-1.5 rounded text-xs font-marathi border transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px ${
                  params.type === t
                    ? 'bg-[var(--dp-ground-well)] text-[var(--dp-gold)] border-[var(--dp-gold)] font-bold'
                    : 'bg-[var(--dp-ground-well)] text-[var(--dp-ink-dim)] border-[var(--dp-rule)] hover:border-[var(--dp-gold)]'
                }`}
              >
                {BOOK_TYPE_LABELS[t] ?? t}
              </Link>
            ))}
            {params.type && (
              <Link
                href="/books"
                className="px-3 py-1.5 rounded text-xs font-marathi text-[var(--dp-muted)] border border-[var(--dp-rule)] hover:text-[var(--dp-ink)] transition-colors active:translate-y-px"
              >
                सर्व पहा
              </Link>
            )}
          </div>
        </div>

        {/* Featured Premium Editions */}
        {recentBooks.length > 0 && (
          <section className="mb-12" aria-labelledby="featured-books">
            <div className="flex items-center gap-2 mb-4 border-b border-[var(--dp-rule)] pb-2">
              <Sparkles size={16} className="text-[var(--dp-gold)]" aria-hidden="true" />
              <h2 id="featured-books" className="vitthalaya-display text-xl font-bold">
                प्रीमियम ग्रंथ आवृत्त्या
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentBooks.map((book) => (
                <Link
                  key={book.id}
                  href={`/books/${book.slug}`}
                  className="group vitthalaya-card rounded overflow-hidden border border-[var(--dp-rule)] hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px block"
                >
                  <div className="h-32 bg-[var(--dp-ground-well)] border-b border-[var(--dp-rule)] flex items-center justify-center p-4 text-center">
                    <h3 className="vitthalaya-display text-base font-bold text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors line-clamp-2">
                      {book.titleMarathi}
                    </h3>
                  </div>
                  <div className="p-3 flex items-center justify-between text-xs font-marathi text-[var(--dp-muted)]">
                    <span>{BOOK_TYPE_LABELS[book.bookType] ?? book.bookType}</span>
                    <span>{book.totalPages ? `${book.totalPages} पाने` : 'ग्रंथ'}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Main Books Grid */}
        <section aria-labelledby="all-books">
          <div className="flex items-center justify-between mb-4 border-b border-[var(--dp-rule)] pb-2">
            <h2 id="all-books" className="vitthalaya-display text-xl font-bold flex items-center gap-2">
              <BookOpen size={18} className="text-[var(--dp-gold)]" aria-hidden="true" />
              सर्व उपलब्ध ग्रंथ ({books.length})
            </h2>
          </div>

          {books.length === 0 ? (
            <div className="vitthalaya-card rounded p-12 text-center border border-[var(--dp-rule)]">
              <p className="text-sm font-marathi text-[var(--dp-muted)]">
                या निकषानुसार कोणतीही पुस्तके सापडली नाहीत.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map((book) => (
                <Link
                  key={book.id}
                  href={`/books/${book.slug}`}
                  className="group vitthalaya-card rounded overflow-hidden border border-[var(--dp-rule)] hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px block flex flex-col justify-between"
                >
                  <div className="h-40 bg-[var(--dp-ground-well)] border-b border-[var(--dp-rule)] flex items-center justify-center p-5 text-center">
                    <div>
                      <h3 className="vitthalaya-display text-lg font-bold text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors line-clamp-2 leading-relaxed">
                        {book.titleMarathi}
                      </h3>
                      {book.titleEnglish && (
                        <p className="text-xs text-[var(--dp-muted)] mt-1 font-marathi">
                          {book.titleEnglish}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-marathi text-[var(--dp-muted)]">
                      <span className="px-2 py-0.5 bg-[var(--dp-ground-well)] text-[var(--dp-gold)] border border-[var(--dp-rule)] rounded text-[11px]">
                        {BOOK_TYPE_LABELS[book.bookType] ?? book.bookType}
                      </span>
                      <span>{book._count.compositions} रचना</span>
                      {book.totalPages && <span>{book.totalPages} पाने</span>}
                    </div>

                    <div className="flex items-center justify-end text-xs font-semibold text-[var(--dp-gold)] font-marathi group-hover:underline">
                      <span>तपशील व आवृत्त्या</span>
                      <ArrowRight size={13} className="ml-1" aria-hidden="true" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
