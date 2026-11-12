import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '../../../../src/db/client';
import { BookViewer3D } from '../../../../components/3d/book-viewer';
import { BookOpen, ArrowLeft, Sparkles } from 'lucide-react';

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

export default async function BookPreviewPage({ params }: Props) {
  const rawSlug = await params;
  const slug = decodeURIComponent(rawSlug.slug);

  const book = await db.bookPublication.findUnique({
    where: { slug },
    include: {
      compositions: {
        include: {
          composition: {
            select: {
              id: true,
              slug: true,
              titleMarathi: true,
              titleTranslit: true,
              verses: true,
              meaningMarathi: true,
              type: true,
              saint: { select: { nameMarathi: true, slug: true } },
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
        take: 10,
      },
      editions: true,
      creator: { select: { name: true } },
    },
  });

  if (!book) notFound();

  const coverPalette: Record<string, string> = {
    POCKET: '#FF7A1A',
    STANDARD: '#6B1E1E',
    PREMIUM_HARDCOVER: '#1B5E20',
    COLLECTOR: '#C9A227',
    TEMPLE: '#1A237E',
  };

  const coverColor = coverPalette[book.bookType] ?? '#6B1E1E';

  return (
    <div className="min-h-screen bg-[#FFF8EC]">
      {/* 3D Viewer Hero */}
      <div className="h-[55vh] min-h-[420px] bg-gradient-to-b from-[#F2E8D8] to-[#FFF8EC]">
        <BookViewer3D
          titleMarathi={book.titleMarathi}
          titleEnglish={book.titleEnglish ?? undefined}
          coverColor={coverColor}
          pageCount={book.totalPages ?? 100}
        />
      </div>

      {/* Details Bar */}
      <div className="bg-white border-b border-[#E6D7C3] sticky top-0 z-20 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/books/${slug}`}
              className="text-[#6B1E1E] hover:text-[#FF7A1A] transition-colors p-1"
              aria-label="Back to book details"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold font-marathi text-[#6B1E1E]">{book.titleMarathi}</h1>
              {book.titleEnglish && <p className="text-xs text-gray-500">{book.titleEnglish}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 bg-amber-100 text-amber-900 rounded-full font-medium">
              पूर्वावलोकन आवृत्ती (Sample Preview)
            </span>
            <Link
              href={`/books/${slug}`}
              className="px-4 py-2 bg-[#FF7A1A] text-white rounded-lg hover:bg-[#E66A00] text-sm font-semibold transition-colors shadow-xs"
            >
              खरेदी करा / प्रत मिळवा →
            </Link>
          </div>
        </div>
      </div>

      {/* Book Info + Real Pages Preview */}
      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-[#E6D7C3] pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#FF7A1A]" />
              <h2 className="text-lg font-bold font-marathi text-[#6B1E1E]">रचना व पृष्ठ पूर्वावलोकन</h2>
            </div>
            <span className="text-xs text-gray-500">
              एकूण {book.totalCompositions ?? book.compositions.length} पैकी निवडक रचना
            </span>
          </div>

          {/* Book Content Pages */}
          <div className="space-y-6">
            {/* Table of contents page */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E6D7C3] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF7A1A]/5 rounded-bl-full pointer-events-none" />
              <div className="text-center mb-6 border-b border-amber-100 pb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">।। श्री गणेशाय नमः ।।</span>
                <h3 className="text-2xl font-bold font-marathi text-[#6B1E1E] mt-1">{book.titleMarathi}</h3>
                <p className="text-xs text-gray-500 mt-1">अनुक्रमणिका व मुख्य विभाग</p>
              </div>

              <div className="space-y-3">
                {book.compositions.map((bc, idx) => (
                  <div
                    key={bc.id}
                    className="flex items-baseline justify-between text-sm py-1.5 border-b border-dashed border-gray-100 last:border-0"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-amber-800 w-6">{idx + 1}.</span>
                      <span className="font-marathi text-gray-800 font-medium">{bc.composition.titleMarathi}</span>
                      {bc.composition.saint && (
                        <span className="text-xs text-gray-400 font-marathi">({bc.composition.saint.nameMarathi})</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 font-mono">पृष्ठ {idx * 2 + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actual composition verses preview pages */}
            {book.compositions.slice(0, 4).map((bc, idx) => (
              <article
                key={bc.id}
                className="bg-white rounded-2xl p-8 shadow-sm border border-[#E6D7C3] space-y-4 relative"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-800">
                      रचना क्रमांक {idx + 1}
                    </span>
                    <h4 className="text-xl font-bold font-marathi text-[#6B1E1E] mt-1">
                      {bc.composition.titleMarathi}
                    </h4>
                  </div>
                  {bc.composition.saint && (
                    <span className="text-xs px-2.5 py-1 bg-[#FF7A1A]/10 text-[#FF7A1A] rounded-full font-medium font-marathi">
                      संत {bc.composition.saint.nameMarathi}
                    </span>
                  )}
                </div>

                {/* Verses body */}
                <div className="py-2 text-gray-800 font-marathi text-base leading-relaxed whitespace-pre-line bg-[#FFFDF9] p-4 rounded-xl border border-amber-50">
                  {bc.composition.verses || 'रचना उपलब्ध आहे.'}
                </div>

                {/* Meaning if available */}
                {bc.composition.meaningMarathi && (
                  <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100/60 text-xs text-gray-700 leading-relaxed">
                    <span className="font-semibold text-amber-900 block mb-1">भावार्थ (Meaning):</span>
                    {bc.composition.meaningMarathi}
                  </div>
                )}

                <div className="flex justify-between items-center text-[11px] text-gray-400 pt-2 border-t border-gray-50">
                  <span>Digital Pandharpur Devotional Archive</span>
                  <span className="font-mono">पृष्ठ {idx * 2 + 3}</span>
                </div>
              </article>
            ))}
          </div>

          <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200/60 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-[#6B1E1E] font-marathi text-base">संपूर्ण ग्रंथ वाचनासाठी उपलब्ध</h4>
              <p className="text-xs text-gray-600 mt-0.5">
                या ग्रंथातील सर्व {book.totalCompositions ?? book.compositions.length} रचना उच्च दर्जाच्या छपाईत मिळवा.
              </p>
            </div>
            <Link
              href={`/books/${slug}`}
              className="px-4 py-2 bg-[#6B1E1E] text-white rounded-lg hover:bg-[#521717] text-xs font-semibold transition-colors shrink-0"
            >
              पूर्ण ग्रंथ पहा
            </Link>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 text-sm">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-[#E6D7C3] space-y-3">
            <h3 className="font-bold font-marathi text-[#6B1E1E] text-base border-b border-gray-100 pb-2">
              ग्रंथ माहिती व तपशील
            </h3>
            <Row label="एकूण रचना" value={`${book.totalCompositions ?? book.compositions.length}`} />
            <Row label="अंदाजे पाने" value={`${book.totalPages ?? 120} पाने`} />
            <Row label="विभाग" value={`${book.totalSections ?? 4} विभाग`} />
            <Row label="प्रकार" value={book.bookType.replace('_', ' ')} />
            {book.creator && <Row label="संकलक" value={book.creator.name ?? 'संपादकीय मंडळ'} />}
          </div>

          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200/50 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-900 font-semibold text-xs">
              <Sparkles className="w-4 h-4 text-[#FF7A1A]" />
              <span>३डी ग्रंथ अनुभव</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              वरील ३डी ग्रंथाला माऊस किंवा बोटाने फिरवून सर्व बाजूने पाहू शकता. मुखपृष्ठ, पृष्ठभाग आणि कडांचे सूक्ष्म तपशील तपासा.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className="font-semibold text-gray-800 text-xs font-marathi">{value}</span>
    </div>
  );
}
