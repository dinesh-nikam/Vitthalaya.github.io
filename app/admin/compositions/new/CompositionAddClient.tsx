'use client';

import * as React from 'react';
import Link from 'next/link';
import { Loader2, CheckCircle2, AlertTriangle, PlusCircle, Trash2 } from 'lucide-react';
import { classifyLyrics, cleanLyrics, type LyricsClass } from '@/src/lib/lyrics-clean';

interface Option {
  id: string;
  nameMarathi: string;
}

const COMPOSITION_TYPES = [
  'abhang',
  'aarti',
  'bhajan',
  'stotra',
  'haripath',
  'gaulani',
  'deviche_gane',
  'bharud',
  'kirtan',
  'namasmaran',
];

const CLASS_HINT: Record<LyricsClass, { label: string; tone: string }> = {
  lyrics: { label: 'व्यवस्थित लिरिक्स', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  noisy: { label: 'गोंगाट — आयात होताना स्वयंचलितपणे स्वच्छ होईल', tone: 'text-amber-700 bg-amber-50 border-amber-200' },
  fragment: { label: 'तुकडा — फक्त ४ पेक्षा कमी देवनागरी ओळी', tone: 'text-orange-700 bg-orange-50 border-orange-200' },
};

export default function CompositionAddClient({
  saints,
  deities,
}: {
  saints: Option[];
  deities: Option[];
}) {
  const [form, setForm] = React.useState({
    titleMarathi: '',
    titleTranslit: '',
    type: 'abhang',
    saintId: '',
    deityId: '',
    source: '',
    reviewed: true,
    fullText: '',
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    id: string;
    titleMarathi: string;
    slug: string;
    cleanedOnImport: boolean;
    removedLines: number;
  } | null>(null);

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const liveClass = form.fullText.trim() ? classifyLyrics(form.fullText) : null;
  const liveClean = form.fullText.trim() ? cleanLyrics(form.fullText) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/compositions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleMarathi: form.titleMarathi,
          titleTranslit: form.titleTranslit || undefined,
          type: form.type,
          fullText: form.fullText,
          saintId: form.saintId || null,
          deityId: form.deityId || null,
          source: form.source || null,
          reviewed: form.reviewed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // 409 duplicate — surface the existing composition for review.
        if (res.status === 409 && data.duplicateOf) {
          setError(
            `डुप्लिकेट — समान लिरिक्स आधीच अस्तित्वात आहेत: "${data.duplicateOf.titleMarathi}"`
          );
        } else {
          setError(data.error || 'जतन करताना त्रुटी.');
        }
        return;
      }
      setResult({
        id: data.composition.id,
        titleMarathi: data.composition.titleMarathi,
        slug: data.composition.slug,
        cleanedOnImport: data.cleanedOnImport,
        removedLines: data.removedLines,
      });
    } catch {
      setError('नेटवर्क त्रुटी — पुन्हा प्रयत्न करा.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-maroon-800 text-white px-6 py-6">
        <Link href="/admin/compositions" className="text-sand-200 text-xs hover:underline">
          ← रचना यादीकडे परत जा
        </Link>
        <h1 className="text-xl font-bold mt-2 font-marathi">नवीन रचना जोडा</h1>
        <p className="text-sand-200 text-sm mt-1">
          Add Composition — लिरिक्स घाला, डुप्लिकेट आपोआप तपासले जातील
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {result ? (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-gray-800 font-marathi">रचना जतन झाली ✓</p>
                <p className="text-sm text-gray-600 mt-1 font-marathi">{result.titleMarathi}</p>
                {result.cleanedOnImport && (
                  <p className="text-xs text-amber-700 mt-1">
                    आयात करताना {result.removedLines} गोंगाट ओळी स्वयंचलितपणे काढल्या
                    (मूळ आवृत्ती इतिहासात जतन केली आहे).
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/compositions/${result.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-saffron text-white text-sm font-medium hover:bg-saffron-600"
              >
                <PlusCircle className="h-4 w-4" /> संपादित करा
              </Link>
              <Link
                href={`/${form.type}/${result.slug}`}
                target="_blank"
                className="px-4 py-2 rounded-lg text-sm text-peacock hover:bg-peacock-50"
              >
                सार्वजनिक पान पहा →
              </Link>
              <button
                onClick={() => {
                  setResult(null);
                  setForm((f) => ({ ...f, titleMarathi: '', titleTranslit: '', fullText: '', source: '' }));
                }}
                className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100"
              >
                आणखी एक जोडा
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    शीर्षक (मराठी) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.titleMarathi}
                    onChange={(e) => set('titleMarathi', e.target.value)}
                    placeholder="उदा. धन्य आजी दिन संत दर्शनाचा"
                    className="border rounded-lg px-3 py-2 text-sm w-full font-marathi"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">शीर्षक (लिप्यंतरण)</label>
                  <input
                    type="text"
                    value={form.titleTranslit}
                    onChange={(e) => set('titleTranslit', e.target.value)}
                    placeholder="उदा. Dhanya Aaji Din Sant Darshanacha"
                    className="border rounded-lg px-3 py-2 text-sm w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    रचना प्रकार <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => set('type', e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm w-full"
                  >
                    {COMPOSITION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                    {!COMPOSITION_TYPES.includes(form.type) && (
                      <option value={form.type}>{form.type} (custom)</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">संत (Saint)</label>
                  <select
                    value={form.saintId}
                    onChange={(e) => set('saintId', e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm w-full"
                  >
                    <option value="">— कोणी नाही —</option>
                    {saints.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nameMarathi}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">देवता (Deity)</label>
                  <select
                    value={form.deityId}
                    onChange={(e) => set('deityId', e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm w-full"
                  >
                    <option value="">— कोणी नाही —</option>
                    {deities.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nameMarathi}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">स्रोत (Source)</label>
                  <input
                    type="text"
                    value={form.source}
                    onChange={(e) => set('source', e.target.value)}
                    placeholder="उदा. Wikisource, पुस्तक, वैयक्तिक"
                    className="border rounded-lg px-3 py-2 text-sm w-full"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="reviewed"
                  type="checkbox"
                  checked={form.reviewed}
                  onChange={(e) => set('reviewed', e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="reviewed" className="text-sm text-gray-700">
                  पडताळणी झाली म्हणून लगेच प्रकाशित करा (uncheck = पुनरावलोकन रांगेत)
                </label>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-500 block">
                  लिरिक्स (पूर्ण मजकूर) <span className="text-red-500">*</span>
                </label>
                {liveClass && liveClean && (
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border ${CLASS_HINT[liveClass].tone}`}
                  >
                    {CLASS_HINT[liveClass].label}
                    {liveClean.removedLines.length > 0 &&
                      ` · ${liveClean.removedLines.length} ओळी स्वच्छ होतील`}
                  </span>
                )}
              </div>
              <textarea
                required
                rows={14}
                value={form.fullText}
                onChange={(e) => set('fullText', e.target.value)}
                placeholder={'प्रत्येक ओळ नवीन ओळीवर...\n\n॥ श्री ।'}
                className="border rounded-lg px-3 py-2 text-sm w-full font-marathi leading-relaxed"
              />
              <p className="text-[11px] text-gray-400">
                YouTube वर्णने, टाइमस्टॅम्प, जाहिराती यांसारखा गोंगाट आयात करताना आपोआप काढला
                जाईल. मूळ मजकूर आवृत्ती इतिहासात जतन राहतो. डुप्लिकेट लिरिक्स → ४०९ त्रुटी.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p>{error}</p>
                  {error.includes('डुप्लिकेट') && (
                    <Link href="/admin/compositions" className="underline font-semibold mt-1 inline-block">
                      विद्यमान रचना यादीत पहा
                    </Link>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Link
                href="/admin/compositions"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100"
              >
                <Trash2 className="h-4 w-4" /> रद्द करा
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 bg-saffron text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-saffron-600 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                {saving ? 'जतन करत आहे...' : 'रचना जोडा'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
