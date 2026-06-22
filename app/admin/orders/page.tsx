import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '../../../src/db/client';

export const dynamic = 'force-dynamic';

interface SearchParams {
  searchParams: Promise<{ status?: string }>;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800', CONFIRMED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-indigo-100 text-indigo-800', PRINTING: 'bg-purple-100 text-purple-800',
  SHIPPED: 'bg-teal-100 text-teal-800', DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800', REFUNDED: 'bg-gray-100 text-gray-800',
};

export default async function AdminOrdersPage({ searchParams }: SearchParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }
  if ((session.user as any).role !== 'ADMIN') {
    redirect('/');
  }
  const { status } = await searchParams;
  const where: any = {};
  if (status) where.status = status;

  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { _count: { select: { items: true } } },
  });

  const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PRINTING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-maroon-800 text-white px-6 py-6">
        <h1 className="text-xl font-bold">📦 ऑर्डर व्यवस्थापन</h1>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/orders" className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${!status ? 'bg-maroon-700 text-white border-maroon-700' : 'bg-white text-gray-600 border-sand-200 hover:border-gray-300'}`}>
            सर्व
          </Link>
          {statuses.map((s) => (
            <Link key={s} href={`/admin/orders?status=${s}`} className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${status === s ? 'bg-maroon-700 text-white border-maroon-700' : 'bg-white text-gray-600 border-sand-200 hover:border-gray-300'}`}>
              {s}
            </Link>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600">Order ID</th>
                <th className="text-left p-3 font-medium text-gray-600">ग्राहक</th>
                <th className="text-left p-3 font-medium text-gray-600">स्थिती</th>
                <th className="text-center p-3 font-medium text-gray-600">वस्तू</th>
                <th className="text-right p-3 font-medium text-gray-600">रक्कम</th>
                <th className="text-left p-3 font-medium text-gray-600">तारीख</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs text-maroon-700 hover:text-saffron">
                      #{order.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="p-3 text-gray-600">{order.guestName || order.guestEmail || '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[order.status] ?? 'bg-gray-100'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="p-3 text-center text-gray-500">{order._count.items}</td>
                  <td className="p-3 text-right font-medium">₹{Number(order.total).toLocaleString('en-IN')}</td>
                  <td className="p-3 text-xs text-gray-400">{order.createdAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <p className="text-center text-gray-400 py-8">No orders found</p>}
        </div>
      </div>
    </div>
  );
}
