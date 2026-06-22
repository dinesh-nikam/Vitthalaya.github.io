import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '../../../src/db/client';

export const dynamic = 'force-dynamic';

export default async function AdminBooksPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }
  if ((session.user as any).role !== 'ADMIN') {
    redirect('/');
  }
  const books = await db.bookPublication.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      _count: { select: { editions: true, compositions: true, orders: true } },
    },
  });

  const statusStyles: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    GENERATING: 'bg-blue-100 text-blue-700',
    READY: 'bg-green-100 text-green-700',
    PUBLISHED: 'bg-saffron-100 text-saffron-700',
    ARCHIVED: 'bg-red-100 text-red-600',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-maroon-800 text-white px-6 py-6">
        <h1 className="text-xl font-bold">📚 पुस्तके व्यवस्थापन</h1>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600">शीर्षक</th>
                <th className="text-left p-3 font-medium text-gray-600">प्रकार</th>
                <th className="text-center p-3 font-medium text-gray-600">स्थिती</th>
                <th className="text-center p-3 font-medium text-gray-600">रचना</th>
                <th className="text-center p-3 font-medium text-gray-600">विक्री</th>
                <th className="text-left p-3 font-medium text-gray-600">तारीख</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {books.map((book) => (
                <tr key={book.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <Link href={`/admin/books/${book.id}`} className="font-medium text-maroon-700 hover:text-saffron">
                      {book.titleMarathi}
                    </Link>
                    {book.titleEnglish && <p className="text-xs text-gray-400">{book.titleEnglish}</p>}
                  </td>
                  <td className="p-3 text-gray-500 text-xs">{book.bookType.replace('_', ' ')}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusStyles[book.status] ?? 'bg-gray-100'}`}>
                      {book.status}
                    </span>
                  </td>
                  <td className="p-3 text-center text-gray-500">{book._count.compositions}</td>
                  <td className="p-3 text-center text-gray-500">{book._count.orders}</td>
                  <td className="p-3 text-xs text-gray-400">{book.createdAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {books.length === 0 && <p className="text-center text-gray-400 py-8">No books found</p>}
        </div>
      </div>
    </div>
  );
}
