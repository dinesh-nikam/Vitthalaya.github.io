'use client';

import { VitthalayaShell } from '@/components/vitthalaya-shell';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TrendingUp, BookOpen, Users, Calendar, Star, ArrowRight } from 'lucide-react';
import Image from 'next/image';

const CATEGORY_COVERS: Record<string, { img: string; en: string; count: string; path: string }> = {
  'अभंग': { img: '/images/categories/abhang.jpg', en: 'Abhang', count: '५०,०००+', path: '/search?type=abhang' },
  'आरती': { img: '/images/categories/aarti.jpg', en: 'Aarti', count: '५००+', path: '/search?type=aarti' },
  'स्तोत्रे': { img: '/images/categories/stotra.jpg', en: 'Stotra', count: '१,०००+', path: '/search?type=stotra' },
  'भजन': { img: '/images/categories/bhajan.jpg', en: 'Bhajan', count: '२,०००+', path: '/search?type=bhajan' },
};

interface TrendingComposition {
  id: string;
  titleMarathi: string;
  slug: string;
  type: string;
  saintName: string | null;
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
}

export default function ExplorePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [trending, setTrending] = useState<TrendingComposition[]>([]);
  const [upcomingFestivals, setUpcomingFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, trendingRes, festivalsRes] = await Promise.all([
          fetch('/api/explore/stats'),
          fetch('/api/explore/trending'),
          fetch('/api/explore/festivals'),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (trendingRes.ok) setTrending(await trendingRes.json());
        if (festivalsRes.ok) setUpcomingFestivals(await festivalsRes.json());
      } catch (err) {
        console.error('Failed to fetch explore data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <>
      <title>एक्सप्लोर करा — नवीन साहित्य शोधा | डिजिटल पंढरपूर</title>
      <meta name="description" content="अभंग, आरत्या, स्तोत्रे, संत साहित्य — महाराष्ट्राच्या भक्ती संपदेचा डिजिटल संग्रह एक्सप्लोर करा." />
      <VitthalayaShell
        title="Explore Sacred Literature"
        description="Discover the profound compositions of Marathi saints and deities."
        primaryHref="/search"
        primaryLabel="Search Compositions"
        eyebrow="Spiritual Discovery"
        stats={[
          { label: 'Compositions', value: stats?.compositions?.toLocaleString() || '...' },
          { label: 'Saints', value: stats?.saints?.toLocaleString() || '...' },
          { label: 'Categories', value: stats?.categories?.toLocaleString() || '...' },
        ]}
      >
        {/* Page-specific content */}
        <div className="mt-12 space-y-12">
          {/* Category Browsing */}
          <section aria-labelledby="category-browse">
            <h2 id="category-browse" className="text-saffron-300 text-xl font-medium mb-4">
              साहित्य श्रेणींचे अन्वेषण करा
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(CATEGORY_COVERS).map(([label, info]) => (
                <Link
                  key={label}
                  href={info.path}
                  className="group relative overflow-hidden rounded-2xl aspect-[4/3] flex flex-col justify-end p-5 border border-saffron/10 transition-all duration-300 hover:border-saffron/30 hover:shadow-2xl hover:-translate-y-1"
                >
                  <div className="absolute inset-0 z-0">
                    <Image
                      src={info.img}
                      alt={label}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent group-hover:via-saffron-950/20 group-hover:from-saffron-950/80 transition-colors duration-300" />
                  </div>

                  <div className="relative z-10 space-y-1 text-left">
                    <span className="text-saffron text-[10px] font-bold uppercase tracking-wider">{info.en}</span>
                    <h3 className="text-white text-xl font-bold font-marathi">{label}</h3>
                    <p className="text-white/60 text-xs font-mono">{info.count} रचना</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Trending Compositions */}
          {!loading && trending.length > 0 && (
            <section aria-labelledby="trending">
              <h2 id="trending" className="text-saffron-300 text-xl font-medium mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                ट्रेंडिंग रचना
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trending.slice(0, 6).map((comp) => (
                  <Link
                    key={comp.id}
                    href={`/abhang/${comp.slug}`}
                    className="group bg-card rounded-xl p-4 border border-saffron/10 hover:border-saffron/30 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-marathi font-medium text-foreground group-hover:text-saffron transition-colors truncate">
                          {comp.titleMarathi}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {comp.saintName || 'अज्ञात संत'} • {comp.type}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-saffron transition-colors flex-shrink-0 ml-2" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Festivals */}
          {!loading && upcomingFestivals.length > 0 && (
            <section aria-labelledby="festivals">
              <h2 id="festivals" className="text-saffron-300 text-xl font-medium mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                आगामी उत्सव
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingFestivals.slice(0, 4).map((festival) => (
                  <Link
                    key={festival.id}
                    href={`/festival/${festival.nameTranslit.toLowerCase().replace(/\s+/g, '-')}`}
                    className="group bg-card rounded-xl p-4 border border-saffron/10 hover:border-saffron/30 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-saffron/10 flex items-center justify-center">
                        <Star className="w-5 h-5 text-saffron" />
                      </div>
                      <div>
                        <h3 className="font-marathi font-medium text-foreground group-hover:text-saffron transition-colors">
                          {festival.nameMarathi}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {festival.nameTranslit}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="bg-card rounded-2xl p-8 border border-saffron/10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center text-left">
            <div className="md:col-span-7 space-y-4">
              <h2 className="font-marathiHeading text-2xl text-saffron-500">
                डिजिटल पंढरपूरबद्दल
              </h2>
              <p className="text-saffron-100 text-base sm:text-lg leading-relaxed font-marathi">
                महाराष्ट्राच्या भक्ती संपदेचा डिजिटल संग्रह — अभंग, भजन, गौळणी, आरत्या, स्तोत्रे आणि संत साहित्य. 
                वारकरी संप्रदायाच्या प्राचीन साहित्याला डिजिटल स्वरूपात सुरक्षित ठेवून नव्या पिढीपर्यंत पोहोचवण्याचा आमचा ध्यास आहे.
              </p>
            </div>
            <div className="md:col-span-5 relative aspect-[4/3] rounded-xl overflow-hidden border border-saffron/20 shadow-lg">
              <Image
                src="/images/realistic/pandharpur-temple.jpg"
                alt="Pandharpur Temple Spire"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          </section>
        </div>
      </VitthalayaShell>
    </>
  );
}