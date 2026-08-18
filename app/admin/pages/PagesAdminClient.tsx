'use client';

import { useState } from 'react';
import Link from 'next/link';

interface PageRow {
  id: string;
  title: string;
  titleMarathi: string | null;
  slug: string;
  pageType: string;
  status: string;
  excerpt: string | null;
  content: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  author: { id: string; name: string | null; email: string } | null;
  tags: { tag: { id: string; name: string; color: string | null } }[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

interface TagOption { id: string; name: string; color: string | null }

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  PUBLISHED: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-red-100 text-red-600',
};

const PAGE_TYPES = ['STATIC', 'LANDING', 'COMPOSITION_TYPE_INDEX', 'COLLECTION', 'SAINT_INDEX'];

export default function PagesAdminClient({
  initialPages, availableTags, currentUserName,
}: { initialPages: PageRow[]; availableTags: TagOption[]; currentUserName: string }) {
  const [pages, setPages] = useState<PageRow[]>(initialPages);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PageRow | null>(null);
  const [form, setForm] = useState({
    title: '', titleMarathi: '', slug: '', pageType: 'STATIC', status: 'DRAFT',
    content: '', excerpt: '', seoTitle: '', seoDescription: '', tagIds: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm({ title: '', titleMarathi: '', slug: '', pageType: 'STATIC', status: 'DRAFT', content: '', excerpt: '', seoTitle: '', seoDescription: '', tagIds: [] });
    setShowForm(true);
  }

  function openEdit(p: PageRow) {
    setEditing(p);
    setForm({
      title: p.title, titleMarathi: p.titleMarathi || '', slug: p.slug, pageType: p.pageType, status: p.status,
      content: p.content || '', excerpt: p.excerpt || '', seoTitle: p.seoTitle || '', seoDescription: p.seoDescription || '',
      tagIds: p.tags.map((t) => t.tag.id),
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const url = editing ? `/api/admin/pages/${editing.id}` : '/api/admin/pages';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save page');

      const saved = data.page;
      if (editing) {
        setPages((prev) => prev.map((p) => (p.id === saved.id ? { ...p, ...saved, author: p.author } : p)));
      } else {
        setPages((prev) => [{ ...saved, author: { id: '', name: currentUserName, email: '' } }, ...prev]);
      }
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save page');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this page permanently?')) return;
    const res = await fetch(`/api/admin/pages/${id}`, { method: 'DELETE' });
    if (res.ok) setPages((prev) => prev.filter((p) => p.id !== id));
    else alert('Failed to delete page');
  }

  function toggleTag(id: string) {
    setForm((f) => ({ ...f, tagIds: f.tagIds.includes(id) ? f.tagIds.filter((t) => t !== id) : [...f.tagIds, id] }));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-maroon-800 text-white px-6 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">📄 पान व्यवस्थापन</h1>
          <p className="text-sand-200 text-sm mt-1">Pages Management</p>
        </div>
        <button onClick={openCreate} className="bg-saffron px-4 py-2 rounded-lg text-sm font-medium hover:bg-saffron-600">
          + नवीन पान
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-5 space-y-3">
            <h2 className="font-bold text-maroon-800 mb-2">{editing ? 'पान संपादित करा' : 'नवीन पान तयार करा'}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" placeholder="Title" value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm" required />
              <input type="text" placeholder="शीर्षक (मराठी)" value={form.titleMarathi}
                onChange={(e) => setForm((f) => ({ ...f, titleMarathi: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm font-marathi" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="text" placeholder="Slug (auto if empty)" value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm" disabled={!!editing} />
              <select value={form.pageType} onChange={(e) => setForm((f) => ({ ...f, pageType: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm">
                {PAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm">
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
            <textarea placeholder="Excerpt (short summary)" value={form.excerpt}
              onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full" rows={2} />
            <textarea placeholder="Content (Markdown)" value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full font-mono" rows={8} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" placeholder="SEO Title" value={form.seoTitle}
                onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm" />
              <input type="text" placeholder="SEO Description" value={form.seoDescription}
                onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((t) => (
                  <button type="button" key={t.id} onClick={() => toggleTag(t.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${form.tagIds.includes(t.id) ? 'bg-saffron text-white border-saffron' : 'bg-white text-gray-600 border-gray-300'}`}>
                    {t.name}
                  </button>
                ))}
                {availableTags.length === 0 && <p className="text-xs text-gray-400">No tags yet — create some in Tags Management.</p>}
              </div>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100">रद्द करा</button>
              <button type="submit" disabled={submitting} className="bg-saffron text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-saffron-600 disabled:opacity-50">
                {submitting ? 'जतन करत आहे...' : 'जतन करा'}
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600">शीर्षक</th>
                <th className="text-left p-3 font-medium text-gray-600">प्रकार</th>
                <th className="text-center p-3 font-medium text-gray-600">स्थिती</th>
                <th className="text-left p-3 font-medium text-gray-600">निर्माता</th>
                <th className="text-left p-3 font-medium text-gray-600">अद्ययावत</th>
                <th className="text-right p-3 font-medium text-gray-600">क्रिया</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pages.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <p className="font-medium text-gray-800">{p.title}</p>
                    <p className="text-xs text-gray-400 font-mono">/pages/{p.slug}</p>
                  </td>
                  <td className="p-3 text-gray-500 text-xs">{p.pageType}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[p.status] ?? 'bg-gray-100'}`}>{p.status}</span>
                  </td>
                  <td className="p-3 text-gray-500 text-xs">{p.author?.name || p.author?.email || '—'}</td>
                  <td className="p-3 text-gray-400 text-xs">{new Date(p.updatedAt).toLocaleDateString()}</td>
                  <td className="p-3 text-right space-x-3">
                    {p.status === 'PUBLISHED' && (
                      <Link href={`/pages/${p.slug}`} target="_blank" className="text-peacock hover:underline text-xs">पहा</Link>
                    )}
                    <button onClick={() => openEdit(p)} className="text-saffron hover:underline text-xs">संपादित करा</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:underline text-xs">हटवा</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pages.length === 0 && <p className="text-center text-gray-400 py-8">अद्याप कोणतीही पाने नाहीत</p>}
        </div>
      </div>
    </div>
  );
}
