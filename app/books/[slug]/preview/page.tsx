import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '../../../../src/db/client';
import { BookViewer3D } from '../../../../components/3d/book-viewer';

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

export default async function BookPreviewPage({ params }: Props) {
  const { slug } = await params;

  const book = await db.bookPublication.findUnique({
    where: { slug },
    select: {
      titleMarathi: true,
      titleEnglish: true,
      bookType: true,
      totalCompositions: true,
      totalPages: true,
      totalSections: true,
      createdAt: true,
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
    <div className="min-h-screen bg-cream-50">
      {/* 3D Viewer Hero */}
      <div className="h-[60vh] min-h-[400px] bg-gradient-to-b from-[#F2E8D8] to-cream-50">
        <BookViewer3D
          titleMarathi={book.titleMarathi}
          titleEnglish={book.titleEnglish ?? undefined}
          coverColor={coverColor}
          pageCount={book.totalPages ?? 100}
        />
      </div>

      {/* Details Bar */}
      <div className="bg-white border-b border-sand-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-maroon-800">{book.titleMarathi}</h1>
            {book.titleEnglish && <p className="text-sm text-gray-500">{book.titleEnglish}</p>}
          </div>
          <Link
            href={`/books/${slug}`}
            className="px-4 py-2 bg-saffron text-white rounded-lg hover:bg-saffron-600 text-sm transition-colors"
          >
            पुस्तक पानावर जा →
          </Link>
        </div>
      </div>

      {/* Book Info + Scrollable Preview */}
      <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-maroon-800">पुस्तक पूर्वावलोकन</h2>

          {/* Simulated pages preview */}
          <div className="space-y-3">
            {[...Array(Math.min(6, book.totalSections ?? 3))].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg p-6 shadow-sm border border-sand-200 min-h-[120px]"
                style={{
                  transform: `rotate(${i % 2 === 0 ? 0.5 : -0.5}deg)`,
                  marginLeft: i % 2 === 0 ? `${i * 4}px` : '0',
                  marginRight: i % 2 !== 0 ? `${i * 4}px` : '0',
                }}
              >
                <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
                <div className="space-y-2">
                  {[...Array(3 + (i % 3))].map((_, j) => (
                    <div key={j} className="h-2 bg-gray-100 rounded" style={{ width: `${60 + Math.random() * 35}%` }} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-400 text-center">
            पूर्ण पूर्वावलोकन लवकरच — full page-by-page preview coming soon
          </p>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 text-sm">
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
            <h3 className="font-semibold text-maroon-800">पुस्तक तपशील</h3>
            <Row label="रचना" value={`${book.totalCompositions}`} />
            <Row label="पाने" value={`${book.totalPages ?? '-'}`} />
            <Row label="विभाग" value={`${book.totalSections}`} />
            <Row label="प्रकार" value={book.bookType.replace('_', ' ')} />
          </div>

          <div className="bg-saffron-50 rounded-xl p-4">
            <p className="text-xs text-gray-600">
              पुस्तक फिरवण्यासाठी ड्रॅग करा. पाने उलटण्यासाठी क्लिक करा.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-50 pb-1 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
