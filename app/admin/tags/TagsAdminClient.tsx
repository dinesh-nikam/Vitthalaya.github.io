'use client';

import { useState } from 'react';

interface TagRow {
  id: string;
  name: string;
  nameMarathi: string | null;
  slug: string;
  description: string | null;
  color: string | null;
  _count: { compositions: number; pages: number };
}

export default function TagsAdminClient({ initialTags }: { initialTags: TagRow[] }) {
  const [tags, setTags] = useState<TagRow[]>(initialTags);
  const [name, setName] = useState('');
  const [nameMarathi, setNameMarathi] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#FF7A1A');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nameMarathi: nameMarathi || undefined, description: description || undefined, color }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create tag');
      setTags((prev) => [...prev, { ...data.tag, _count: { compositions: 0, pages: 0 } }].sort((a, b) => a.name.localeCompare(b.name)));
      setName('');
      setNameMarathi('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this tag? It will be removed from all compositions and pages.')) return;
    const res = await fetch(`/api/admin/tags/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setTags((prev) => prev.filter((t) => t.id !== id));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Failed to delete tag');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-maroon-800 text-white px-6 py-6">
        <h1 className="text-xl font-bold">🏷️ टॅग व्यवस्थापन</h1>
        <p className="text-sand-200 text-sm mt-1">Tags Management</p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-5 space-y-3">
          <h2 className="font-bold text-maroon-800 mb-2">नवीन टॅग तयार करा</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text" placeholder="Name (English)" value={name}
              onChange={(e) => setName(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm" required
            />
            <input
              type="text" placeholder="नाव (मराठी)" value={nameMarathi}
              onChange={(e) => setNameMarathi(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm font-marathi"
            />
          </div>
          <input
            type="text" placeholder="Description (optional)" value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full"
          />
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500">Color</label>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-14 rounded border" />
            <button
              type="submit" disabled={submitting}
              className="ml-auto bg-saffron text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-saffron-600 disabled:opacity-50"
            >
              {submitting ? 'तयार करत आहे...' : '+ टॅग जोडा'}
            </button>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </form>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600">नाव</th>
                <th className="text-left p-3 font-medium text-gray-600">Slug</th>
                <th className="text-center p-3 font-medium text-gray-600">रचना</th>
                <th className="text-center p-3 font-medium text-gray-600">पाने</th>
                <th className="text-right p-3 font-medium text-gray-600">क्रिया</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tags.map((tag) => (
                <tr key={tag.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color || '#ccc' }} />
                      <span className="font-medium text-gray-800">{tag.name}</span>
                      {tag.nameMarathi && <span className="text-xs text-gray-400 font-marathi">{tag.nameMarathi}</span>}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400 font-mono text-xs">{tag.slug}</td>
                  <td className="p-3 text-center text-gray-500">{tag._count.compositions}</td>
                  <td className="p-3 text-center text-gray-500">{tag._count.pages}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => handleDelete(tag.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">
                      हटवा
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tags.length === 0 && <p className="text-center text-gray-400 py-8">अद्याप कोणतेही टॅग नाहीत</p>}
        </div>
      </div>
    </div>
  );
}
