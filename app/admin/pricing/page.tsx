import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminPricingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }
  if ((session.user as any).role !== 'ADMIN') {
    redirect('/');
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-maroon-800 text-white px-6 py-6">
        <h1 className="text-xl font-bold">💰 किंमत सेटिंग</h1>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-maroon-800 mb-4">Pricing Tiers</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-2 font-medium">Edition</th>
                <th className="text-right p-2 font-medium">Digital</th>
                <th className="text-right p-2 font-medium">Print</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                ['Pocket', '₹99', '₹299'],
                ['Standard', '₹199', '₹599'],
                ['Premium Hardcover', '₹399', '₹1,299'],
                ['Collector', '₹999', '₹2,999'],
                ['Temple Edition', 'Free', '₹4,999'],
              ].map(([edition, digital, print]) => (
                <tr key={edition}>
                  <td className="p-2 font-medium">{edition}</td>
                  <td className="p-2 text-right">{digital}</td>
                  <td className="p-2 text-right">{print}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-4">Configured in src/lib/orders/pricing.ts</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <h2 className="font-bold text-maroon-800 mb-2">Bhakta Club</h2>
          <p className="text-sm text-gray-600">Monthly subscription: ₹99/month</p>
          <ul className="text-sm text-gray-500 mt-2 list-disc list-inside space-y-1">
            <li>1 free digital book per month</li>
            <li>15% off all print books</li>
            <li>Early access to new collections</li>
            <li>Exclusive cover designs</li>
          </ul>
          <p className="text-xs text-gray-400 mt-3">API: POST /api/subscriptions/create</p>
        </div>
      </div>
    </div>
  );
}
