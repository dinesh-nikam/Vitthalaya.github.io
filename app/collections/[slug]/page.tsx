import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '../../../src/db/client';

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

export default async function CollectionDetailPage({ params }: Props) {
  const { slug } = await params;

  const collection = await db.userCollection.findUnique({
    where: { slug },
    include: {
      user: { select: { id: true, name: true, image: true } },
      compositions: {
        include: {
          composition: {
            select: {
              id: true, titleMarathi: true, type: true, slug: true,
              saint: { select: { nameMarathi: true, slug: true } },
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
      bookPublication: { select: { id: true, slug: true, titleMarathi: true, status: true } },
    },
  });

  if (!collection) notFound();

  // Check authorization for private collections
  if (!collection.isPublic) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as { id: string }).id !== collection.userId) {
      notFound();
    }
  }

  const saints = [...new Set(collection.compositions.map((c) => c.composition.saint?.nameMarathi).filter(Boolean))];

  return (
    <div className="min-h-screen bg-cream-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <Link href="/collections" className="text-saffron hover:underline text-sm">← संग्रह</Link>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-maroon-800">{collection.name}</h1>
              {collection.description && <p className="text-gray-500 mt-2">{collection.description}</p>}
              <div className="flex items-center gap-3 mt-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="w-7 h-7 bg-saffron-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-saffron-600">
                      {collection.user?.name?.charAt(0) ?? '?'}
                    </span>
                  </div>
                  <span>{collection.user?.name}</span>
                </div>
                <span>{collection.compositions.length} रचना</span>
                {saints.length > 0 && <span>{saints.length} संत</span>}
                <span>{collection.likes} likes</span>
              </div>
            </div>

            {collection.isFeatured && (
              <span className="px-3 py-1 bg-saffron-100 text-saffron-700 rounded-full text-xs font-medium">⭐ प्रदर्शित</span>
            )}
          </div>

          {collection.bookPublication && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                या संग्रहावरून पुस्तक तयार केले आहे:
                <Link href={`/books/${collection.bookPublication.slug}`} className="font-medium underline ml-1">
                  {collection.bookPublication.titleMarathi}
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Compositions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-maroon-800 mb-4">रचना सूची</h2>
          <div className="divide-y divide-sand-100">
            {collection.compositions.map((bc, i) => (
              <div key={bc.id} className="flex items-center justify-between py-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-6">{i + 1}.</span>
                  <div>
                    <Link href={`/${bc.composition.type.toLowerCase()}/${bc.composition.slug}`} className="font-medium text-maroon-700 hover:text-saffron">
                      {bc.composition.titleMarathi}
                    </Link>
                    {bc.composition.saint && (
                      <Link href={`/sant/${bc.composition.saint.slug}`} className="text-xs text-gray-400 ml-2 hover:underline">
                        — {bc.composition.saint.nameMarathi}
                      </Link>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400">{bc.composition.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
