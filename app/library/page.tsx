'use client';

import { VitthalayaShell } from '@/components/vitthalaya-shell';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { BookOpen, ArrowRight } from 'lucide-react';

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
  { type: 'abhang', label: 'अभंग', en: 'Abhang', img: '/images/categories/abhang.jpg', slug: '/search?type=abhang' },
  { type: 'aarti', label: 'आरत्या', en: 'Aarti', img: '/images/categories/aarti.jpg', slug: '/search?type=aarti' },
  { type: 'stotra', label: 'स्तोत्रे', en: 'Stotra', img: '/images/categories/stotra.jpg', slug: '/search?type=stotra' },
  { type: 'bhajan', label: 'भजन', en: 'Bhajan', img: '/images/categories/bhajan.jpg', slug: '/search?type=bhajan' },
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
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentComposition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    <>
      <title>साहित्य संग्रह — अभंग, आरत्या, स्तोत्रे | डिजिटल पंढरपूर</title>
      <meta name="description" content="अभंग, आरत्या, स्तोत्रे, भजन आणि संत साहित्य — प्रकारानुसार ब्राउझ करा." />
      <VitthalayaShell
        title="Sacred Literature Collection"
        description="Explore devotional literature categorized by type."
        primaryHref="/search"
        primaryLabel="Search Library"
        eyebrow="Devotional Library"
        stats={[
          { label: 'Content Types', value: stats ? fmtMr(stats.categories) : '…' },
          { label: 'Total Compositions', value: stats ? fmtMr(stats.compositions) : '…' },
        ]}
      >
        {/* Page-specific content */}
        <div className="mt-12 space-y-8">
          {/* Personal audio library quick links */}
          <section aria-labelledby="library-personal">
            <h2 id="library-personal" className="text-saffron-300 text-xl font-medium mb-4 flex items-center gap-2">
              माझी ऑडिओ लायब्ररी
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/library/recordings"
                className="group rounded-2xl border border-saffron/10 p-5 bg-card hover:border-saffron/30 hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold font-marathi text-lg text-foreground group-hover:text-saffron transition-colors">
                      माझ्या रेकॉर्डिंग्ज
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      प्ले, नाव बदला, बुकमार्क, हटवा — वर्धित ऑडिओसह
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-saffron group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <Link
                href="/playlists"
                className="group rounded-2xl border border-saffron/10 p-5 bg-card hover:border-saffron/30 hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold font-marathi text-lg text-foreground group-hover:text-saffron transition-colors">
                      माझ्या प्लेलिस्ट
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      रचना व रेकॉर्डिंग्जच्या संग्रह तयार करा
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-saffron group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </section>

          <h2 className="text-saffron-300 text-xl font-medium mb-4">
            साहित्य श्रेणींचे अन्वेषण करा
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TYPE_CARDS.map((card) => {
              const count = stats?.byType?.[card.type];
              return (
                <Link
                  key={card.type}
                  href={card.slug}
                  className="group relative overflow-hidden rounded-2xl aspect-[4/3] flex flex-col justify-end p-5 border border-saffron/10 transition-all duration-300 hover:border-saffron/30 hover:shadow-2xl hover:-translate-y-1"
                >
                  <div className="absolute inset-0 z-0">
                    <Image
                      src={card.img}
                      alt={card.label}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent group-hover:via-saffron-950/20 group-hover:from-saffron-950/80 transition-colors duration-300" />
                  </div>

                  <div className="relative z-10 space-y-1 text-left">
                    <span className="text-saffron text-[10px] font-bold uppercase tracking-wider">{card.en}</span>
                    <h3 className="text-white text-xl font-bold font-marathi">{card.label}</h3>
                    <p className="text-white/60 text-xs font-mono">
                      {count != null ? `${fmtMr(count)} रचना` : '… रचना'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Real recently added compositions */}
          {!loading && recent.length > 0 && (
            <section aria-labelledby="library-recent">
              <h2 id="library-recent" className="text-saffron-300 text-xl font-medium mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                नवीन जोडलेल्या रचना
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recent.slice(0, 6).map((comp) => (
                  <Link
                    key={comp.id}
                    href={`/abhang/${comp.slug}`}
                    className="group bg-card rounded-xl p-4 border border-saffron/10 hover:border-saffron/30 hover:shadow-md transition-all"
                  >
                    <h3 className="font-marathi font-medium text-foreground group-hover:text-saffron transition-colors line-clamp-2">
                      {comp.titleMarathi}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {comp.saintName || 'अज्ञात संत'} • {comp.type} • {fmtDate(comp.createdAt)}
                    </p>
                    {comp.preview && (
                      <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-3 leading-relaxed">
                        {comp.preview}
                      </p>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs text-saffron mt-3 font-semibold">
                      वाचा <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="mt-12 grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-card rounded-2xl p-8 border border-saffron/10 text-left">
            <div className="md:col-span-7 space-y-4">
              <h3 className="text-xl font-marathiHeading font-bold text-saffron">वारकरी ग्रंथालय</h3>
              <p className="text-saffron-100 text-base sm:text-lg leading-relaxed font-marathi">
                ज्ञानेश्वरांच्या ज्ञानेश्वरीपासून, तुकारामांच्या गाथेपर्यंत आणि शेकडो वर्षांच्या हस्तलिखितांपर्यंतचा हा अमूल्य सांस्कृतिक आणि आध्यात्मिक वारसा आहे.
                प्रत्येक रचना काळजीपूर्वक जतन केली गेली आहे जेणेकरून ज्ञान अखंड वाहत राहील.
              </p>
            </div>
            <div className="md:col-span-5 relative aspect-[4/3] rounded-xl overflow-hidden border border-saffron/20 shadow-md">
              <Image
                src="/images/realistic/ancient-manuscript.jpg"
                alt="Ancient Manuscript"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          </div>
        </div>
      </VitthalayaShell>
    </>
  );
}
