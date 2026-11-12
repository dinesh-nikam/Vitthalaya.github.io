'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { TrendingUp, BookOpen, Calendar, ArrowRight, ChevronRight, Compass } from 'lucide-react';
import '@/app/homepage.css';

interface TrendingComposition {
  id: string;
  titleMarathi: string;
  slug: string;
  type: string;
  saintName: string | null;
}

interface RecentComposition extends TrendingComposition {
  createdAt: string;
  preview: string;
}

interface TrendingResponse {
  windowDays: number;
  signal: 'interactions' | 'recency';
  trending: TrendingComposition[];
}

interface Festival {
  id: string;
  nameMarathi: string;
  nameTranslit: string;
  dateRule: string | null;
}

interface Stats {
  compositions: number;
  saints: number;
  categories: number;
  byType: Record<string, number>;
}

function fmtMr(n: number): string {
  try {
    return new Intl.NumberFormat('mr-IN').format(n);
  } catch {
    return String(n);
  }
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('mr-IN', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

const TYPE_CARDS: { type: string; label: string; mrSubtitle: string; img: string; slug: string }[] = [
  { type: 'abhang', label: 'अभंग', mrSubtitle: 'संतवाणी व गाथा', img: '/images/categories/abhang.jpg', slug: '/search?type=abhang' },
  { type: 'aarti', label: 'आरत्या', mrSubtitle: 'नित्य उपासना', img: '/images/categories/aarti.jpg', slug: '/search?type=aarti' },
  { type: 'stotra', label: 'स्तोत्रे', mrSubtitle: 'स्तोत्र व नामजप', img: '/images/categories/stotra.jpg', slug: '/search?type=stotra' },
  { type: 'bhajan', label: 'भजन', mrSubtitle: 'पारंपारिक भजने', img: '/images/categories/bhajan.jpg', slug: '/search?type=bhajan' },
];

export default function ExplorePage() {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [trending, setTrending] = React.useState<TrendingComposition[]>([]);
  const [trendingSignal, setTrendingSignal] = React.useState<'interactions' | 'recency'>('recency');
  const [recent, setRecent] = React.useState<RecentComposition[]>([]);
  const [upcomingFestivals, setUpcomingFestivals] = React.useState<Festival[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, trendingRes, festivalsRes, recentRes] = await Promise.all([
          fetch('/api/explore/stats'),
          fetch('/api/explore/trending'),
          fetch('/api/explore/festivals'),
          fetch('/api/explore/recent'),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (trendingRes.ok) {
          const json: TrendingResponse = await trendingRes.json();
          setTrending(json.trending ?? []);
          setTrendingSignal(json.signal ?? 'recency');
        }
        if (festivalsRes.ok) setUpcomingFestivals(await festivalsRes.json());
        if (recentRes.ok) {
          const json = await recentRes.json();
          setRecent(Array.isArray(json) ? json : []);
        }
      } catch (err) {
        console.error('Failed to fetch explore data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="vitthalaya-shell min-h-screen py-10">
      <div className="vitthalaya-container max-w-5xl">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6" aria-label="ब्रेडक्रंब">
          <ol className="flex items-center gap-2 text-xs font-marathi text-[var(--dp-muted)]">
            <li>
              <Link href="/" className="hover:text-[var(--dp-gold)] transition-colors">
                मुख्यपृष्ठ
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li className="text-[var(--dp-ink)]">अन्वेषण (एक्सप्लोर)</li>
          </ol>
        </nav>

        {/* Page Header */}
        <header className="mb-12 text-center max-w-3xl mx-auto">
          <p className="text-xs text-[var(--dp-gold)] font-marathi mb-2">
            ज्ञान व भक्तीचा शोध
          </p>
          <h1 className="vitthalaya-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
            पवित्र साहित्य अन्वेषण
          </h1>
          <p className="vitthalaya-prose text-sm sm:text-base text-[var(--dp-ink-dim)] leading-relaxed mb-6">
            महाराष्ट्रातील वारकरी संतांच्या अमृतवाणीचे, नित्य भजनांचे आणि पवित्र उत्सवांचे सखोल दर्शन घ्या.
          </p>

          <div className="flex flex-wrap justify-center gap-6 text-xs font-marathi text-[var(--dp-muted)] py-3 px-6 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] max-w-md mx-auto mb-6">
            <span>रचना: <strong className="text-[var(--dp-ink)]">{stats ? fmtMr(stats.compositions) : '२६,०००+'}</strong></span>
            <span>संत: <strong className="text-[var(--dp-ink)]">{stats ? fmtMr(stats.saints) : '२९'}</strong></span>
            <span>श्रेण्या: <strong className="text-[var(--dp-ink)]">{stats ? fmtMr(stats.categories) : '४'}</strong></span>
          </div>

          <div>
            <Link
              href="/search"
              className="vitthalaya-btn-primary text-sm"
            >
              <Compass size={14} aria-hidden="true" />
              विशिष्ट अभंग किंवा संत शोधा
            </Link>
          </div>
        </header>

        {/* Main Sections */}
        <div className="space-y-14">
          {/* Category Exploration Grid */}
          <section aria-labelledby="category-browse">
            <div className="flex items-center justify-between mb-4 border-b border-[var(--dp-rule)] pb-2">
              <h2 id="category-browse" className="vitthalaya-display text-xl font-bold">
                साहित्य श्रेणी
              </h2>
              <Link href="/category" className="text-xs text-[var(--dp-gold)] font-marathi hover:underline">
                सर्व श्रेणी पहा
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {TYPE_CARDS.map((card) => {
                const count = stats?.byType?.[card.type];
                return (
                  <Link
                    key={card.type}
                    href={card.slug}
                    className="group vitthalaya-card rounded overflow-hidden block border border-[var(--dp-rule)] hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
                  >
                    <div className="relative aspect-[16/10] bg-[var(--dp-ground-well)]">
                      <Image
                        src={card.img}
                        alt={card.label}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--dp-ground)] via-transparent to-transparent opacity-80" />
                    </div>

                    <div className="p-4 space-y-1">
                      <p className="text-[11px] text-[var(--dp-gold)] font-marathi">
                        {card.mrSubtitle}
                      </p>
                      <h3 className="vitthalaya-display text-lg font-bold text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors">
                        {card.label}
                      </h3>
                      <p className="text-xs text-[var(--dp-muted)] font-marathi">
                        {count != null ? `${fmtMr(count)} रचना` : 'रचना उपलब्ध'}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Recent Compositions */}
          {!loading && recent.length > 0 && (
            <section aria-labelledby="recent">
              <div className="flex items-center justify-between mb-4 border-b border-[var(--dp-rule)] pb-2">
                <h2 id="recent" className="vitthalaya-display text-xl font-bold flex items-center gap-2">
                  <BookOpen size={18} className="text-[var(--dp-gold)]" aria-hidden="true" />
                  नुकत्याच जोडलेल्या रचना
                </h2>
                <Link href="/library" className="text-xs text-[var(--dp-gold)] font-marathi hover:underline">
                  ग्रंथालयात पहा
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recent.slice(0, 6).map((comp) => (
                  <Link
                    key={comp.id}
                    href={`/abhang/${comp.slug}`}
                    className="group vitthalaya-card rounded p-4 border border-[var(--dp-rule)] hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
                  >
                    <h3 className="vitthalaya-display text-base font-bold text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors line-clamp-2">
                      {comp.titleMarathi}
                    </h3>
                    <p className="text-xs text-[var(--dp-muted)] font-marathi mt-1">
                      {comp.saintName || 'वारकरी संत'} • {comp.type} • {fmtDate(comp.createdAt)}
                    </p>
                    {comp.preview && (
                      <p className="text-xs text-[var(--dp-ink-dim)] font-marathi mt-2 line-clamp-2 leading-relaxed">
                        {comp.preview}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Trending Compositions */}
          {!loading && trending.length > 0 && (
            <section aria-labelledby="trending">
              <div className="mb-4 border-b border-[var(--dp-rule)] pb-2">
                <h2 id="trending" className="vitthalaya-display text-xl font-bold flex items-center gap-2">
                  <TrendingUp size={18} className="text-[var(--dp-gold)]" aria-hidden="true" />
                  प्रसिद्ध व लोकप्रिय रचना
                </h2>
                <p className="text-xs text-[var(--dp-muted)] font-marathi mt-1">
                  {trendingSignal === 'interactions'
                    ? 'वाचन व श्रवण पसंतीनुसार संकलित रचना.'
                    : 'वारकरी भक्तांमध्ये सर्वाधिक पठण केल्या जाणाऱ्या पवित्र रचना.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trending.slice(0, 6).map((comp) => (
                  <Link
                    key={comp.id}
                    href={`/abhang/${comp.slug}`}
                    className="group vitthalaya-card rounded p-4 border border-[var(--dp-rule)] hover:border-[var(--dp-gold)] transition-colors flex items-center justify-between focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <h3 className="vitthalaya-display text-base font-bold text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors truncate">
                        {comp.titleMarathi}
                      </h3>
                      <p className="text-xs text-[var(--dp-muted)] font-marathi mt-1">
                        {comp.saintName || 'वारकरी संत'} • {comp.type}
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-[var(--dp-muted)] group-hover:text-[var(--dp-gold)] transition-colors shrink-0" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Festivals */}
          {!loading && upcomingFestivals.length > 0 && (
            <section aria-labelledby="festivals">
              <div className="flex items-center justify-between mb-4 border-b border-[var(--dp-rule)] pb-2">
                <h2 id="festivals" className="vitthalaya-display text-xl font-bold flex items-center gap-2">
                  <Calendar size={18} className="text-[var(--dp-gold)]" aria-hidden="true" />
                  वारकरी सण व उत्सव
                </h2>
                <Link href="/festival" className="text-xs text-[var(--dp-gold)] font-marathi hover:underline">
                  सर्व उत्सव पहा
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingFestivals.slice(0, 4).map((festival) => (
                  <Link
                    key={festival.id}
                    href={`/festival/${festival.nameTranslit.toLowerCase().replace(/\s+/g, '-')}`}
                    className="group vitthalaya-card rounded p-4 border border-[var(--dp-rule)] hover:border-[var(--dp-gold)] transition-colors flex items-center justify-between focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
                  >
                    <div>
                      <h3 className="vitthalaya-display text-base font-bold text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors">
                        {festival.nameMarathi}
                      </h3>
                      <p className="text-xs text-[var(--dp-muted)] font-marathi mt-1">
                        {festival.nameTranslit}
                        {festival.dateRule ? ` • ${festival.dateRule}` : ''}
                      </p>
                    </div>
                    <div className="text-xs text-[var(--dp-gold)] font-marathi group-hover:underline">
                      माहिती पहा
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
