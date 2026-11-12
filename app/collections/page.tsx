'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bookmark, Library, ArrowRight, Trash2, ChevronRight, BookOpen } from 'lucide-react';
import { getBookmarks, clearBookmarks } from '@/src/db/bookmark';
import '@/app/homepage.css';

interface PublicList {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  compositionCount: number;
  createdAt: string;
  creator?: {
    name?: string | null;
  };
}

export default function CollectionsPage() {
  const [activeTab, setActiveTab] = React.useState<'bookmarks' | 'public'>('bookmarks');
  const [bookmarks, setBookmarks] = React.useState<Array<{ slug: string; title: string }>>([]);
  const [compositions, setCompositions] = React.useState<Array<{ slug: string; titleMarathi: string; titleTranslit: string }>>([]);

  // Public collections state
  const [publicLists, setPublicLists] = React.useState<PublicList[]>([]);
  const [publicTotal, setPublicTotal] = React.useState(0);
  const [loadingPublic, setLoadingPublic] = React.useState(false);
  const [loadingLocal, setLoadingLocal] = React.useState(true);

  React.useEffect(() => {
    // 1. Load local bookmarks
    const loadBookmarks = async () => {
      try {
        const stored = await getBookmarks();
        setBookmarks(stored);
        setCompositions(
          stored.map((b) => ({
            slug: b.slug,
            titleMarathi: b.title,
            titleTranslit: b.slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          }))
        );
      } catch (e) {
        console.error('Failed to load bookmarks:', e);
      } finally {
        setLoadingLocal(false);
      }
    };
    loadBookmarks();

    // 2. Load public lists
    fetchPublicLists();
  }, []);

  const fetchPublicLists = async () => {
    setLoadingPublic(true);
    try {
      const res = await fetch('/api/reading-lists?limit=10');
      if (res.ok) {
        const data = await res.json();
        setPublicLists(data.lists || []);
        setPublicTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch public reading lists:', err);
    } finally {
      setLoadingPublic(false);
    }
  };

  const handleClearAll = async () => {
    if (confirm('सर्व बुकमार्क कायमचे हटवायचे आहेत का?')) {
      await clearBookmarks();
      setBookmarks([]);
      setCompositions([]);
    }
  };

  return (
    <div className="vitthalaya-shell min-h-screen py-10">
      <div className="vitthalaya-container max-w-4xl">
        {/* Breadcrumb */}
        <nav className="mb-6" aria-label="ब्रेडक्रंब">
          <ol className="flex items-center gap-2 text-xs font-marathi text-[var(--dp-muted)]">
            <li>
              <Link href="/" className="hover:text-[var(--dp-gold)] transition-colors">
                मुख्यपृष्ठ
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li className="text-[var(--dp-ink)]">संग्रह व आवडते</li>
          </ol>
        </nav>

        {/* Page Header */}
        <header className="mb-10 text-center">
          <p className="text-xs text-[var(--dp-gold)] font-marathi mb-1">
            वैयक्तिक व सार्वजनिक वाचन
          </p>
          <h1 className="vitthalaya-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
            संग्रह आणि आवडते साहित्य
          </h1>
          <p className="vitthalaya-prose text-sm sm:text-base text-[var(--dp-ink-dim)] max-w-xl mx-auto">
            आपले आवडते अभंग आणि वारकरी समुदायाने तयार केलेल्या सार्वजनिक संग्रहांचा अभ्यास करा.
          </p>
        </header>

        {/* Tabs Bar */}
        <div className="flex border-b border-[var(--dp-rule)] gap-6 mb-8">
          <button
            type="button"
            onClick={() => setActiveTab('bookmarks')}
            className={`pb-3 text-base font-marathi font-medium transition-colors relative focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed ${
              activeTab === 'bookmarks'
                ? 'text-[var(--dp-gold)] font-bold'
                : 'text-[var(--dp-muted)] hover:text-[var(--dp-ink)]'
            }`}
          >
            माझे बुकमार्क ({bookmarks.length})
            {activeTab === 'bookmarks' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--dp-gold)]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('public')}
            className={`pb-3 text-base font-marathi font-medium transition-colors relative focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed ${
              activeTab === 'public'
                ? 'text-[var(--dp-gold)] font-bold'
                : 'text-[var(--dp-muted)] hover:text-[var(--dp-ink)]'
            }`}
          >
            सार्वजनिक संग्रह ({publicTotal})
            {activeTab === 'public' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--dp-gold)]" />
            )}
          </button>
        </div>

        {/* Bookmarks Tab */}
        {activeTab === 'bookmarks' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="vitthalaya-display text-xl font-bold">
                माझे आवडते अभंग
              </h2>

              {bookmarks.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--dp-rule)] text-xs text-[var(--dp-muted)] hover:text-[var(--dp-ink)] hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={13} aria-hidden="true" />
                  <span>सर्व बुकमार्क हटवा</span>
                </button>
              )}
            </div>

            {loadingLocal ? (
              <p className="text-[var(--dp-muted)] text-center py-12 font-marathi text-sm">
                लोड होत आहे…
              </p>
            ) : compositions.length === 0 ? (
              <div className="text-center py-16 vitthalaya-card rounded p-8">
                <Bookmark className="w-10 h-10 mx-auto mb-3 text-[var(--dp-muted)]" aria-hidden="true" />
                <h3 className="vitthalaya-display text-lg font-bold mb-1">अजून कोणतेही बुकमार्क नाहीत</h3>
                <p className="text-xs text-[var(--dp-ink-dim)] max-w-sm mx-auto mb-6 font-marathi leading-relaxed">
                  अभंग किंवा आरत्या वाचताना बुकमार्क बटणावर क्लिक करून ते येथे जतन करा.
                </p>
                <Link
                  href="/search"
                  className="vitthalaya-btn-primary text-xs"
                >
                  साहित्य शोधा
                  <ArrowRight size={13} aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {compositions.map((comp) => (
                  <Link
                    key={comp.slug}
                    href={`/abhang/${comp.slug}`}
                    className="vitthalaya-card rounded p-4 group block hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-marathi font-medium text-sm text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors">
                          {comp.titleMarathi}
                        </p>
                        <p className="text-xs text-[var(--dp-muted)] font-marathi mt-1">
                          {comp.titleTranslit}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-[var(--dp-gold)] font-marathi">
                        अभंग
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Public Collections Tab */}
        {activeTab === 'public' && (
          <div className="space-y-6">
            <h2 className="vitthalaya-display text-xl font-bold">
              वारकरी समुदायाचे संग्रह
            </h2>

            {loadingPublic ? (
              <p className="text-[var(--dp-muted)] text-center py-12 font-marathi text-sm">
                लोड होत आहे…
              </p>
            ) : publicLists.length === 0 ? (
              <div className="text-center py-12 vitthalaya-card rounded p-8 space-y-6">
                <Library className="w-10 h-10 mx-auto text-[var(--dp-muted)]" aria-hidden="true" />
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="vitthalaya-display text-lg font-bold">सार्वजनिक वाचन संग्रह उपलब्ध नाहीत</h3>
                  <p className="text-xs text-[var(--dp-ink-dim)] font-marathi leading-relaxed">
                    वारकरी समुदायाचे वैयक्तिक सार्वजनिक संग्रह अद्याप प्रकाशित नाहीत. आपण स्वतःचा वाचन संग्रह तयार करू शकता किंवा खालील नित्य संग्रह अभ्यासू शकता.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <Link
                    href="/reading-lists"
                    className="vitthalaya-btn-primary text-xs"
                  >
                    नवीन संग्रह तयार करा
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                  <Link
                    href="/search?q=हरिपाठ"
                    className="px-4 py-2 border border-[var(--dp-rule)] hover:border-[var(--dp-gold)] text-xs rounded transition-colors"
                  >
                    हरिपाठ संग्रह
                  </Link>
                  <Link
                    href="/search?q=काकड+आरती"
                    className="px-4 py-2 border border-[var(--dp-rule)] hover:border-[var(--dp-gold)] text-xs rounded transition-colors"
                  >
                    नित्य काकड आरती
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {publicLists.map((list) => (
                  <div
                    key={list.id}
                    className="vitthalaya-card rounded p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-marathi text-[var(--dp-gold)]">
                          {list.compositionCount} रचना
                        </span>
                        <span className="text-xs text-[var(--dp-muted)] font-marathi">
                          {new Date(list.createdAt).toLocaleDateString('mr-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <h3 className="vitthalaya-display text-lg font-bold mb-1">
                        {list.name}
                      </h3>
                      {list.description && (
                        <p className="text-xs text-[var(--dp-ink-dim)] line-clamp-2 mb-4 font-marathi leading-relaxed">
                          {list.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-[var(--dp-rule)] pt-3 mt-3">
                      <span className="text-xs text-[var(--dp-muted)] font-marathi">
                        संकलक: {list.creator?.name || 'वारकरी'}
                      </span>

                      <Link
                        href={`/reading-lists/${list.slug}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold font-marathi text-[var(--dp-gold)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
                      >
                        <BookOpen size={13} aria-hidden="true" />
                        उघडा
                        <ArrowRight size={13} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
