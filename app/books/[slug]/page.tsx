import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '../../../src/db/client';
import { AddToCartButton } from '@/components/add-to-cart-button';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const book = await db.bookPublication.findUnique({
    where: { slug },
    select: { titleMarathi: true, titleEnglish: true, totalCompositions: true, totalPages: true, bookType: true },
  });

  if (!book) {
    return { title: 'पुस्तक सापडले नाही — Digital Pandharpur' };
  }

  const title = `${book.titleMarathi} — Digital Pandharpur`;
  const description = `${book.titleMarathi}${book.titleEnglish ? ` (${book.titleEnglish})` : ''} — ${book.totalCompositions ?? 0} compositions, ${book.totalPages ?? 0} pages. ${book.bookType === 'PREMIUM_HARDCOVER' ? 'Premium hardcover edition.' : book.bookType === 'COLLECTOR' ? 'Collector edition.' : ''}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'book',
      locale: 'mr_IN',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

const FORMAT_LABELS: Record<string, string> = {
  DIGITAL_PDF: 'PDF',
  DIGITAL_EPUB: 'EPUB',
  DIGITAL_KINDLE: 'Kindle',
  PRINT_PAPERBACK: 'Paperback',
  PRINT_HARDCOVER: 'Hardcover',
  PRINT_COLLECTOR: 'Collector Edition',
};

const FORMAT_ICONS: Record<string, string> = {
  DIGITAL_PDF: '📄',
  DIGITAL_EPUB: '📱',
  DIGITAL_KINDLE: '📖',
  PRINT_PAPERBACK: '📘',
  PRINT_HARDCOVER: '📚',
  PRINT_COLLECTOR: '🏆',
};

export default async function BookDetailPage({ params }: Props) {
  const { slug } = await params;

  const book = await db.bookPublication.findUnique({
    where: { slug },
    include: {
      editions: true,
      compositions: {
        include: {
          composition: {
            select: { id: true, titleMarathi: true, type: true },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
      creator: { select: { id: true, name: true, image: true } },
      _count: { select: { orders: true } },
    },
  });

  if (!book) {
    notFound();
  }

  const typeLabels: Record<string, string> = {
    POCKET: 'Pocket Size', STANDARD: 'Standard', PREMIUM_HARDCOVER: 'Premium Hardcover',
    COLLECTOR: 'Collector Edition', TEMPLE: 'Temple Edition',
  };

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-maroon-800 to-maroon-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <Link href="/books" className="text-saffron-300 hover:text-saffron-200 text-sm mb-4 inline-block">
            ← पुस्तके
          </Link>
          <h1 className="text-4xl font-bold mt-2">{book.titleMarathi}</h1>
          {book.titleEnglish && (
            <p className="text-xl text-saffron-300 mt-1">{book.titleEnglish}</p>
          )}
          {book.totalCompositions && (
            <p className="mt-4 text-sand-200">
              {book.totalCompositions} रचना · {book.totalPages} पाने · {book.totalSections} विभाग
            </p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-8">
          {/* About */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-maroon-800 mb-4">या पुस्तकाबद्दल</h2>
            <div className="space-y-3 text-gray-700">
              <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
                <span className="text-gray-500">प्रकार</span>
                <span>{typeLabels[book.bookType] ?? book.bookType}</span>
              </div>
              <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
                <span className="text-gray-500">रचना संग्रह</span>
                <span>{book.totalCompositions}</span>
              </div>
              <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
                <span className="text-gray-500">एकूण पाने</span>
                <span>{book.totalPages}</span>
              </div>
              <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
                <span className="text-gray-500">विभाग</span>
                <span>{book.totalSections}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">स्थिती</span>
                <span className={book.status === 'PUBLISHED' ? 'text-green-600' : 'text-amber-600'}>
                  {book.status}
                </span>
              </div>
            </div>
          </section>

          {/* Compositions Preview */}
          <section className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-maroon-800 mb-4">रचनांची यादी</h2>
            <div className="space-y-2">
              {book.compositions.slice(0, 50).map((bc) => (
                <div key={bc.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-6 text-right">{bc.sortOrder + 1}.</span>
                    <span className="text-sm">{bc.composition.titleMarathi}</span>
                  </div>
                  <span className="text-xs text-gray-400">{bc.composition.type}</span>
                </div>
              ))}
              {book.compositions.length > 50 && (
                <p className="text-sm text-gray-400 text-center mt-2">
                  ...आणखी {book.compositions.length - 50} रचना
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-maroon-800 mb-4">उपलब्ध आवृत्त्या</h3>
            <div className="space-y-3">
              {book.editions.map((ed) => {
                const unitPrice = ed.price ? Number(ed.price) : (ed.format.startsWith('DIGITAL_') ? 99 : 299);
                return (
                  <div key={ed.id} className="pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{FORMAT_ICONS[ed.format] ?? '📄'}</span>
                        <span className="text-sm font-medium">{FORMAT_LABELS[ed.format] ?? ed.format}</span>
                      </div>
                      <span className="text-xs text-gray-400">{ed.pageCount}p</span>
                    </div>
                    {ed.format.startsWith('DIGITAL_') && (
                      <AddToCartButton
                        publicationId={book.id}
                        editionId={ed.id}
                        slug={book.slug}
                        titleMarathi={book.titleMarathi}
                        format={ed.format}
                        unitPrice={unitPrice}
                        pageCount={ed.pageCount ?? undefined}
                      />
                    )}
                    {!ed.format.startsWith('DIGITAL_') && (
                      <p className="text-xs text-gray-400 text-center py-2">लवकरच उपलब्ध</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {book.creator && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-maroon-800 mb-3">निर्माता</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-saffron-100 rounded-full flex items-center justify-center">
                  <span className="text-saffron-600 font-bold">
                    {book.creator.name?.charAt(0) ?? '?'}
                  </span>
                </div>
                <span className="text-sm">{book.creator.name ?? 'Unknown'}</span>
              </div>
            </div>
          )}

          {book._count.orders > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center">
              <p className="text-2xl font-bold text-maroon-800">{book._count.orders}</p>
              <p className="text-sm text-gray-500">विक्री झालेल्या प्रती</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
