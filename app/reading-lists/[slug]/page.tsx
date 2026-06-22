/**
 * Reading List Detail — view compositions in a reading list.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { db } from '../../../src/db/client';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const list = await db.userCollection.findUnique({
    where: { slug },
    select: { name: true, description: true },
  });

  if (!list) return { title: 'List not found — Digital Pandharpur' };

  return {
    title: `${list.name} — Reading List | Digital Pandharpur`,
    description: list.description ?? `Reading list: ${list.name}`,
  };
}

export default async function ReadingListDetailPage({ params }: Props) {
  const { slug } = await params;

  const list = await db.userCollection.findUnique({
    where: { slug },
    include: {
      compositions: {
        orderBy: { sortOrder: 'asc' },
        include: {
          composition: {
            select: { id: true, titleMarathi: true, type: true, slug: true },
          },
        },
      },
      creator: { select: { id: true, name: true, image: true } },
    },
  });

  if (!list || !list.isPublic) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-maroon-800 to-maroon-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link href="/reading-lists" className="text-saffron-300 hover:text-saffron-200 text-sm mb-4 inline-block">
            ← वाचन यादी
          </Link>
          <h1 className="text-3xl font-bold mt-2">{list.name}</h1>
          {list.description && (
            <p className="text-sand-200 mt-2 text-sm">{list.description}</p>
          )}
          <div className="flex items-center gap-4 mt-4 text-sm text-sand-300">
            <span>{list.compositions.length} रचना</span>
            {list.creator?.name && (
              <span className="flex items-center gap-1">
                by {list.creator.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Composition List */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {list.compositions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500">या यादीत अजून रचना नाहीत.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-50">
            {list.compositions.map((item, i) => (
              <Link
                key={item.id}
                href={`/${item.composition.type.toLowerCase()}/${item.composition.slug}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-sand-50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400 w-6 text-right font-mono">
                    {i + 1}.
                  </span>
                  <div>
                    <span className="text-sm font-medium text-gray-800 group-hover:text-saffron transition-colors">
                      {item.composition.titleMarathi}
                    </span>
                    {item.notes && (
                      <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>
                    )}
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 bg-saffron-50 text-saffron-700 rounded">
                  {item.composition.type}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 text-center">
          <Link
            href="/reading-lists"
            className="inline-block px-6 py-3 bg-saffron text-white rounded-lg hover:bg-saffron-600 transition-colors"
          >
            ← सर्व वाचन यादी
          </Link>
        </div>
      </div>
    </div>
  );
}
