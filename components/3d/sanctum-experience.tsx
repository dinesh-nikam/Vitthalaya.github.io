'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Flame, Bell, BookOpen, Sparkles, Box } from 'lucide-react';

const DeepakViewer = dynamic(
  () => import('@/components/3d/deepak-viewer').then((mod) => mod.DeepakViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-64 flex flex-col items-center justify-center text-[var(--dp-muted)] font-marathi">
        <Box size={24} className="text-[var(--dp-gold)] mb-2 motion-safe:animate-pulse motion-reduce:animate-none" aria-hidden="true" />
        <span className="text-xs">दीप दर्शन लोड होत आहे…</span>
      </div>
    ),
  }
);

const BellViewer = dynamic(
  () => import('@/components/3d/bell-viewer').then((mod) => mod.BellViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-64 flex flex-col items-center justify-center text-[var(--dp-muted)] font-marathi">
        <Box size={24} className="text-[var(--dp-gold)] mb-2 motion-safe:animate-pulse motion-reduce:animate-none" aria-hidden="true" />
        <span className="text-xs">घंटा दर्शन लोड होत आहे…</span>
      </div>
    ),
  }
);

const BookViewer3D = dynamic(
  () => import('@/components/3d/book-viewer').then((mod) => mod.BookViewer3D),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-64 flex flex-col items-center justify-center text-[var(--dp-muted)] font-marathi">
        <Box size={24} className="text-[var(--dp-gold)] mb-2 motion-safe:animate-pulse motion-reduce:animate-none" aria-hidden="true" />
        <span className="text-xs">हस्तलिखित ग्रंथ लोड होत आहे…</span>
      </div>
    ),
  }
);

type SanctumTab = 'diya' | 'bell' | 'book';

export function SanctumExperience() {
  const [activeTab, setActiveTab] = React.useState<SanctumTab>('diya');

  return (
    <div className="vitthalaya-card rounded p-6 sm:p-8 border border-[var(--dp-rule)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--dp-rule)]">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] text-[var(--dp-gold)] text-xs font-marathi mb-2">
            <Sparkles size={12} aria-hidden="true" />
            त्रिआयामी मंदिर दर्शन
          </span>
          <h2 className="vitthalaya-display text-2xl font-bold">
            गर्भगृह अनुभव व नंदादीप
          </h2>
          <p className="vitthalaya-prose text-xs text-[var(--dp-ink-dim)] mt-1">
            पंढरपूर मंदिरातील नंदादीप, घंटा आणि हस्तलिखित गाथेचे थेट त्रिआयामी दर्शन.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] shrink-0" role="tablist" aria-label="मंदिर अनुभव पर्याय">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'diya'}
            onClick={() => setActiveTab('diya')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-marathi transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed ${
              activeTab === 'diya'
                ? 'bg-[var(--dp-gold)]/20 text-[var(--dp-gold)] font-bold border border-[var(--dp-gold)]/30'
                : 'text-[var(--dp-muted)] hover:text-[var(--dp-ink)]'
            }`}
          >
            <Flame size={13} aria-hidden="true" />
            <span>नंदादीप</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'bell'}
            onClick={() => setActiveTab('bell')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-marathi transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed ${
              activeTab === 'bell'
                ? 'bg-[var(--dp-gold)]/20 text-[var(--dp-gold)] font-bold border border-[var(--dp-gold)]/30'
                : 'text-[var(--dp-muted)] hover:text-[var(--dp-ink)]'
            }`}
          >
            <Bell size={13} aria-hidden="true" />
            <span>घंटा नाद</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'book'}
            onClick={() => setActiveTab('book')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-marathi transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed ${
              activeTab === 'book'
                ? 'bg-[var(--dp-gold)]/20 text-[var(--dp-gold)] font-bold border border-[var(--dp-gold)]/30'
                : 'text-[var(--dp-muted)] hover:text-[var(--dp-ink)]'
            }`}
          >
            <BookOpen size={13} aria-hidden="true" />
            <span>हस्तलिखित गाथा</span>
          </button>
        </div>
      </div>

      {/* 3D Canvas Container */}
      <div className="relative rounded overflow-hidden bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] min-h-[300px] flex items-center justify-center p-4">
        {activeTab === 'diya' && (
          <div className="w-full h-72 flex items-center justify-center">
            <DeepakViewer />
          </div>
        )}

        {activeTab === 'bell' && (
          <div className="w-full h-72 flex items-center justify-center">
            <BellViewer />
          </div>
        )}

        {activeTab === 'book' && (
          <div className="w-full h-72">
            <BookViewer3D
              titleMarathi="तुकाराम गाथा"
              titleEnglish="Sant Tukaram Gatha"
              coverColor="#6B1E1E"
              accentColor="#C9A227"
              pageCount={120}
            />
          </div>
        )}
      </div>

      <p className="text-[11px] text-[var(--dp-muted)] font-marathi mt-3 text-center">
        {activeTab === 'diya' && 'माउस किंवा बोटाने दिवा फिरवा : अखंड भक्तीची तेजोमय ज्योत'}
        {activeTab === 'bell' && 'घंटेला स्पर्श करा किंवा क्लिक करा : कांस्य घंटेचा पवित्र नाद ऐका'}
        {activeTab === 'book' && 'हस्तलिखित गाथा त्रिआयामी स्वरूपात फिरवण्यासाठी ड्रॅग करा'}
      </p>
    </div>
  );
}
