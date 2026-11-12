import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '../../../src/db/client';
import { getUnitPrice } from '@/src/lib/orders/pricing';
import { AddToCartButton } from '@/components/add-to-cart-button';
import { BookOpen, FileText, Tablet, ChevronRight, CheckCircle2 } from 'lucide-react';
import '@/app/homepage.css';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const rawSlug = await params;
  const slug = decodeURIComponent(rawSlug.slug);
  const book = await db.bookPublication.findUnique({
    where: { slug },
    select: { titleMarathi: true, titleEnglish: true, totalCompositions: true, totalPages: true, bookType: true },
  });

  if (!book) {
    return { title: 'पुस्तक सापडले नाही : डिजिटल पंढरपूर' };
  }

  const title = `${book.titleMarathi} : डिजिटल पंढरपूर`;
  const description = `${book.titleMarathi}${book.titleEnglish ? ` (${book.titleEnglish})` : ''}, एकूण ${book.totalCompositions ?? 0} रचना आणि ${book.totalPages ?? 0} पाने.`;

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
  DIGITAL_PDF: 'डिजिटल PDF',
  DIGITAL_EPUB: 'ई-पब (EPUB)',
  DIGITAL_KINDLE: 'किंडल आवृत्ती',
  PRINT_PAPERBACK: 'पेपरबॅक पुस्तक',
  PRINT_HARDCOVER: 'हार्डबाउंड ग्रंथ',
  PRINT_COLLECTOR: 'कलेक्टर विशेष आवृत्ती',
};

function getFormatIcon(format: string) {
  switch (format) {
    case 'DIGITAL_PDF':
      return <FileText size={15} className="text-[var(--dp-gold)]" aria-hidden="true" />;
    case 'DIGITAL_EPUB':
    case 'DIGITAL_KINDLE':
      return <Tablet size={15} className="text-[var(--dp-gold)]" aria-hidden="true" />;
    default:
      return <BookOpen size={15} className="text-[var(--dp-gold)]" aria-hidden="true" />;
  }
}

export default async function BookDetailPage({ params }: Props) {
  const rawSlug = await params;
  const slug = decodeURIComponent(rawSlug.slug);

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
      creator: { select: { id: true, name: true, imageUrl: true } },
      _count: { select: { orderItems: true } },
    },
  });

  if (!book) {
    notFound();
  }

  const typeLabels: Record<string, string> = {
    POCKET: 'पॉकेट आवृत्ती',
    STANDARD: 'मानक आवृत्ती',
    PREMIUM_HARDCOVER: 'प्रीमियम हार्डकव्हर',
    COLLECTOR: 'कलेक्टर विशेष आवृत्ती',
    TEMPLE: 'मंदिर आवृत्ती',
  };

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
            <li>
              <Link href="/books" className="hover:text-[var(--dp-gold)] transition-colors">
                भक्ती ग्रंथ
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li className="text-[var(--dp-ink)] truncate max-w-xs">{book.titleMarathi}</li>
          </ol>
        </nav>

        {/* Hero Header */}
        <header className="mb-10 vitthalaya-card rounded p-6 sm:p-8 border border-[var(--dp-rule)]">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[var(--dp-ground-well)] text-[var(--dp-gold)] text-xs font-marathi border border-[var(--dp-rule)] mb-3">
              <BookOpen size={12} aria-hidden="true" />
              {typeLabels[book.bookType] ?? book.bookType}
            </span>
            <h1 className="vitthalaya-display text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
              {book.titleMarathi}
            </h1>
            {book.titleEnglish && (
              <p className="text-sm font-marathi text-[var(--dp-muted)] mb-4">
                {book.titleEnglish}
              </p>
            )}

            <div className="flex flex-wrap gap-4 pt-3 border-t border-[var(--dp-rule)] text-xs font-marathi text-[var(--dp-muted)]">
              {book.totalCompositions && (
                <span>रचना संग्रह: <strong className="text-[var(--dp-ink)]">{book.totalCompositions}</strong></span>
              )}
              {book.totalPages && (
                <span>पृष्ठ संख्या: <strong className="text-[var(--dp-ink)]">{book.totalPages}</strong></span>
              )}
              {book.totalSections && (
                <span>विभाग: <strong className="text-[var(--dp-ink)]">{book.totalSections}</strong></span>
              )}
            </div>
          </div>
        </header>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Book Details */}
            <section className="vitthalaya-card rounded p-6 border border-[var(--dp-rule)]" aria-labelledby="about-book-heading">
              <h2 id="about-book-heading" className="vitthalaya-display text-lg font-bold mb-4 pb-2 border-b border-[var(--dp-rule)]">
                ग्रंथाविषयी माहिती
              </h2>
              <div className="space-y-3 text-xs font-marathi">
                <div className="flex justify-between py-1.5 border-b border-[var(--dp-rule)]">
                  <span className="text-[var(--dp-muted)]">आवृत्ती प्रकार</span>
                  <span className="font-semibold text-[var(--dp-ink)]">{typeLabels[book.bookType] ?? book.bookType}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--dp-rule)]">
                  <span className="text-[var(--dp-muted)]">एकूण भक्ती रचना</span>
                  <span className="font-semibold text-[var(--dp-ink)]">{book.totalCompositions}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--dp-rule)]">
                  <span className="text-[var(--dp-muted)]">एकूण पाने</span>
                  <span className="font-semibold text-[var(--dp-ink)]">{book.totalPages ?? '-'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[var(--dp-muted)]">प्रकाशन स्थिती</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-[var(--dp-gold)]">
                    <CheckCircle2 size={13} aria-hidden="true" />
                    प्रमाणित प्रकाशित प्रत
                  </span>
                </div>
              </div>
            </section>

            {/* Compositions Preview List */}
            <section className="vitthalaya-card rounded p-6 border border-[var(--dp-rule)]" aria-labelledby="composition-list-heading">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--dp-rule)]">
                <h2 id="composition-list-heading" className="vitthalaya-display text-lg font-bold">
                  समाविष्ट अभंग व रचनांची सूची
                </h2>
                <span className="text-xs text-[var(--dp-muted)] font-marathi">
                  ({book.compositions.length} पैकी)
                </span>
              </div>

              <div className="space-y-2">
                {book.compositions.slice(0, 50).map((bc) => (
                  <div
                    key={bc.id}
                    className="flex items-center justify-between py-2 border-b border-[var(--dp-rule)] last:border-0 text-xs font-marathi"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[var(--dp-gold)] w-6 shrink-0 font-semibold text-right">
                        {bc.sortOrder + 1}.
                      </span>
                      <span className="text-[var(--dp-ink)] truncate">{bc.composition.titleMarathi}</span>
                    </div>
                    <span className="text-[10px] text-[var(--dp-muted)] bg-[var(--dp-ground-well)] px-2 py-0.5 rounded border border-[var(--dp-rule)] shrink-0 ml-2">
                      {bc.composition.type}
                    </span>
                  </div>
                ))}
                {book.compositions.length > 50 && (
                  <p className="text-xs text-[var(--dp-muted)] text-center pt-3 font-marathi">
                    …आणखी {book.compositions.length - 50} रचना उपलब्ध
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Editions & Purchase */}
            <div className="vitthalaya-card rounded p-6 border border-[var(--dp-rule)]">
              <h2 className="vitthalaya-display text-base font-bold mb-4 pb-2 border-b border-[var(--dp-rule)]">
                उपलब्ध आवृत्त्या व खरेदी
              </h2>
              <div className="space-y-4">
                {book.editions.map((ed) => {
                  const unitPrice = getUnitPrice(ed.price, ed.format);
                  return (
                    <div key={ed.id} className="pb-4 border-b border-[var(--dp-rule)] last:border-0 last:pb-0 space-y-2">
                      <div className="flex items-center justify-between text-xs font-marathi">
                        <div className="flex items-center gap-2">
                          {getFormatIcon(ed.format)}
                          <span className="font-semibold text-[var(--dp-ink)]">
                            {FORMAT_LABELS[ed.format] ?? ed.format}
                          </span>
                        </div>
                        {ed.pageCount && (
                          <span className="text-[var(--dp-muted)]">{ed.pageCount} पाने</span>
                        )}
                      </div>

                      <AddToCartButton
                        publicationId={book.id}
                        editionId={ed.id}
                        slug={book.slug}
                        titleMarathi={book.titleMarathi}
                        format={ed.format}
                        unitPrice={unitPrice}
                        pageCount={ed.pageCount ?? undefined}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Creator / Editor */}
            {book.creator && (
              <div className="vitthalaya-card rounded p-6 border border-[var(--dp-rule)]">
                <h3 className="text-xs font-semibold text-[var(--dp-gold)] font-marathi mb-2">
                  संकलन व संपादन
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] rounded-full flex items-center justify-center text-[var(--dp-gold)] font-bold text-sm">
                    {book.creator.name?.charAt(0) ?? 'सं'}
                  </div>
                  <span className="text-xs font-marathi text-[var(--dp-ink)] font-semibold">
                    {book.creator.name ?? 'वारकरी अभ्यासक मंडळ'}
                  </span>
                </div>
              </div>
            )}

            {book._count.orderItems > 0 && (
              <div className="vitthalaya-card rounded p-6 text-center border border-[var(--dp-rule)]">
                <p className="vitthalaya-display text-2xl font-bold text-[var(--dp-gold)]">
                  {book._count.orderItems}
                </p>
                <p className="text-xs text-[var(--dp-muted)] font-marathi mt-1">
                  वितरित झालेल्या पवित्र प्रती
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
