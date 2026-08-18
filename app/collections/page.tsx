'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bookmark, Library, ArrowRight, Trash2 } from 'lucide-react';
import { getBookmarks, clearBookmarks } from '@/src/db/bookmark';
import { V4PageShell, V4ArtifactLink } from '@/components/v4-page-shell';

export default function CollectionsPage() {
  const [activeTab, setActiveTab] = React.useState<'bookmarks' | 'public'>('bookmarks');
  const [bookmarks, setBookmarks] = React.useState<Array<{ slug: string; title: string }>>([]);
  const [compositions, setCompositions] = React.useState<any[]>([]);
  
  // Public collections states
  const [publicLists, setPublicLists] = React.useState<any[]>([]);
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
            titleTranslit: b.slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
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
    <>
      <title>संग्रह आणि आवडते | डिजिटल पंढरपूर</title>
      <meta name="description" content="तुमचे आवडते अभंग आणि वारकरी समुदायाचे सार्वजनिक संग्रह एका ठिकाणी पहा." />
      
      <V4PageShell
        eyebrow="माझे भक्ती साहित्य"
        title="संग्रह आणि आवडते"
        description="तुमचे आवडते अभंग आणि वारकरी समुदायाने तयार केलेले सार्वजनिक संग्रह पहा आणि अभ्यासा."
        stats={[
          { label: 'माझे बुकमार्क', value: bookmarks.length },
          { label: 'सार्वजनिक संग्रह', value: publicTotal || '...' },
        ]}
      >
        <div className="mt-8 space-y-8">
          {/* Custom Tabs */}
          <div className="flex border-b border-saffron/10 gap-6">
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`pb-4 text-lg font-marathi font-medium transition-colors relative ${
                activeTab === 'bookmarks' ? 'text-saffron' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              बुकमार्क ({bookmarks.length})
              {activeTab === 'bookmarks' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-saffron" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('public')}
              className={`pb-4 text-lg font-marathi font-medium transition-colors relative ${
                activeTab === 'public' ? 'text-saffron' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              सार्वजनिक संग्रह ({publicTotal})
              {activeTab === 'public' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-saffron" />
              )}
            </button>
          </div>

          {/* Bookmarks Tab Content */}
          {activeTab === 'bookmarks' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-saffron-300 text-xl font-marathi font-medium">
                  माझे आवडते साहित्य
                </h2>

                {bookmarks.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-destructive/20 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>सर्व बुकमार्क हटवा</span>
                  </button>
                )}
              </div>

              {loadingLocal ? (
                <p className="text-muted-foreground text-center py-8">लोड होत आहे...</p>
              ) : compositions.length === 0 ? (
                <div className="text-center py-16 bg-saffron-50/10 rounded-2xl border border-saffron/5">
                  <Bookmark className="w-12 h-12 mx-auto mb-4 text-muted-foreground/60" />
                  <h3 className="text-lg font-marathi font-medium mb-1">अजून कोणतेही बुकमार्क नाहीत</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                    अभंग किंवा आरत्या वाचताना उजवीकडील बुकमार्क आयकॉनवर क्लिक करून ते येथे जतन करा.
                  </p>
                  <Link
                    href="/search"
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-saffron text-white rounded-full font-semibold hover:bg-saffron/90 transition-all text-sm"
                  >
                    साहित्य शोधा <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {compositions.map((comp: any) => (
                    <V4ArtifactLink
                      key={comp.slug}
                      href={`/abhang/${comp.slug}`}
                      title={comp.titleMarathi}
                      subtitle={comp.titleTranslit}
                      meta="अभंग"
                      variant="gold"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Public Collections Tab Content */}
          {activeTab === 'public' && (
            <div className="space-y-6">
              <h2 className="text-saffron-300 text-xl font-marathi font-medium">
                वारकरी समुदायाचे सार्वजनिक संग्रह
              </h2>

              {loadingPublic ? (
                <p className="text-muted-foreground text-center py-8">लोड होत आहे...</p>
              ) : publicLists.length === 0 ? (
                <div className="text-center py-16 bg-saffron-50/10 rounded-2xl border border-saffron/5">
                  <Library className="w-12 h-12 mx-auto mb-4 text-muted-foreground/60" />
                  <h3 className="text-lg font-marathi font-medium mb-1">कोणतेही सार्वजनिक संग्रह नाहीत</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    वारकरी समुदायाने तयार केलेले संग्रह लवकरच येथे जोडले जातील.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  {publicLists.map((list) => (
                    <div
                      key={list.id}
                      className="group bg-card rounded-2xl p-6 border border-saffron/10 hover:border-saffron/30 hover:shadow-lg transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-saffron/10 text-saffron font-bold uppercase tracking-wider">
                            {list.compositionCount} रचना
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(list.createdAt).toLocaleDateString('mr-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <h3 className="text-xl font-marathi font-medium text-foreground group-hover:text-saffron transition-colors mb-2">
                          {list.name}
                        </h3>
                        {list.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                            {list.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-saffron/5 pt-4 mt-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-saffron/20 flex items-center justify-center text-[10px] font-bold text-saffron">
                            {list.creator?.name?.charAt(0) || 'वा'}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {list.creator?.name || 'वारकरी'}
                          </span>
                        </div>

                        <Link
                          href={`/reading-lists/${list.slug}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-saffron hover:underline"
                        >
                          उघडा <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </V4PageShell>
    </>
  );
}