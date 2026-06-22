import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminPrintPartnersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }
  if ((session.user as any).role !== 'ADMIN') {
    redirect('/');
  }
  const partners = [
    { name: 'Printful', provider: 'printful', regions: 'Global, US, EU, India (Mumbai)', hardcover: true, color: true, apiFile: 'printful.ts' },
    { name: 'Lulu', provider: 'lulu', regions: 'Global', hardcover: true, color: true, apiFile: 'lulu.ts' },
    { name: 'Amazon KDP', provider: 'kdp', regions: 'Global', hardcover: true, color: true, apiFile: 'kdp.ts' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-maroon-800 text-white px-6 py-6">
        <h1 className="text-xl font-bold">🖨️ मुद्रण भागीदार</h1>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {partners.map((p) => (
          <div key={p.provider} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-maroon-800">{p.name}</h2>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div><span className="text-gray-400">Provider:</span> {p.provider}</div>
              <div><span className="text-gray-400">Regions:</span> {p.regions}</div>
              <div><span className="text-gray-400">Hardcover:</span> {p.hardcover ? '✅' : '❌'}</div>
              <div><span className="text-gray-400">Color:</span> {p.color ? '✅' : '❌'}</div>
              <div className="col-span-2"><span className="text-gray-400">API Module:</span> <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{p.apiFile}</code></div>
            </div>
          </div>
        ))}

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-maroon-800 mb-2">Environment Variables Required</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">PRINTFUL_API_KEY</code> — Printful API key</p>
            <p><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">LULU_API_KEY</code> / <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">LULU_API_SECRET</code> — Lulu API credentials</p>
            <p><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">KDP_API_KEY</code> — Amazon KDP API (optional)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
