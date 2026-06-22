import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '../../src/db/client';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-indigo-100 text-indigo-800',
  PRINTING: 'bg-purple-100 text-purple-800',
  SHIPPED: 'bg-teal-100 text-teal-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
};

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }
  const userId = (session.user as any).id;

  const orders = await db.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      items: {
        include: { publication: { select: { titleMarathi: true, slug: true } } },
      },
      _count: { select: { items: true } },
    },
  });

  return (
    <div className="min-h-screen bg-cream-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-maroon-800 mb-6">माझे ऑर्डर्स</h1>

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">अजून कोणतीही ऑर्डर नाही</p>
            <Link href="/books" className="text-saffron hover:underline mt-2 inline-block">पुस्तके पहा</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);
              return (
                <Link key={order.id} href={`/orders/${order.id}`}
                  className="block bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-500">
                      {order.createdAt.toLocaleDateString('mr', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_STYLES[order.status] ?? 'bg-gray-100'}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      {order.items.slice(0, 3).map((item) => (
                        <p key={item.id} className="text-sm text-gray-700">{item.publication.titleMarathi} × {item.quantity}</p>
                      ))}
                      {order.items.length > 3 && <p className="text-xs text-gray-400">+{order.items.length - 3} more</p>}
                    </div>
                    <p className="font-semibold text-maroon-800">₹{Number(order.total).toLocaleString('en-IN')}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
