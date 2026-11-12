'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Sun,
  Moon,
  Flame,
  Music,
  BookOpen,
  Footprints,
  Clock,
  ArrowRight,
  Bookmark,
  ChevronRight,
  BookMarked,
  Sparkles,
} from 'lucide-react';
import type {
  NityanemPayload,
  ProharId,
  NityanemCompositionItem,
  WariStopSevaItem,
} from '@/src/services/nityanem-service';
import { VarkariRhythmMetronome } from './varkari-rhythm-metronome';
import { addBookmark, isBookmarked, removeBookmark } from '@/src/db/bookmark';

interface Props {
  initialData: NityanemPayload;
}

export function NityanemClient({ initialData }: Props) {
  const [activeTab, setActiveTab] = React.useState<'daily' | 'wari' | 'rhythm'>('daily');
  const [selectedProharId, setSelectedProharId] = React.useState<ProharId>(
    initialData.activeProhar.id
  );
  const [compositions, setCompositions] = React.useState<NityanemCompositionItem[]>(
    initialData.compositions
  );
  const [loading, setLoading] = React.useState(false);
  const [selectedWariStop, setSelectedWariStop] = React.useState<WariStopSevaItem | null>(
    initialData.wariStops[0] || null
  );
  const [bookmarkedSlugs, setBookmarkedSlugs] = React.useState<Record<string, boolean>>({});

  // Initialize bookmark status for compositions
  React.useEffect(() => {
    const checkAllBookmarks = async () => {
      const stateMap: Record<string, boolean> = {};
      for (const comp of compositions) {
        try {
          const marked = await isBookmarked(comp.slug);
          stateMap[comp.slug] = marked;
        } catch {
          // ignore
        }
      }
      setBookmarkedSlugs(stateMap);
    };
    checkAllBookmarks();
  }, [compositions]);

  const toggleBookmark = async (comp: NityanemCompositionItem) => {
    const isCurrentlyMarked = bookmarkedSlugs[comp.slug];
    if (isCurrentlyMarked) {
      await removeBookmark(comp.slug);
      setBookmarkedSlugs((prev) => ({ ...prev, [comp.slug]: false }));
    } else {
      await addBookmark({ slug: comp.slug, title: comp.titleMarathi });
      setBookmarkedSlugs((prev) => ({ ...prev, [comp.slug]: true }));
    }
  };

  const handleProharChange = async (id: ProharId) => {
    setSelectedProharId(id);
    setLoading(true);
    try {
      const res = await fetch(`/api/nityanem?prohar=${id}`);
      if (res.ok) {
        const json = await res.json();
        setCompositions(json.compositions || []);
      }
    } catch (e) {
      console.error('Failed to fetch prohar compositions:', e);
    } finally {
      setLoading(false);
    }
  };

  const activeProhar =
    initialData.allProhars.find((p) => p.id === selectedProharId) || initialData.activeProhar;

  const getProharIcon = (id: ProharId) => {
    switch (id) {
      case 'KAKAD_AARTI':
        return <Sun size={16} aria-hidden="true" />;
      case 'HARIPATH':
        return <BookOpen size={16} aria-hidden="true" />;
      case 'GAULANI':
        return <Music size={16} aria-hidden="true" />;
      case 'DHUPARTI':
        return <Flame size={16} aria-hidden="true" />;
      case 'SHEJARTI':
        return <Moon size={16} aria-hidden="true" />;
    }
  };

  return (
    <div className="space-y-10">
      {/* Primary Section Switcher */}
      <div className="flex justify-center">
        <nav
          className="inline-flex p-1.5 rounded-2xl bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] shadow-inner gap-1"
          aria-label="नित्यनेम विभाग"
        >
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-marathi font-medium transition-all ${
              activeTab === 'daily'
                ? 'bg-[var(--dp-gold)] text-white shadow font-bold'
                : 'text-[var(--dp-ink-dim)] hover:text-[var(--dp-ink)]'
            }`}
          >
            <Clock size={15} aria-hidden="true" />
            <span>दैनिक ५ प्रहर नित्यनेम</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('wari')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-marathi font-medium transition-all ${
              activeTab === 'wari'
                ? 'bg-[var(--dp-gold)] text-white shadow font-bold'
                : 'text-[var(--dp-ink-dim)] hover:text-[var(--dp-ink)]'
            }`}
          >
            <Footprints size={15} aria-hidden="true" />
            <span>वारी पालखी मुक्काम सेवा</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rhythm')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-marathi font-medium transition-all ${
              activeTab === 'rhythm'
                ? 'bg-[var(--dp-gold)] text-white shadow font-bold'
                : 'text-[var(--dp-ink-dim)] hover:text-[var(--dp-ink)]'
            }`}
          >
            <Music size={15} aria-hidden="true" />
            <span>टाळ-मृदंग ठेका साथी</span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Daily 5 Prohars */}
      {activeTab === 'daily' && (
        <div className="space-y-8">
          {/* Prohar Selector Carousel / Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {initialData.allProhars.map((p) => {
              const isSelected = p.id === selectedProharId;
              const isNow = p.id === initialData.activeProhar.id;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProharChange(p.id)}
                  className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between relative ${
                    isSelected
                      ? 'bg-[var(--dp-ground-well)] border-[var(--dp-gold)] ring-2 ring-[var(--dp-gold)]/20 shadow-md'
                      : 'vitthalaya-card hover:border-[var(--dp-rule-strong)]'
                  }`}
                >
                  {isNow && (
                    <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-[var(--dp-gold)] text-white uppercase tracking-wider">
                      चालू प्रहर
                    </span>
                  )}
                  <div className="flex items-center gap-2 text-[var(--dp-gold)] mb-2">
                    {getProharIcon(p.id)}
                    <span className="text-[11px] font-mono font-medium">
                      {p.timeRange}
                    </span>
                  </div>
                  <div>
                    <h4 className="vitthalaya-display text-sm font-bold leading-snug">
                      {p.titleMarathi.split(':')[0]}
                    </h4>
                    <p className="text-[11px] text-[var(--dp-ink-dim)] font-marathi mt-1 line-clamp-1">
                      {p.titleMarathi.split(':')[1] || p.subtitleMarathi}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Prohar Banner */}
          <div className="vitthalaya-card rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[var(--dp-ground-well)] to-[var(--dp-ground)] border border-[var(--dp-rule)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-marathi text-[var(--dp-gold)] font-bold">
                  {getProharIcon(activeProhar.id)}
                  <span>{activeProhar.timeRange} — {activeProhar.subtitleMarathi}</span>
                </div>
                <h3 className="vitthalaya-display text-2xl sm:text-3xl font-bold mt-1">
                  {activeProhar.titleMarathi}
                </h3>
                <p className="vitthalaya-prose text-xs sm:text-sm text-[var(--dp-ink-dim)] mt-2 max-w-2xl leading-relaxed">
                  {activeProhar.description}
                </p>
              </div>

              {/* Book generation shortcut */}
              <Link
                href={`/books/generate?types=${activeProhar.recommendedTypes.join(',')}`}
                className="vitthalaya-btn-secondary text-xs shrink-0 flex items-center gap-2"
              >
                <BookMarked size={14} aria-hidden="true" />
                <span>या सेवेचे पुस्तक बनवा</span>
              </Link>
            </div>
          </div>

          {/* Compositions Grid */}
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--dp-rule)]">
              <h4 className="vitthalaya-display text-lg font-bold">
                नित्य पठणाची भक्ती रचना (उपलब्ध {compositions.length})
              </h4>
              <span className="text-xs font-marathi text-[var(--dp-muted)]">
                प्रामाणिक संकलन
              </span>
            </div>

            {loading ? (
              <div className="text-center py-12 vitthalaya-card rounded p-6 font-marathi text-sm text-[var(--dp-muted)]">
                साहित्य लोड होत आहे…
              </div>
            ) : compositions.length === 0 ? (
              <div className="vitthalaya-card rounded p-10 text-center space-y-2">
                <p className="text-sm font-marathi text-[var(--dp-muted)]">
                  या प्रहरासाठी रचना उपलब्ध नाहीत.
                </p>
                <Link href="/search" className="vitthalaya-btn-primary text-xs inline-flex">
                  समग्र साहित्यात शोधा
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {compositions.map((comp) => {
                  const isMarked = bookmarkedSlugs[comp.slug];
                  return (
                    <article
                      key={comp.slug}
                      className="vitthalaya-card rounded-xl p-5 flex flex-col justify-between hover:border-[var(--dp-gold)] transition-all group"
                    >
                      <div>
                        {/* Header: Saint & Type */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[var(--dp-gold)]/10 text-[var(--dp-gold)] font-bold uppercase tracking-wider">
                            {comp.type}
                          </span>
                          {comp.saint ? (
                            <Link
                              href={`/sant/${comp.saint.slug}`}
                              className="text-xs font-marathi text-[var(--dp-ink-dim)] hover:text-[var(--dp-gold)] transition-colors"
                            >
                              {comp.saint.nameMarathi}
                            </Link>
                          ) : (
                            <span className="text-xs font-marathi text-[var(--dp-muted)]">
                              पारंपारिक
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <Link href={`/abhang/${comp.slug}`}>
                          <h5 className="vitthalaya-display text-base font-bold group-hover:text-[var(--dp-gold)] transition-colors mb-2">
                            {comp.titleMarathi}
                          </h5>
                        </Link>

                        {/* Verse Snippet */}
                        <p className="text-xs text-[var(--dp-ink-dim)] font-marathi leading-relaxed line-clamp-3 whitespace-pre-line mb-4 bg-[var(--dp-ground-well)] p-3 rounded-lg border border-[var(--dp-rule)]">
                          {comp.fullText}
                        </p>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between border-t border-[var(--dp-rule)] pt-3 mt-1 text-xs">
                        <Link
                          href={`/abhang/${comp.slug}`}
                          className="font-semibold text-[var(--dp-gold)] hover:underline inline-flex items-center gap-1"
                        >
                          संपूर्ण पठण करा
                          <ArrowRight size={13} aria-hidden="true" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => toggleBookmark(comp)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isMarked
                              ? 'bg-[var(--dp-gold)] text-white border-[var(--dp-gold)]'
                              : 'border-[var(--dp-rule)] text-[var(--dp-muted)] hover:text-[var(--dp-gold)]'
                          }`}
                          aria-label={isMarked ? 'बुकमार्क काढूण टाका' : 'बुकमार्क करा'}
                          title={isMarked ? 'बुकमार्क काढूण टाका' : 'बुकमार्क करा'}
                        >
                          <Bookmark size={14} fill={isMarked ? 'currentColor' : 'none'} aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Wari Palkhi Stop Seva */}
      {activeTab === 'wari' && (
        <div className="space-y-8">
          <div className="vitthalaya-card rounded-2xl p-6 sm:p-8 border border-[var(--dp-rule)] bg-[var(--dp-ground-well)]">
            <h3 className="vitthalaya-display text-2xl font-bold mb-2">
              वारी पालखी सोहळा : मुक्कामनिहाय भजन सेवा
            </h3>
            <p className="text-xs sm:text-sm text-[var(--dp-ink-dim)] font-marathi leading-relaxed max-w-2xl">
              ज्ञानोबा-तुकोबांच्या पालखी सोहळ्यात प्रत्येक मुक्कामावर विशिष्ट अभंग, भारुडे आणि गजर गायले जातात. खालील थांब्यावर क्लिक करून त्या ठिकाणचे पवित्र महत्व आणि अभंग जाणून घ्या.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Stops List */}
            <div className="md:col-span-5 space-y-2">
              <label className="block text-xs font-marathi font-medium text-[var(--dp-muted)] mb-3">
                वारी मुक्काम थांबे ({initialData.wariStops.length})
              </label>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {initialData.wariStops.map((stop) => {
                  const isSelected = selectedWariStop?.id === stop.id;
                  return (
                    <button
                      key={stop.id}
                      type="button"
                      onClick={() => setSelectedWariStop(stop)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-[var(--dp-ground-well)] border-[var(--dp-gold)] ring-2 ring-[var(--dp-gold)]/20 shadow-sm'
                          : 'vitthalaya-card hover:border-[var(--dp-rule-strong)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Footprints
                          size={15}
                          className={isSelected ? 'text-[var(--dp-gold)]' : 'text-[var(--dp-muted)]'}
                          aria-hidden="true"
                        />
                        <span className="font-marathi font-bold text-sm text-[var(--dp-ink)]">
                          {stop.nameMarathi}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-[var(--dp-gold)]">
                        {stop.distanceKm} किमी
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stop Detail Card */}
            <div className="md:col-span-7">
              {selectedWariStop ? (
                <div className="vitthalaya-card rounded-2xl p-6 sm:p-8 space-y-6 border border-saffron/20 shadow-md">
                  <div className="flex items-start justify-between border-b border-[var(--dp-rule)] pb-4">
                    <div>
                      <span className="text-[11px] font-marathi font-semibold text-[var(--dp-gold)] uppercase tracking-wider">
                        पालखी मुक्काम तपशील
                      </span>
                      <h4 className="vitthalaya-display text-2xl font-bold mt-1">
                        {selectedWariStop.nameMarathi}
                      </h4>
                      <p className="text-xs font-marathi text-[var(--dp-muted)] mt-0.5">
                        प्रवासाचे अंतर: {selectedWariStop.distanceKm} किमी
                      </p>
                    </div>

                    <Link
                      href="/wari"
                      className="vitthalaya-btn-secondary text-xs inline-flex items-center gap-1.5"
                    >
                      <span>वारी नकाशा</span>
                      <ChevronRight size={13} aria-hidden="true" />
                    </Link>
                  </div>

                  {selectedWariStop.significance && (
                    <div>
                      <h5 className="text-xs font-marathi font-bold text-[var(--dp-ink)] mb-1">
                        मुक्कामाचे आध्यात्मिक महत्व:
                      </h5>
                      <p className="text-xs sm:text-sm text-[var(--dp-ink-dim)] font-marathi leading-relaxed bg-[var(--dp-ground-well)] p-4 rounded-xl border border-[var(--dp-rule)]">
                        {selectedWariStop.significance}
                      </p>
                    </div>
                  )}

                  {/* Connected Search Action */}
                  <div className="pt-2 flex flex-wrap gap-3">
                    <Link
                      href={`/search?q=${encodeURIComponent(selectedWariStop.nameMarathi)}`}
                      className="vitthalaya-btn-primary text-xs inline-flex items-center gap-2"
                    >
                      <Sparkles size={14} aria-hidden="true" />
                      <span>{selectedWariStop.nameMarathi} संदर्भातील अभंग शोधा</span>
                    </Link>

                    <Link
                      href="/books/generate"
                      className="px-4 py-2 border border-[var(--dp-rule)] hover:border-[var(--dp-gold)] text-xs rounded transition-colors"
                    >
                      वारी भजन पुस्तिका तयार करा
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="vitthalaya-card rounded-2xl p-8 text-center text-xs font-marathi text-[var(--dp-muted)]">
                  डाव्या बाजूने कोणताही मुक्काम निवडा.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Rhythm Metronome */}
      {activeTab === 'rhythm' && (
        <VarkariRhythmMetronome
          taals={initialData.taals}
          initialTaalId={activeProhar.suggestedTheka}
          initialBpm={activeProhar.suggestedBpm}
        />
      )}
    </div>
  );
}
