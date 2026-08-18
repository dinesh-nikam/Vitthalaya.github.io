'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Option { id: string; name?: string; nameMarathi?: string; email?: string; color?: string | null }

interface CompositionData {
  id: string;
  titleMarathi: string;
  titleTranslit: string;
  slug: string;
  type: string;
  reviewed: boolean;
  saintId: string | null;
  deityId: string | null;
  createdById: string | null;
  createdByLabel: string | null;
  lastEditedByLabel: string | null;
  tagIds: string[];
}

const COMPOSITION_TYPES = ['abhang', 'aarti', 'bhajan', 'stotra', 'haripath', 'gaulani', 'deviche_gane', 'bharud', 'kirtan', 'namasmaran'];

export default function CompositionEditClient({
  composition, saints, deities, tags, users,
}: {
  composition: CompositionData;
  saints: Option[]; deities: Option[]; tags: Option[]; users: Option[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    type: composition.type,
    reviewed: composition.reviewed,
    saintId: composition.saintId || '',
    deityId: composition.deityId || '',
    createdById: composition.createdById || '',
    tagIds: composition.tagIds,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggleTag(id: string) {
    setForm((f) => ({ ...f, tagIds: f.tagIds.includes(id) ? f.tagIds.filter((t) => t !== id) : [...f.tagIds, id] }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/compositions/${composition.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          reviewed: form.reviewed,
          saintId: form.saintId || null,
          deityId: form.deityId || null,
          createdById: form.createdById || null,
          tagIds: form.tagIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-maroon-800 text-white px-6 py-6">
        <Link href="/admin/compositions" className="text-sand-200 text-xs hover:underline">← रचना यादीकडे परत जा</Link>
        <h1 className="text-xl font-bold mt-2 font-marathi">{composition.titleMarathi}</h1>
        <p className="text-sand-200 text-xs mt-1 font-mono">{composition.slug}</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">रचना प्रकार (Type)</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm w-full">
                {COMPOSITION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                {!COMPOSITION_TYPES.includes(form.type) && <option value={form.type}>{form.type} (custom)</option>}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">पुनरावलोकन स्थिती</label>
              <select value={form.reviewed ? 'true' : 'false'} onChange={(e) => setForm((f) => ({ ...f, reviewed: e.target.value === 'true' }))} className="border rounded-lg px-3 py-2 text-sm w-full">
                <option value="true">पडताळणी झाली (Verified)</option>
                <option value="false">प्रलंबित (Pending)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">संत (Saint)</label>
              <select value={form.saintId} onChange={(e) => setForm((f) => ({ ...f, saintId: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm w-full">
                <option value="">— कोणी नाही —</option>
                {saints.map((s) => <option key={s.id} value={s.id}>{s.nameMarathi}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">देवता (Deity)</label>
              <select value={form.deityId} onChange={(e) => setForm((f) => ({ ...f, deityId: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm w-full">
                <option value="">— कोणी नाही —</option>
                {deities.map((d) => <option key={d.id} value={d.id}>{d.nameMarathi}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">निर्माता (Creator attribution)</label>
            <select value={form.createdById} onChange={(e) => setForm((f) => ({ ...f, createdById: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm w-full">
              <option value="">— सिस्टम इंपोर्ट (कोणताही वापरकर्ता नाही) —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
            </select>
            {composition.lastEditedByLabel && (
              <p className="text-xs text-gray-400 mt-1">शेवटचे संपादन: {composition.lastEditedByLabel}</p>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2">टॅग्स (Tags)</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <button key={t.id} type="button" onClick={() => toggleTag(t.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${form.tagIds.includes(t.id) ? 'bg-saffron text-white border-saffron' : 'bg-white text-gray-600 border-gray-300'}`}>
                  {t.name}
                </button>
              ))}
              {tags.length === 0 && <p className="text-xs text-gray-400">No tags yet — create some in Tags Management.</p>}
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {saved && <p className="text-green-600 text-sm">जतन झाले ✓</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Link href={`/${composition.type}/${composition.slug}`} target="_blank" className="px-4 py-2 rounded-lg text-sm text-peacock hover:bg-peacock-50">सार्वजनिक पान पहा →</Link>
            <button onClick={handleSave} disabled={saving} className="bg-saffron text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-saffron-600 disabled:opacity-50">
              {saving ? 'जतन करत आहे...' : 'बदल जतन करा'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
