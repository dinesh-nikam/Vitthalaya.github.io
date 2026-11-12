'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  BookOpen,
  Compass,
  Music,
  Scroll,
  ArrowRight,
  Disc,
  Play,
} from 'lucide-react';
import { SaintCardVisual } from '@/components/saint-card-visual';
import { DevotionalPrahar } from '@/components/devotional-prahar';
import { SanctumExperience } from '@/components/3d/sanctum-experience';
import { Vitthalaya3DSanctuary } from '@/components/3d/vitthalaya-3d-sanctuary';
import { WariInteractiveRoute } from '@/components/wari-interactive-route';
import { SanctumGateway } from '@/components/cinematic/sanctum-gateway';
import { SoundController } from '@/components/cinematic/sound-controller';
import { ParticleCanvas } from '@/components/cinematic/particle-canvas';
import { TanpuraDrone } from '@/components/tanpura-drone';
import { useScrollReveal } from '@/components/cinematic/use-scroll-reveal';
import '@/app/homepage.css';

export interface Saint {
  id: string;
  nameMarathi: string;
  nameTranslit: string;
  slug: string;
  period: string | null;
  biography: string | null;
  region: string | null;
}

export interface Category {
  slug: string;
  nameMarathi: string;
  count: number;
}

export interface FeaturedComposition {
  id: string;
  titleMarathi: string;
  titleTranslit: string | null;
  slug: string;
  fullText: string;
  type: string;
  saint: {
    id?: string;
    nameMarathi: string;
    slug: string;
  } | null;
}

export interface AudioItem {
  id: string;
  titleMarathi: string;
  titleTranslit: string | null;
  duration: number | null;
  audioUrl: string;
  performer: string | null;
}

export interface VitthalayaPilgrimageProps {
  saints: Saint[];
  categories: Category[];
  totalBooks: number;
  totalCompositions: number;
  featuredComposition?: FeaturedComposition | null;
  recentAudios?: AudioItem[];
}

const CATEGORY_IMAGES: Record<string, string> = {
  abhang: '/images/categories/abhang.jpg',
  bhajan: '/images/categories/bhajan.jpg',
  aarti: '/images/categories/aarti.jpg',
  stotra: '/images/categories/stotra.jpg',
  haripath: '/images/categories/haripath.jpg',
  default: '/images/realistic/ancient-manuscript.jpg',
};

export function VitthalayaPilgrimage({
  saints,
  categories,
  totalBooks,
  totalCompositions,
  featuredComposition,
  recentAudios = [],
}: VitthalayaPilgrimageProps) {
  const [query, setQuery] = React.useState('');

  // ── Cinematic gateway + sound state ──────────────────────
  const [showGateway, setShowGateway] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return !sessionStorage.getItem('dp_gateway_seen');
  });
  const [awakened, setAwakened] = React.useState(() => {
    if (typeof window === 'undefined') return true;
    return !!sessionStorage.getItem('dp_gateway_seen');
  });
  const [soundPlaying, setSoundPlaying] = React.useState(false);

  const handleAwakened = React.useCallback(() => {
    setShowGateway(false);
    setAwakened(true);
    setSoundPlaying(true);
  }, []);

  // ── Scroll-reveal refs for each act ──────────────────────
  const heroRef      = useScrollReveal<HTMLElement>(0.05);
  const saintsRef    = useScrollReveal<HTMLElement>(0.08);
  const audioRef     = useScrollReveal<HTMLElement>(0.08);
  const genresRef    = useScrollReveal<HTMLElement>(0.08);
  const wariRef      = useScrollReveal<HTMLElement>(0.08);
  const booksRef     = useScrollReveal<HTMLElement>(0.08);
  const heritageRef  = useScrollReveal<HTMLElement>(0.08);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (query.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
    }
  };

  const handlePlayAudio = (audio: AudioItem) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('play-track', {
          detail: {
            id: audio.id,
            titleMarathi: audio.titleMarathi,
            titleTranslit: audio.titleTranslit || audio.titleMarathi,
            saintName: audio.performer || 'वारकरी गायक',
            audioUrl: audio.audioUrl,
          },
        })
      );
    }
  };

  return (
    <div className="vitthalaya-shell">
      {/* ── 0. Cinematic gateway (once per session) ── */}
      {showGateway && <SanctumGateway onAwakened={handleAwakened} />}

      {/* ── Headless tanpura drone — controlled by SoundController ── */}
      {awakened && (
        <TanpuraDrone
          isActive={soundPlaying}
          onStateChange={setSoundPlaying}
          hidden
        />
      )}

      {/* ── Floating sound controller (shown after awakening) ── */}
      {awakened && (
        <SoundController
          isPlaying={soundPlaying}
          onToggle={() => setSoundPlaying((p) => !p)}
        />
      )}
      {/* ── 1. Sacred Sanctuary Hero (cinematic upgrade) ── */}
      <section
        ref={heroRef}
        className="relative overflow-hidden border-b border-[var(--dp-rule)]"
        style={{ paddingTop: 'var(--dp-hero-padding-top)', paddingBottom: 'var(--dp-act-padding)' }}
        aria-labelledby="hero-title"
      >
        {/* Ambient gold-dust particle field */}
        <ParticleCanvas
          count={30}
          className="absolute inset-0 pointer-events-none"
        />

        {/* Radial gold halo behind the title */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(246,188,85,0.07) 0%, transparent 70%)',
          }}
        />

        <div className="vitthalaya-container text-center relative z-10">
          <p className="text-xs font-marathi text-[var(--dp-gold-celestial)] mb-4 tracking-wide">
            ज्ञानोबा तुकाराम · डिजिटल पंढरपूर
          </p>

          <h1
            id="hero-title"
            className="dp-epic-title dp-gold-text mb-6 max-w-5xl mx-auto"
          >
            वारकरी भक्तीचे डिजिटल मंदिर
          </h1>

          <p className="vitthalaya-prose text-base sm:text-lg max-w-2xl mx-auto mb-10 text-[var(--dp-ink-dim)]">
            संतसाहित्य, अभंग, ग्रंथ आणि वारीचा {totalCompositions.toLocaleString('en-IN')} हून अधिक रचनांचा अधिकृत डिजिटल संग्रह.
          </p>

          {/* Primary Search Action */}
          <div className="max-w-xl mx-auto mb-8">
            <form onSubmit={handleSearch} role="search" className="vitthalaya-search-bar">
              <div className="pl-4 pr-2 text-[var(--dp-muted)]" aria-hidden="true">
                <Search size={18} />
              </div>
              <label htmlFor="search-input" className="sr-only">
                अभंग, संत, किंवा विषय शोधा
              </label>
              <input
                id="search-input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="अभंग, संत, किंवा विषय शोधा..."
                className="vitthalaya-search-input text-base"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!query.trim()}
                className="vitthalaya-btn-primary m-1 px-5 py-2 text-sm active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
              >
                शोधा
              </button>
            </form>
          </div>

          {/* Direct Category Links */}
          <nav aria-label="मुख्य विभाग" className="flex flex-wrap justify-center gap-3 text-sm mb-12">
            <Link
              href="/search"
              className="px-4 py-2 rounded border border-[var(--dp-rule)] text-[var(--dp-ink-dim)] hover:border-[var(--dp-gold)] hover:text-[var(--dp-ink)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
            >
              सर्व अभंग
            </Link>
            <Link
              href="/sant"
              className="px-4 py-2 rounded border border-[var(--dp-rule)] text-[var(--dp-ink-dim)] hover:border-[var(--dp-gold)] hover:text-[var(--dp-ink)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
            >
              संत परिचय
            </Link>
            <Link
              href="/daily"
              className="px-4 py-2 rounded border border-[var(--dp-gold)] text-[var(--dp-gold)] font-bold hover:bg-[var(--dp-gold)]/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
            >
              नित्य भक्ती
            </Link>
            <Link
              href="/sanctuary"
              className="px-4 py-2 rounded border border-[var(--dp-gold)] text-[var(--dp-gold)] font-bold hover:bg-[var(--dp-gold)]/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px flex items-center gap-1.5"
            >
              <Compass size={14} className="text-[var(--dp-gold)]" aria-hidden="true" />
              <span>३D संगीत मंडप</span>
            </Link>
            <Link
              href="/wari"
              className="px-4 py-2 rounded border border-[var(--dp-rule)] text-[var(--dp-ink-dim)] hover:border-[var(--dp-gold)] hover:text-[var(--dp-ink)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
            >
              आषाढी वारी
            </Link>
            <Link
              href="/books"
              className="px-4 py-2 rounded border border-[var(--dp-rule)] text-[var(--dp-ink-dim)] hover:border-[var(--dp-gold)] hover:text-[var(--dp-ink)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
            >
              पवित्र ग्रंथ
            </Link>
            <Link
              href="/collections"
              className="px-4 py-2 rounded border border-[var(--dp-rule)] text-[var(--dp-ink-dim)] hover:border-[var(--dp-gold)] hover:text-[var(--dp-ink)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
            >
              ध्वनिमुद्रण संग्रह
            </Link>
          </nav>

          {/* Real-time Devotional Prahar & Meditative Soundscape */}
          <div className="max-w-4xl mx-auto text-left">
            <DevotionalPrahar />
          </div>
        </div>
      </section>

      {/* ── 2. Interactive 3D Sanctum Experience ── */}
      <section className="vitthalaya-section vitthalaya-section-well" aria-labelledby="sanctum-heading">
        <div className="vitthalaya-container">
          <SanctumExperience />
        </div>
      </section>

      {/* ── 3. Featured Verse Excerpt (Real Material) ── */}
      {featuredComposition && (
        <section className="vitthalaya-section" aria-labelledby="featured-verse-title">
          <div className="vitthalaya-container">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-[var(--dp-gold)] font-marathi">
                  दैनंदिन अभंग दर्शन
                </span>
                {featuredComposition.saint && (
                  <Link
                    href={`/sant/${featuredComposition.saint.slug}`}
                    className="text-xs text-[var(--dp-muted)] hover:text-[var(--dp-gold)] transition-colors font-marathi focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)]"
                  >
                    {featuredComposition.saint.nameMarathi}
                  </Link>
                )}
              </div>

              <div className="vitthalaya-manuscript rounded p-6 sm:p-8">
                <h2 id="featured-verse-title" className="vitthalaya-display text-2xl sm:text-3xl font-bold mb-4">
                  {featuredComposition.titleMarathi}
                </h2>

                <p className="vitthalaya-verse-text mb-6">
                  {featuredComposition.fullText.slice(0, 320)}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-[var(--dp-rule)]">
                  <Link
                    href={`/abhang/${featuredComposition.slug}`}
                    className="vitthalaya-btn-primary text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
                  >
                    पूर्ण अभंग वाचा
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                  {featuredComposition.saint && (
                    <Link
                      href={`/sant/${featuredComposition.saint.slug}`}
                      className="vitthalaya-btn-secondary text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
                    >
                      संत चरित्राकडे जा
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 4. Saints of Bhakti ── */}
      <section ref={saintsRef} className="vitthalaya-section vitthalaya-section-well" aria-labelledby="saints-heading">
        <div className="vitthalaya-container">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <p className="text-xs text-[var(--dp-gold)] font-marathi mb-1">
                वारकरी परंपरा
              </p>
              <h2 id="saints-heading" className="vitthalaya-display text-2xl sm:text-3xl font-bold">
                भक्ती चळवळीचे मार्गदर्शक संत
              </h2>
            </div>
            <Link
              href="/sant"
              className="text-sm text-[var(--dp-gold)] hover:underline inline-flex items-center gap-1 font-marathi focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)]"
            >
              सर्व संत पहा ({saints.length})
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {saints.map((saint) => (
              <Link
                key={saint.id}
                href={`/sant/${saint.slug}`}
                className="dp-saint-card block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)]"
              >
                <SaintCardVisual
                  slug={saint.slug}
                  nameMarathi={saint.nameMarathi}
                  nameTranslit={saint.nameTranslit}
                  period={saint.period}
                  region={saint.region}
                />
                <div className="p-4">
                  <h3 className="vitthalaya-display text-lg font-bold text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors">
                    {saint.nameMarathi}
                  </h3>
                    <p className="text-xs text-[var(--dp-muted)] font-marathi mt-0.5">
                      {saint.period || 'भक्ती कालखंड'}
                      {saint.region ? ` • ${saint.region}` : ''}
                    </p>
                    <p className="text-xs text-[var(--dp-ink-dim)] line-clamp-2 mt-2 font-marathi leading-relaxed">
                      {saint.biography || `${saint.nameMarathi} यांचे अध्यात्मिक विचार व अभंग रचना.`}
                    </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Devotional Audio & Archives (Listen Action) ── */}
      <section ref={audioRef} className="vitthalaya-section" aria-labelledby="audio-heading">
        <div className="vitthalaya-container">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <p className="text-xs text-[var(--dp-gold)] font-marathi mb-1">
                श्राव्य वारसा
              </p>
              <h2 id="audio-heading" className="vitthalaya-display text-2xl sm:text-3xl font-bold">
                भजन व कीर्तन संग्रह
              </h2>
            </div>
            <Link
              href="/collections"
              className="text-sm text-[var(--dp-gold)] hover:underline inline-flex items-center gap-1 font-marathi focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)]"
            >
              संपूर्ण ध्वनिसंग्रह
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {recentAudios.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentAudios.map((audio) => (
                <div key={audio.id} className="vitthalaya-card rounded p-5 flex flex-col justify-between border border-[var(--dp-rule)]">
                  <div>
                    <div className="flex items-center justify-between text-[var(--dp-gold)] mb-3">
                      <div className="flex items-center gap-1.5 text-xs font-marathi">
                        <Music size={15} aria-hidden="true" />
                        <span>पवित्र ध्वनिमुद्रण</span>
                      </div>
                      {audio.duration && (
                        <span className="text-[11px] text-[var(--dp-muted)] font-mono">
                          {Math.floor(audio.duration / 60)}:{(audio.duration % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                    </div>
                    <h3 className="vitthalaya-display text-lg font-bold mb-1 text-[var(--dp-ink)]">
                      {audio.titleMarathi}
                    </h3>
                    {audio.performer && (
                      <p className="text-xs text-[var(--dp-muted)] font-marathi">
                        गायक: {audio.performer}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-[var(--dp-rule)] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handlePlayAudio(audio)}
                      className="vitthalaya-btn-primary text-xs inline-flex items-center gap-1.5 py-1.5 px-3.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
                      aria-label={`${audio.titleMarathi} ऐका`}
                    >
                      <Play size={12} className="fill-current" aria-hidden="true" />
                      <span>ऐका</span>
                    </button>
                    <span className="text-[11px] text-[var(--dp-muted)] font-marathi">
                      उच्च दर्जा ऑडिओ
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="vitthalaya-card rounded p-8 text-center max-w-2xl mx-auto border border-[var(--dp-rule)] mb-8">
              <Disc className="w-10 h-10 text-[var(--dp-gold)] mx-auto mb-3" aria-hidden="true" />
              <h3 className="vitthalaya-display text-xl font-bold mb-2">
                ध्वनिमुद्रण डिजिटायझेशन सुरू आहे
              </h3>
              <p className="vitthalaya-prose text-sm text-[var(--dp-ink-dim)] mb-6">
                मंदिरांमधील दुर्मिळ कीर्तने व शास्त्रीय भजनांचे डिजिटायझेशन प्रगतिपथावर आहे. आपल्याकडे जुने ध्वनिमुद्रण असल्यास संग्रहात सहकार्य करा.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/acquire/upload" className="vitthalaya-btn-primary text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px">
                  ध्वनिमुद्रण सादर करा
                </Link>
                <Link href="/collections" className="vitthalaya-btn-secondary text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px">
                  उपलब्ध सूची पहा
                </Link>
              </div>
            </div>
          )}

          {/* 3D Sacred Music Sanctuary (All Scraped Regional Compositions) */}
          <div className="mt-8">
            <Vitthalaya3DSanctuary />
          </div>
        </div>
      </section>

      {/* ── 6. Categories & Literary Genres ── */}
      <section ref={genresRef} className="vitthalaya-section vitthalaya-section-well" aria-labelledby="genres-heading">
        <div className="vitthalaya-container">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <p className="text-xs text-[var(--dp-gold)] font-marathi mb-1">
                साहित्य वर्गीकरण
              </p>
              <h2 id="genres-heading" className="vitthalaya-display text-2xl sm:text-3xl font-bold">
                काव्य आणि भक्ती प्रकार
              </h2>
            </div>
            <Link
              href="/category"
              className="text-sm text-[var(--dp-gold)] hover:underline inline-flex items-center gap-1 font-marathi focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)]"
            >
              सर्व रचना
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => {
              const bgImg = CATEGORY_IMAGES[cat.slug] || CATEGORY_IMAGES.default;
              return (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="vitthalaya-card rounded p-4 text-center group block border border-[var(--dp-rule)] hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
                >
                  <div className="relative w-12 h-12 mx-auto mb-3 rounded overflow-hidden">
                    <Image
                      src={bgImg}
                      alt={cat.nameMarathi}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <h3 className="vitthalaya-display text-base font-bold text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors">
                    {cat.nameMarathi}
                  </h3>
                  <p className="text-xs text-[var(--dp-muted)] font-marathi mt-1">
                    {cat.count.toLocaleString('en-IN')} रचना
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 7. The Holy Wari Pilgrimage with Interactive Route ── */}
      <section ref={wariRef} className="vitthalaya-section" aria-labelledby="wari-heading">
        <div className="vitthalaya-container space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <p className="text-xs text-[var(--dp-gold)] font-marathi mb-1">
                पवित्र पदभ्रमण
              </p>
              <h2 id="wari-heading" className="vitthalaya-display text-3xl sm:text-4xl font-bold mb-4">
                आषाढी वारी आणि पालखी सोहळा
              </h2>
              <p className="vitthalaya-prose text-base text-[var(--dp-ink-dim)] mb-6">
                देहू व आळंदी ते पंढरपूर पर्यंतचा शेकडो किलोमीटरचा पायी प्रवास. लाखो वारकऱ्यांची विठ्ठल नामाची अखंड गर्जना आणि भक्तीचा अनुपम संगम.
              </p>

              <div className="flex flex-wrap gap-4 items-center">
                <Link href="/wari" className="vitthalaya-btn-primary text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px">
                  वारी संपूर्ण मार्गदर्शिका
                  <Compass size={16} aria-hidden="true" />
                </Link>
                <Link href="/search?q=वारी" className="vitthalaya-btn-secondary text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px">
                  वारीवरील अभंग
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative aspect-[16/10] rounded overflow-hidden border border-[var(--dp-rule)]">
                <Image
                  src="/images/realistic/wari-procession.jpg"
                  alt="वारी पदयात्रा मिरवणूक"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          {/* Interactive Wari Waypoints Component */}
          <WariInteractiveRoute />
        </div>
      </section>

      {/* ── 8. Sacred Books & Manuscripts ── */}
      <section ref={booksRef} className="vitthalaya-section vitthalaya-section-well" aria-labelledby="books-heading">
        <div className="vitthalaya-container">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <p className="text-xs text-[var(--dp-gold)] font-marathi mb-1">
                प्रकाशित ग्रंथ
              </p>
              <h2 id="books-heading" className="vitthalaya-display text-2xl sm:text-3xl font-bold">
                प्राचीन ग्रंथ व हस्तलिखिते
              </h2>
            </div>
            <Link
              href="/books"
              className="text-sm text-[var(--dp-gold)] hover:underline inline-flex items-center gap-1 font-marathi focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)]"
            >
              सर्व ग्रंथ पहा ({totalBooks})
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Link href="/books" className="vitthalaya-card rounded p-6 group block border border-[var(--dp-rule)] hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px">
              <Scroll className="w-8 h-8 text-[var(--dp-gold)] mb-3" aria-hidden="true" />
              <h3 className="vitthalaya-display text-lg font-bold text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors">
                तुकाराम महाराज गाथा
              </h3>
              <p className="text-xs text-[var(--dp-ink-dim)] font-marathi mt-2 leading-relaxed">
                चार हजारहून अधिक अभंगांचा मूळ आणि प्रमाणित संग्रह.
              </p>
            </Link>

            <Link href="/books" className="vitthalaya-card rounded p-6 group block border border-[var(--dp-rule)] hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px">
              <BookOpen className="w-8 h-8 text-[var(--dp-gold)] mb-3" aria-hidden="true" />
              <h3 className="vitthalaya-display text-lg font-bold text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors">
                ज्ञानेश्वरी (भावार्थ दीपिका)
              </h3>
              <p className="text-xs text-[var(--dp-ink-dim)] font-marathi mt-2 leading-relaxed">
                श्रीमद्भगवद्गीतेवरील मराठीतील सर्वश्रेष्ठ व अद्वितीय भाष्य.
              </p>
            </Link>

            <Link href="/books" className="vitthalaya-card rounded p-6 group block border border-[var(--dp-rule)] hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px">
              <Disc className="w-8 h-8 text-[var(--dp-gold)] mb-3" aria-hidden="true" />
              <h3 className="vitthalaya-display text-lg font-bold text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors">
                एकनाथी भागवत
              </h3>
              <p className="text-xs text-[var(--dp-ink-dim)] font-marathi mt-2 leading-relaxed">
                भागवत एकादश स्कंधावरील संत एकनाथ महाराजांची अमृततुल्य टीका.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 9. Pandharpur Heritage & Community ── */}
      <section ref={heritageRef} className="vitthalaya-section" aria-labelledby="heritage-heading">
        <div className="vitthalaya-container">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 id="heritage-heading" className="vitthalaya-display text-3xl sm:text-4xl font-bold">
              श्री क्षेत्र पंढरपूर आणि चंद्रभागा
            </h2>
            <p className="vitthalaya-prose text-base leading-relaxed">
              भूवैकुंठ मानले गेलेले पंढरपूर, जिथे विठुराया भक्तांसाठी विटेवर उभा आहे. चंद्रभागेच्या पावन स्नानाने आणि संतांच्या संगतीने जीवनाचे सार्थक होते.
            </p>
            <div className="pt-4 flex flex-wrap justify-center gap-4">
              <Link href="/search?q=पंढरपूर" className="vitthalaya-btn-primary text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px">
                पंढरपूर महात्म्य अभंग
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <Link href="/about" className="vitthalaya-btn-secondary text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px">
                डिजिटल पंढरपूर संकल्पना
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
