'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { BookOpen, ArrowRight, ChevronRight, Music, Library, Sparkles, Box } from 'lucide-react';
import '@/app/homepage.css';

// Dynamic import for Three.js 3D Book Viewer (client-only)
const BookViewer3D = dynamic(
  () => import('@/components/3d/book-viewer').then((mod) => mod.BookViewer3D),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-80 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] flex flex-col items-center justify-center text-[var(--dp-muted)] font-marathi">
        <Box className="w-8 h-8 text-[var(--dp-gold)] mb-2 motion-safe:animate-pulse motion-reduce:animate-none" aria-hidden="true" />
        <span className="text-xs">३डी ग्रंथ दर्शन लोड होत आहे…</span>
      </div>
    ),
  }
);

interface Stats {
  compositions: number;
  saints: number;
  categories: number;
  byType: Record<string, number>;
}

interface RecentComposition {
  id: string;
  titleMarathi: string;
  slug: string;
  type: string;
  saintName: string | null;
  createdAt: string;
  preview: string;
}

const TYPE_CARDS: { type: string; label: string; en: string; img: string; slug: string }[] = [
  { type: 'abhang', label: 'अभंग', en: 'अभंग संग्रह', img: '/images/categories/abhang.jpg', slug: '/search?type=abhang' },
  { type: 'aarti', label: 'आरत्या', en: 'आरती संग्रह', img: '/images/categories/aarti.jpg', slug: '/search?type=aarti' },
  { type: 'stotra', label: 'स्तोत्रे', en: 'स्तोत्र संग्रह', img: '/images/categories/stotra.jpg', slug: '/search?type=stotra' },
  { type: 'bhajan', label: 'भजन', en: 'भजन संग्रह', img: '/images/categories/bhajan.jpg', slug: '/search?type=bhajan' },
];

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

export default function LibraryPage() {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [recent, setRecent] = React.useState<RecentComposition[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, recentRes] = await Promise.all([
          fetch('/api/explore/stats'),
          fetch('/api/explore/recent'),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (recentRes.ok) {
          const json = await recentRes.json();
          setRecent(Array.isArray(json) ? json : []);
        }
      } catch (err) {
        console.error('Failed to fetch library data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="vitthalaya-shell min-h-screen py-10">
      <div className="vitthalaya-container max-w-5xl">
        {/* Breadcrumb */}
        <nav className="mb-6" aria-label="ब्रेडक्रंब">
          <ol className="flex items-center gap-2 text-xs font-marathi text-[var(--dp-muted)]">
            <li>
              <Link href="/" className="hover:text-[var(--dp-gold)] transition-colors">
                मुख्यपृष्ठ
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li className="text-[var(--dp-ink)]">भक्ती ग्रंथालय</li>
          </ol>
        </nav>

        {/* Page Header with High-Contrast Typography */}
        <header className="mb-12 text-center max-w-3xl mx-auto">
          <p className="text-xs text-[var(--dp-gold)] font-marathi mb-2">
            पवित्र साहित्य भांडार
          </p>

          <h1 className="vitthalaya-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
            वारकरी भक्ती ग्रंथालय
          </h1>

          <p className="vitthalaya-prose text-sm sm:text-base text-[var(--dp-ink-dim)] leading-relaxed mb-6">
            अभंग, आरत्या, स्तोत्रे, आणि संत साहित्याचा वर्गीकृत पवित्र संग्रह.
          </p>

          {/* Quick Stats Pill */}
          <div className="flex flex-wrap justify-center gap-6 text-xs font-marathi text-[var(--dp-muted)] py-3 px-6 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] max-w-md mx-auto mb-6">
            <span>साहित्य प्रकार: <strong className="text-[var(--dp-ink)]">{stats ? fmtMr(stats.categories) : '४'}</strong></span>
            <span>एकूण रचना: <strong className="text-[var(--dp-ink)]">{stats ? fmtMr(stats.compositions) : '२६,०००+'}</strong></span>
          </div>

          <div>
            <Link
              href="/search"
              className="vitthalaya-btn-primary text-sm"
            >
              संपूर्ण ग्रंथालयात शोधा
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </header>

        {/* ── Three.js 3D Interactive Manuscript Section ── */}
        <section className="mb-12 vitthalaya-card rounded p-6 sm:p-8" aria-labelledby="three-d-viewer-title">
          <div className="grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-5 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] text-[var(--dp-gold)] text-xs font-marathi">
                <Sparkles size={12} aria-hidden="true" />
                ३डी परस्परसंवादी ग्रंथ दर्शन
              </span>
              <h2 id="three-d-viewer-title" className="vitthalaya-display text-2xl font-bold">
                तुकाराम महाराज गाथा व ज्ञानेश्वरी
              </h2>
              <p className="vitthalaya-prose text-xs leading-relaxed">
                हस्तलिखित प्रत त्रिआयामी (3D) स्वरूपात पहा. माउस किंवा बोटाने ड्रॅग करून ग्रंथ फिरवा आणि पृष्ठांचे दर्शन घ्या.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  href="/books"
                  className="vitthalaya-btn-secondary text-xs"
                >
                  <BookOpen size={13} aria-hidden="true" />
                  ग्रंथ सूची पहा
                </Link>
              </div>
            </div>

            <div className="md:col-span-7 h-72 sm:h-80 rounded overflow-hidden bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] relative">
              <BookViewer3D
                titleMarathi="तुकाराम गाथा"
                titleEnglish="Sant Tukaram Gatha"
                coverColor="#6B1E1E"
                accentColor="#C9A227"
                pageCount={100}
              />
              <span className="absolute bottom-2 right-3 text-[10px] text-[var(--dp-muted)] font-marathi pointer-events-none">
                ३डी ग्रंथ फिरवण्यासाठी ड्रॅग करा
              </span>
            </div>
          </div>
        </section>

        {/* ── Personal Audio Library & Playlists Quick Access ── */}
        <section className="mb-12" aria-labelledby="personal-library-heading">
          <h2 id="personal-library-heading" className="vitthalaya-display text-xl font-bold mb-4">
            माझी ऑडिओ लायब्ररी
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/library/recordings"
              className="vitthalaya-card rounded p-5 flex items-center justify-between group hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] flex items-center justify-center text-[var(--dp-gold)] shrink-0">
                  <Music size={18} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="vitthalaya-display text-base font-bold text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors">
                    माझ्या रेकॉर्डिंग्ज
                  </h3>
                  <p className="text-xs text-[var(--dp-muted)] font-marathi mt-0.5">
                    प्ले, बुकमार्क व आवडती ऑडिओ सूची
                  </p>
                </div>
              </div>
              <ArrowRight size={16} className="text-[var(--dp-muted)] group-hover:text-[var(--dp-gold)] transition-colors" />
            </Link>

            <Link
              href="/playlists"
              className="vitthalaya-card rounded p-5 flex items-center justify-between group hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] flex items-center justify-center text-[var(--dp-gold)] shrink-0">
                  <Library size={18} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="vitthalaya-display text-base font-bold text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors">
                    माझ्या प्लेलिस्ट
                  </h3>
                  <p className="text-xs text-[var(--dp-muted)] font-marathi mt-0.5">
                    रचना व भजनांचे वैयक्तिक संग्रह
                  </p>
                </div>
              </div>
              <ArrowRight size={16} className="text-[var(--dp-muted)] group-hover:text-[var(--dp-gold)] transition-colors" />
            </Link>
          </div>
        </section>

        {/* ── Literary Categories ── */}
        <section className="mb-12" aria-labelledby="categories-heading">
          <h2 id="categories-heading" className="vitthalaya-display text-xl font-bold mb-4">
            साहित्य प्रकार
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TYPE_CARDS.map((card) => {
              const count = stats?.byType?.[card.type];
              return (
                <Link
                  key={card.type}
                  href={card.slug}
                  className="vitthalaya-card rounded overflow-hidden group block hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
                >
                  <div className="relative aspect-[16/10] bg-[var(--dp-ground-well)]">
                    <Image
                      src={card.img}
                      alt={card.label}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="vitthalaya-display text-lg font-bold text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors">
                      {card.label}
                    </h3>
                    <p className="text-xs text-[var(--dp-muted)] font-marathi mt-1">
                      {count != null ? `${fmtMr(count)} रचना उपलब्ध` : 'रचना संग्रह'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── Recently Added Compositions ── */}
        {!loading && recent.length > 0 && (
          <section className="mb-12" aria-labelledby="library-recent">
            <h2 id="library-recent" className="vitthalaya-display text-xl font-bold mb-4">
              नवीन जोडलेल्या रचना
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recent.slice(0, 6).map((comp) => (
                <Link
                  key={comp.id}
                  href={`/abhang/${comp.slug}`}
                  className="vitthalaya-card rounded p-4 group block hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
                >
                  <h3 className="vitthalaya-display text-base font-bold text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors line-clamp-2">
                    {comp.titleMarathi}
                  </h3>
                  <p className="text-xs text-[var(--dp-muted)] font-marathi mt-1">
                    {comp.saintName || 'अज्ञात संत'}, {comp.type}, {fmtDate(comp.createdAt)}
                  </p>
                  {comp.preview && (
                    <p className="text-xs text-[var(--dp-ink-dim)] mt-2 line-clamp-3 leading-relaxed font-marathi">
                      {comp.preview}
                    </p>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--dp-gold)] mt-3 font-semibold font-marathi">
                    अभंग वाचा <ArrowRight size={12} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Heritage Archive Feature ── */}
        <section className="vitthalaya-card rounded p-6 sm:p-8" aria-labelledby="archive-heading">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-7 space-y-3">
              <h2 id="archive-heading" className="vitthalaya-display text-2xl font-bold">
                अमूल्य हस्तलिखित वारसा
              </h2>
              <p className="vitthalaya-prose text-xs sm:text-sm leading-relaxed">
                ज्ञानेश्वरांच्या ज्ञानेश्वरीपासून, तुकारामांच्या गाथेपर्यंत आणि शेकडो वर्षांच्या ताडपत्री हस्तलिखितांपर्यंतचा हा समृद्ध सांस्कृतिक वारसा आहे. प्रत्येक रचना अचूकतेने डिजिटाईज केली गेली आहे.
              </p>
            </div>
            <div className="md:col-span-5 relative aspect-[16/10] rounded overflow-hidden border border-[var(--dp-rule)]">
              <Image
                src="/images/realistic/ancient-manuscript.jpg"
                alt="प्राचीन हस्तलिखित"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
