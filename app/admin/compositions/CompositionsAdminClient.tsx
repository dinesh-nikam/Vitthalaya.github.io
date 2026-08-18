'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';

interface CompRow {
  id: string;
  titleMarathi: string;
  slug: string;
  type: string;
  reviewed: boolean;
  saintName: string | null;
  creator: string | null;
  tags: { id: string; name: string; color: string | null }[];
  updatedAt: string;
}

export default function CompositionsAdminClient({
  compositions, total, page, pageSize, currentType, currentQuery, availableTypes,
}: {
  compositions: CompRow[]; total: number; page: number; pageSize: number;
  currentType: string; currentQuery: string; availableTypes: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(currentQuery);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function applyFilters(next: { page?: number; type?: string; q?: string }) {
    const params = new URLSearchParams();
    const type = next.type !== undefined ? next.type : currentType;
    const q = next.q !== undefined ? next.q : query;
    if (type) params.set('type', type);
    if (q) params.set('q', q);
    if (next.page && next.page > 1) params.set('page', String(next.page));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-maroon-800 text-white px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">📜 रचना व्यवस्थापन</h1>
            <p className="text-sand-200 text-sm mt-1">Compositions — {total.toLocaleString('en-IN')} total</p>
          </div>
          <Link
            href="/admin/compositions/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-saffron text-white text-sm font-semibold hover:bg-saffron-600 transition-colors"
          >
            + नवीन रचना जोडा
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-3">
          <input
            type="text" placeholder="Search title or slug..." value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters({ page: 1, q: query })}
            className="border rounded-lg px-3 py-2 text-sm flex-1"
          />
          <select
            value={currentType}
            onChange={(e) => applyFilters({ page: 1, type: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All types</option>
            {availableTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => applyFilters({ page: 1, q: query })} className="bg-saffron text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-saffron-600">
            शोधा
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600">शीर्षक</th>
                <th className="text-left p-3 font-medium text-gray-600">प्रकार</th>
                <th className="text-left p-3 font-medium text-gray-600">संत</th>
                <th className="text-left p-3 font-medium text-gray-600">निर्माता</th>
                <th className="text-left p-3 font-medium text-gray-600">टॅग्स</th>
                <th className="text-center p-3 font-medium text-gray-600">पुनरावलोकन</th>
                <th className="text-right p-3 font-medium text-gray-600">क्रिया</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {compositions.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <p className="font-medium text-gray-800 font-marathi">{c.titleMarathi}</p>
                    <p className="text-xs text-gray-400 font-mono">{c.slug}</p>
                  </td>
                  <td className="p-3 text-gray-500 text-xs">{c.type}</td>
                  <td className="p-3 text-gray-500 text-xs">{c.saintName || '—'}</td>
                  <td className="p-3 text-gray-500 text-xs">{c.creator || <span className="text-gray-300">System import</span>}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span key={t.id} className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: (t.color || '#ccc') + '22', color: t.color || '#666' }}>
                          {t.name}
                        </span>
                      ))}
                      {c.tags.length === 0 && <span className="text-gray-300 text-xs">—</span>}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.reviewed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {c.reviewed ? 'पडताळणी' : 'प्रलंबित'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Link href={`/admin/compositions/${c.id}`} className="text-saffron hover:underline text-xs">संपादित करा</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {compositions.length === 0 && <p className="text-center text-gray-400 py-8">कोणतीही रचना सापडली नाही</p>}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 text-sm">
            <button disabled={page <= 1} onClick={() => applyFilters({ page: page - 1 })} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">← मागील</button>
            <span className="text-gray-500">पृष्ठ {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => applyFilters({ page: page + 1 })} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">पुढील →</button>
          </div>
        )}
      </div>
    </div>
  );
}
