import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '../../../src/db/client';

export const dynamic = 'force-dynamic';

export default async function AdminCollectionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }
  if ((session.user as any).role !== 'ADMIN') {
    redirect('/');
  }
  const collections = await db.userCollection.findMany({
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    take: 100,
    include: {
      user: { select: { name: true } },
      _count: { select: { compositions: true } },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-maroon-800 text-white px-6 py-6">
        <h1 className="text-xl font-bold">🎯 संग्रह व्यवस्थापन</h1>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600">नाव</th>
                <th className="text-left p-3 font-medium text-gray-600">निर्माता</th>
                <th className="text-center p-3 font-medium text-gray-600">रचना</th>
                <th className="text-center p-3 font-medium text-gray-600">सार्वजनिक</th>
                <th className="text-center p-3 font-medium text-gray-600">प्रदर्शित</th>
                <th className="text-center p-3 font-medium text-gray-600">Likes</th>
                <th className="text-left p-3 font-medium text-gray-600">तारीख</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {collections.map((col) => (
                <tr key={col.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <Link href={`/collections/${col.slug}`} className="font-medium text-maroon-700 hover:text-saffron">
                      {col.name}
                    </Link>
                  </td>
                  <td className="p-3 text-gray-500">{col.user?.name ?? '-'}</td>
                  <td className="p-3 text-center text-gray-500">{col._count.compositions}</td>
                  <td className="p-3 text-center">{col.isPublic ? '✅' : '❌'}</td>
                  <td className="p-3 text-center">{col.isFeatured ? '⭐' : '-'}</td>
                  <td className="p-3 text-center text-gray-500">{col.likes}</td>
                  <td className="p-3 text-xs text-gray-400">{col.createdAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {collections.length === 0 && <p className="text-center text-gray-400 py-8">No collections found</p>}
        </div>
      </div>
    </div>
  );
}
