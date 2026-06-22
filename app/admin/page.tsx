import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '../../src/db/client';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }
  if ((session.user as any).role !== 'ADMIN') {
    redirect('/');
  }
  const [bookCount, orderCount, collectionCount, recentOrders] = await Promise.all([
    db.bookPublication.count(),
    db.order.count(),
    db.userCollection.count({ where: { isPublic: true } }),
    db.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { _count: { select: { items: true } } },
    }),
  ]);

  const statusCounts = {
    pending: await db.order.count({ where: { status: 'PENDING' } }),
    confirmed: await db.order.count({ where: { status: 'CONFIRMED' } }),
    shipped: await db.order.count({ where: { status: 'SHIPPED' } }),
  };

  const cards = [
    { label: 'एकूण पुस्तके', value: bookCount, href: '/admin/books', color: 'bg-saffron' },
    { label: 'एकूण ऑर्डर्स', value: orderCount, href: '/admin/orders', color: 'bg-maroon-600' },
    { label: 'प्रलंबित ऑर्डर्स', value: statusCounts.pending, href: '/admin/orders?status=PENDING', color: 'bg-yellow-500' },
    { label: 'सार्वजनिक संग्रह', value: collectionCount, href: '/admin/collections', color: 'bg-green-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-maroon-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold">📊 प्रशासन पटल</h1>
          <p className="text-sand-200 text-sm mt-1">Admin Dashboard</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <Link key={card.label} href={card.href}
              className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center text-white text-lg mb-3`}>
                {card.label.charAt(0)}
              </div>
              <p className="text-2xl font-bold text-gray-800">{card.value}</p>
              <p className="text-sm text-gray-500">{card.label}</p>
            </Link>
          ))}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'पुस्तके व्यवस्थापन', href: '/admin/books', icon: '📚' },
            { label: 'ऑर्डर व्यवस्थापन', href: '/admin/orders', icon: '📦' },
            { label: 'मुद्रण भागीदार', href: '/admin/print-partners', icon: '🖨️' },
            { label: 'किंमत सेटिंग', href: '/admin/pricing', icon: '💰' },
            { label: 'संग्रह व्यवस्थापन', href: '/admin/collections', icon: '🎯' },
            { label: 'विश्लेषण', href: '/admin/analytics', icon: '📈' },
          ].map((link) => (
            <Link key={link.href} href={link.href}
              className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow flex items-center gap-3 text-sm">
              <span className="text-xl">{link.icon}</span>
              <span className="font-medium text-gray-700">{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-maroon-800">अलीकडील ऑर्डर्स</h2>
            <Link href="/admin/orders" className="text-sm text-saffron hover:underline">सर्व पहा →</Link>
          </div>
          <div className="divide-y">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-500 font-mono text-xs">#{order.id.slice(0, 8)}</span>
                <span className="text-gray-600">{order.status}</span>
                <span className="text-gray-400">₹{Number(order.total).toLocaleString('en-IN')}</span>
                <span className="text-xs text-gray-400">{order.createdAt.toLocaleDateString()}</span>
              </div>
            ))}
            {recentOrders.length === 0 && <p className="text-gray-400 text-sm py-4 text-center">No orders yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
