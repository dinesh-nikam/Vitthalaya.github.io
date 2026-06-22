'use client';

/**
 * Book Generation Wizard — multi-step form for curating and generating
 * a custom devotional book.
 *
 * Steps:
 *   1. Book Details (title, type, format)
 *   2. Curation Criteria (saints, deities, themes, composition types)
 *   3. Cover Design (palette, title, elements)
 *   4. Review & Generate (summary + trigger generation)
 */

import { useState, useCallback, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import type {
  BookType,
  CurationType,
  CompositionType,
  CoverPalette,
  CurationCriteria,
} from '../../../src/book-generation/types';

// ── Step Component Imports ────────────────────────────────────────────────────

type Step = 0 | 1 | 2 | 3;

interface WizardState {
  titleMarathi: string;
  titleEnglish: string;
  bookType: BookType;
  curationType: CurationType;
  saintIds: string[];
  deityIds: string[];
  compositionTypes: CompositionType[];
  palette: CoverPalette;
  foilEffect: boolean;
  isPublic: boolean;
  generating: boolean;
  result: string | null;
  error: string | null;
}

const INITIAL_STATE: WizardState = {
  titleMarathi: '',
  titleEnglish: '',
  bookType: 'STANDARD',
  curationType: 'SAINT_BASED',
  saintIds: [],
  deityIds: [],
  compositionTypes: [],
  palette: 'bhagwa',
  foilEffect: false,
  isPublic: false,
  generating: false,
  result: null,
  error: null,
};

const BOOK_TYPES: { value: BookType; label: string; desc: string }[] = [
  { value: 'POCKET', label: 'पॉकेट', desc: '5.5×8.5, साधे बाइंडिंग' },
  { value: 'STANDARD', label: 'मानक', desc: '6×9, पेपरबॅक' },
  { value: 'PREMIUM_HARDCOVER', label: 'प्रीमियम हार्डकव्हर', desc: '7×10, कडक बाइंडिंग' },
  { value: 'COLLECTOR', label: 'कलेक्टर', desc: '7×10, सेरिफ फॉन्ट' },
  { value: 'TEMPLE', label: 'मंदिर', desc: '8.5×11, मोठे टाईप' },
];

const COMPOSITION_TYPES: { value: CompositionType; label: string }[] = [
  { value: 'abhang', label: 'अभंग' },
  { value: 'aarti', label: 'आरती' },
  { value: 'bhajan', label: 'भजन' },
  { value: 'stotra', label: 'स्तोत्र' },
  { value: 'haripath', label: 'हरिपाठ' },
  { value: 'gaulani', label: 'गाऊळणी' },
  { value: 'namasmaran', label: 'नामस्मरण' },
  { value: 'bharud', label: 'भारुड' },
  { value: 'kirtan', label: 'कीर्तन' },
];

const PALETTES: { value: CoverPalette; label: string; color: string }[] = [
  { value: 'bhagwa', label: 'भगवा', color: '#FF7A1A' },
  { value: 'maroon', label: 'तांबडा', color: '#6B1E1E' },
  { value: 'gold', label: 'सुवर्ण', color: '#C9A227' },
  { value: 'cream', label: 'क्रीम', color: '#FFF8EC' },
  { value: 'emerald', label: 'पाचू', color: '#1B5E20' },
  { value: 'indigo', label: 'नील', color: '#1A237E' },
];

export default function BookGeneratePage() {
  const { data: session } = useSession();
  const creatorId = session?.user ? (session.user as any).id : undefined;

  const [step, setStep] = useState<Step>(0);
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [saintSearch, setSaintSearch] = useState('');

  const update = useCallback(
    (patch: Partial<WizardState>) => setState((s) => ({ ...s, ...patch })),
    [],
  );

  const canProceed = (s: Step): boolean => {
    switch (s) {
      case 0: return state.titleMarathi.trim().length > 0;
      case 1: return true;
      case 2: return true;
      case 3: return true;
    }
  };

  const toggleCompositionType = (t: CompositionType) => {
    setState((s) => ({
      ...s,
      compositionTypes: s.compositionTypes.includes(t)
        ? s.compositionTypes.filter((x) => x !== t)
        : [...s.compositionTypes, t],
    }));
  };

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    update({ generating: true, error: null, result: null });

    try {
      const criteria: CurationCriteria = {
        saintIds: state.saintIds.length > 0 ? state.saintIds : undefined,
        compositionTypes: state.compositionTypes.length > 0 ? state.compositionTypes : undefined,
        maxCount: 150,
      };

      const res = await fetch('/api/books/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleMarathi: state.titleMarathi,
          titleEnglish: state.titleEnglish || undefined,
          bookType: state.bookType,
          curationType: state.curationType,
          curationCriteria: criteria,
          coverDesign: {
            palette: state.palette,
            foilEffect: state.foilEffect,
          },
          creatorId,
          isPublic: state.isPublic,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }

      const data = await res.json();
      update({ result: data.slug, generating: false });
    } catch (err) {
      update({ error: err instanceof Error ? err.message : 'Unknown error', generating: false });
    }
  };

  const reset = () => {
    setState(INITIAL_STATE);
    setStep(0);
  };

  return (
    <main className="min-h-screen bg-[#FFF8EC] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#6B1E1E]">📖 पुस्तक निर्मिती</h1>
          <p className="text-gray-600 mt-2">तुमचा स्वतःचा संत वाङ्मय संग्रह तयार करा</p>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
          {(['पुस्तक माहिती', 'निवड निकष', 'मुखपृष्ठ', 'तयार करा'] as const).map((label, i) => (
            <div key={i} className="flex-1">
              <div
                className={`h-2 rounded-full transition-colors ${
                  i <= step ? 'bg-[#FF7A1A]' : 'bg-gray-200'
                }`}
              />
              <p className={`text-xs text-center mt-1 ${i <= step ? 'text-[#6B1E1E] font-medium' : 'text-gray-400'}`}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {state.result ? (
          /* ── Success ── */
          <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-[#6B1E1E] mb-2">पुस्तक तयार!</h2>
            <p className="text-gray-600 mb-4">तुमचे पुस्तक यशस्वीरित्या तयार झाले आहे.</p>
            <div className="flex gap-3 justify-center">
              <a
                href={`/books/${state.result}`}
                className="px-6 py-2 bg-[#FF7A1A] text-white rounded-lg hover:bg-[#E66A00] transition-colors"
              >
                पुस्तक पहा
              </a>
              <button
                onClick={reset}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                नवीन पुस्तक
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGenerate}>
            {/* Step 0: Book Details */}
            {step === 0 && (
              <div className="bg-white rounded-2xl p-8 shadow-lg space-y-6">
                <h2 className="text-xl font-semibold text-[#6B1E1E]">पुस्तक माहिती</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">शीर्षक (मराठी) *</label>
                  <input
                    type="text"
                    value={state.titleMarathi}
                    onChange={(e) => update({ titleMarathi: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A1A] focus:border-transparent outline-none"
                    placeholder="उदा. संत वाणी संग्रह"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">शीर्षक (इंग्रजी)</label>
                  <input
                    type="text"
                    value={state.titleEnglish}
                    onChange={(e) => update({ titleEnglish: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A1A] focus:border-transparent outline-none"
                    placeholder="e.g. Saint Poetry Collection"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">पुस्तक प्रकार</label>
                  <div className="grid grid-cols-2 gap-2">
                    {BOOK_TYPES.map((bt) => (
                      <button
                        key={bt.value}
                        type="button"
                        onClick={() => update({ bookType: bt.value })}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          state.bookType === bt.value
                            ? 'border-[#FF7A1A] bg-[#FFF0E0]'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-medium text-sm">{bt.label}</p>
                        <p className="text-xs text-gray-500">{bt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Curation Criteria */}
            {step === 1 && (
              <div className="bg-white rounded-2xl p-8 shadow-lg space-y-6">
                <h2 className="text-xl font-semibold text-[#6B1E1E]">निवड निकष</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">रचना प्रकार</label>
                  <div className="flex flex-wrap gap-2">
                    {COMPOSITION_TYPES.map((ct) => (
                      <button
                        key={ct.value}
                        type="button"
                        onClick={() => toggleCompositionType(ct.value)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          state.compositionTypes.includes(ct.value)
                            ? 'bg-[#FF7A1A] text-white border-[#FF7A1A]'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {ct.label}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-gray-400 italic">
                  सर्व प्रकार निवडल्यास सर्व उपलब्ध रचनांमधून निवड होईल.
                  संत किंवा देवता निवड — हे वैशिष्ट्य लवकरच उपलब्ध होईल.
                </p>
              </div>
            )}

            {/* Step 2: Cover Design */}
            {step === 2 && (
              <div className="bg-white rounded-2xl p-8 shadow-lg space-y-6">
                <h2 className="text-xl font-semibold text-[#6B1E1E]">मुखपृष्ठ डिझाइन</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">रंगसंगती</label>
                  <div className="flex gap-3">
                    {PALETTES.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => update({ palette: p.value })}
                        className={`w-12 h-12 rounded-full border-2 transition-transform ${
                          state.palette === p.value ? 'border-[#6B1E1E] scale-110' : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: p.color }}
                        title={p.label}
                      />
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.foilEffect}
                    onChange={(e) => update({ foilEffect: e.target.checked })}
                    className="w-5 h-5 text-[#FF7A1A] rounded"
                  />
                  <div>
                    <p className="font-medium text-gray-700">फॉइल इफेक्ट</p>
                    <p className="text-xs text-gray-500">शीर्षकावर सोनेरी चमक</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.isPublic}
                    onChange={(e) => update({ isPublic: e.target.checked })}
                    className="w-5 h-5 text-[#FF7A1A] rounded"
                  />
                  <div>
                    <p className="font-medium text-gray-700">सार्वजनिक करा (Make Public)</p>
                    <p className="text-xs text-gray-500">इतर वापरकर्त्यांना हे पुस्तक पाहण्याची परवानगी द्या</p>
                  </div>
                </label>
              </div>
            )}

            {/* Step 3: Review & Generate */}
            {step === 3 && (
              <div className="bg-white rounded-2xl p-8 shadow-lg space-y-4">
                <h2 className="text-xl font-semibold text-[#6B1E1E]">सारांश</h2>

                <div className="space-y-3 text-sm">
                  <Row label="शीर्षक" value={state.titleMarathi} />
                  {state.titleEnglish && <Row label="English" value={state.titleEnglish} />}
                  <Row label="प्रकार" value={BOOK_TYPES.find((b) => b.value === state.bookType)?.label ?? ''} />
                  <Row
                    label="रचना प्रकार"
                    value={state.compositionTypes.length > 0 ? state.compositionTypes.join(', ') : 'सर्व'}
                  />
                  <Row label="रंगसंगती" value={PALETTES.find((p) => p.value === state.palette)?.label ?? ''} />
                  <Row label="फॉइल" value={state.foilEffect ? 'होय' : 'नाही'} />
                  <Row label="सार्वजनिक" value={state.isPublic ? 'होय' : 'नाही'} />
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            {!state.result && (
              <div className="flex justify-between mt-6">
                  <button
                    type="button"
                    onClick={() => setStep((prev) => (Math.max(0, prev - 1) as Step))}
                    className={`px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${
                      step === 0 ? 'invisible' : ''
                    }`}
                  >
                    मागे
                  </button>

                {state.error && (
                  <p className="text-red-600 text-sm self-center">{state.error}</p>
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={() => setStep((prev) => (Math.min(3, prev + 1) as Step))}
                    disabled={!canProceed(step)}
                    className="px-6 py-2 bg-[#FF7A1A] text-white rounded-lg hover:bg-[#E66A00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    पुढे
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={state.generating || !canProceed(step)}
                    className="px-6 py-2 bg-[#6B1E1E] text-white rounded-lg hover:bg-[#5A1818] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {state.generating ? (
                      <>
                        <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        तयार होत आहे...
                      </>
                    ) : (
                      'पुस्तक तयार करा'
                    )}
                  </button>
                )}
              </div>
            )}
          </form>
        )}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-100 pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}
