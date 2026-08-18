'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Users, Upload, BookMarked, Shield, Eye, Heart } from 'lucide-react';
import '@/app/homepage.css';
import { ChapterHero } from './features/pilgrimage/hero-section';
import { ChapterBhakti } from './features/pilgrimage/timeline-section';
import { ChapterWari } from './features/pilgrimage/wari-section';
import { useScrollReveal } from './features/pilgrimage/hooks';


/* ── Types ── */
interface Saint {
  id: string;
  nameMarathi: string;
  nameTranslit: string;
  slug: string;
  period: string | null;
  biography: string | null;
  region: string | null;
}

interface Category {
  slug: string;
  nameMarathi: string;
  count: number;
}

interface VitthalayaPilgrimageProps {
  saints: Saint[];
  categories: Category[];
  totalBooks: number;
  totalCompositions: number;
}

const WARI_STOPS = ['Dehu', 'Aalandi', 'Pune', 'Saswad', 'Wakhari', 'Pandharpur'];

/* ── Main Component ── */
export function VitthalayaPilgrimage({
  saints,
  categories,
  totalBooks,
  totalCompositions,
}: VitthalayaPilgrimageProps) {
  const [progress, setProgress] = React.useState(0);
  const [query, setQuery] = React.useState('');

  // Scroll tracking
  React.useEffect(() => {
    const updateProgress = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(maxScroll > 0 ? window.scrollY / maxScroll : 0);
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => { window.removeEventListener('scroll', updateProgress); window.removeEventListener('resize', updateProgress); };
  }, []);

  const activeStop = WARI_STOPS[Math.min(WARI_STOPS.length - 1, Math.floor(progress * WARI_STOPS.length))];

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (query.trim()) window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
  };

  return (
    <div className="vitthalaya-shell">
      {/* Ambient Particles */}
      <div className="ambient-particles" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => <div key={i} className="ambient-particle" />)}
      </div>

      {/* Progress Bar */}
      <div className="pilgrimage-progress" style={{ transform: `scaleX(${progress})` }} />

      {/* Chapter 1: Hero */}
      <ChapterHero
        totalCompositions={totalCompositions}
        onSearch={handleSearch}
        query={query}
        setQuery={setQuery}
        progress={progress}
      />

      <main className="vitthalaya-main">
        {/* Chapter 2: Welcome */}
        <ChapterWelcome
          totalCompositions={totalCompositions}
          totalBooks={totalBooks}
          saintsCount={saints.length}
        />

        {/* Chapter 3: Bhakti Timeline */}
        <ChapterBhakti />

        {/* Chapter 4: Saints */}
        <ChapterSaints saints={saints} />

        {/* Chapter 5: Wari */}
        <ChapterWari activeStop={activeStop} progress={progress} />

        {/* Chapter 6: Galaxy */}
        <ChapterGalaxy />

        {/* Chapter 7: Categories */}
        <ChapterCategories categories={categories} />

        {/* Chapter 8: Books */}
        <ChapterBooks />

        {/* Chapter 9: Community */}
        <ChapterCommunity
          totalCompositions={totalCompositions}
          saintsCount={saints.length}
        />

        {/* Chapter 10: Preservation */}
        <ChapterPreservation />

        {/* Chapter 11: CTA */}
        <ChapterCTA />
      </main>
    </div>
  );
}

/* ============================================================
   CHAPTER 2 — WELCOME: Split Composition
   ============================================================ */
function ChapterWelcome({
  totalCompositions,
  totalBooks,
  saintsCount,
}: {
  totalCompositions: number;
  totalBooks: number;
  saintsCount: number;
}) {
  const reveal = useScrollReveal();

  return (
    <section
      className={`dp-chapter dp-welcome dp-reveal ${reveal.isVisible ? 'visible' : ''}`}
      aria-labelledby="welcome-title"
      ref={reveal.ref}
    >
      <div className="dp-chapter-inner">
        <div className="dp-welcome-grid">
          <div className="dp-welcome-text">
            <div className="dp-kicker">Chapter 1 — Arrival</div>
            <h2 id="welcome-title" className="dp-title">
              Welcome to Maharashtra
            </h2>
            <p className="dp-subtitle" style={{ marginTop: '1rem' }}>
              Vitthalaya turns the archive into a moving pilgrimage through saints, abhangs, books,
              festivals, and living devotion. Every composition carries the breath of centuries.
            </p>

            <div className="dp-welcome-stats dp-stagger" style={{ transitionDelay: '200ms' }}>
              <div className="dp-stat">
                <span className="dp-stat-value">{totalCompositions.toLocaleString('en-IN')}+</span>
                <span className="dp-stat-label">Compositions</span>
              </div>
              <div className="dp-stat">
                <span className="dp-stat-value">{saintsCount}+</span>
                <span className="dp-stat-label">Saints</span>
              </div>
              <div className="dp-stat">
                <span className="dp-stat-value">{totalBooks.toLocaleString('en-IN')}+</span>
                <span className="dp-stat-label">Books</span>
              </div>
            </div>
          </div>

          <div className="dp-welcome-image">
            <Image
              src="/images/warkari-pilgrimage.png"
              alt="Warkari pilgrims walking with saffron flags during Ashadhi Wari procession"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{ objectFit: 'cover' }}
              priority
            />
            <div className="dp-welcome-image-overlay">
              <span className="dp-welcome-image-caption">
                Warkari procession — Ashadhi Wari, Pandharpur
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CHAPTER 4 — SAINTS: Portrait Gallery
   ============================================================ */
const SAINT_IMAGES: Record<string, string> = {
  'dnyaneshwar-maharaj': '/images/saints/dnyaneshwar.jpg',
  'namdev-maharaj': '/images/registry/s18.jpg',
  'eknath-maharaj': '/images/realistic/ancient-manuscript.jpg',
  'tukaram-maharaj': '/images/saints/tukaram-birthplace.jpg',
  'sant-janabai': '/images/realistic/chandrabhaga-river.jpg',
  'samarth-ramdas-swami': '/images/realistic/saint-devotional.jpg',
  'default': '/images/realistic/saint-devotional.jpg',
};

function ChapterSaints({ saints }: { saints: Saint[] }) {
  const reveal = useScrollReveal();

  return (
    <section
      className={`dp-chapter dp-saints dp-reveal ${reveal.isVisible ? 'visible' : ''}`}
      aria-labelledby="saints-title"
      ref={reveal.ref}
    >
      <div className="dp-chapter-inner">
        <div className="dp-kicker">Chapter 3 — Meet the Saints</div>
        <h2 id="saints-title" className="dp-title">
          The Voices of Bhakti
        </h2>
        <p className="dp-subtitle" style={{ marginTop: '0.5rem' }}>
          Each saint carried a unique relationship with the divine. Their words became the prayers of millions.
        </p>

        <div className="dp-saints-grid dp-stagger">
          {saints.slice(0, 8).map((saint) => (
            <SaintCard key={saint.id} saint={saint} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SaintCard({ saint }: { saint: Saint }) {
  const imageUrl = SAINT_IMAGES[saint.slug] || SAINT_IMAGES['default'];

  return (
    <Link href={`/sant/${saint.slug}`} className="dp-saint-card">
      <div className="dp-saint-portrait">
        <Image
          src={imageUrl}
          alt={`${saint.nameTranslit} — ${saint.nameMarathi}`}
          fill
          sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 25vw"
          style={{ objectFit: 'cover' }}
        />
        <div className="dp-saint-halo" aria-hidden="true" />
        <div className="dp-saint-info">
          <div className="dp-saint-period">{saint.period || 'Bhakti Era'}</div>
          <h3 className="dp-saint-name">{saint.nameMarathi}</h3>
          <p className="dp-saint-translit">{saint.nameTranslit}</p>
        </div>
      </div>
      <div className="dp-saint-bio">
        <p>{saint.biography || `The spiritual journey of ${saint.nameTranslit} spans centuries of devotional poetry and sacred teachings.`}</p>
        <div className="dp-saint-bio-meta">
          <span className="dp-saint-bio-stat">{saint.region || 'Maharashtra'}</span>
          {saint.period && <span className="dp-saint-bio-stat">{saint.period}</span>}
        </div>
      </div>
    </Link>
  );
}

/* ============================================================
   CHAPTER 6 — GALAXY: Knowledge Constellation
   ============================================================ */
const GALAXY_NODES = [
  { label: 'Saints', href: '/sant', x: 18, y: 32 },
  { label: 'Abhangs', href: '/search', x: 48, y: 18 },
  { label: 'Books', href: '/books', x: 78, y: 34 },
  { label: 'Festivals', href: '/festival', x: 30, y: 70 },
  { label: 'Temples', href: '/explore', x: 62, y: 66 },
  { label: 'Audio', href: '/collections', x: 86, y: 74 },
];

function ChapterGalaxy() {
  const reveal = useScrollReveal();

  return (
    <section
      className={`dp-chapter dp-galaxy dp-reveal ${reveal.isVisible ? 'visible' : ''}`}
      aria-labelledby="galaxy-title"
      ref={reveal.ref}
    >
      <div className="dp-chapter-inner" style={{ textAlign: 'center' }}>
        <div className="dp-kicker" style={{ justifyContent: 'center' }}>Chapter 5 — Universe</div>
        <h2 id="galaxy-title" className="dp-title">
          Vitthalaya Universe
        </h2>
        <p className="dp-subtitle" style={{ margin: '0.5rem auto 0' }}>
          Zoom through relationships between saints, abhangs, festivals, books, audio, and places.
        </p>

        <div className="dp-galaxy-map">
          {/* Orbital rings */}
          <div className="dp-galaxy-ring" style={{ inset: '15%', transform: 'rotate(-8deg)' }} />
          <div className="dp-galaxy-ring" style={{ inset: '28%', transform: 'rotate(15deg)' }} />

          {/* Connection lines (SVG) */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {GALAXY_NODES.map((node, i) => {
              const next = GALAXY_NODES[(i + 1) % GALAXY_NODES.length];
              return (
                <line
                  key={i}
                  x1={`${node.x}%`} y1={`${node.y}%`}
                  x2={`${next.x}%`} y2={`${next.y}%`}
                  stroke="rgba(246,188,85,0.12)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {GALAXY_NODES.map((node) => (
            <Link
              key={node.label}
              href={node.href}
              className="dp-galaxy-node"
              style={{ left: `${node.x}%`, top: `${node.y}%` } as React.CSSProperties}
            >
              {node.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CHAPTER 7 — CATEGORIES: Editorial Cards
   ============================================================ */
const CATEGORY_IMAGES: Record<string, string> = {
  'abhang': '/images/categories/abhang.jpg',
  'bhajan': '/images/categories/bhajan.jpg',
  'aarti': '/images/categories/aarti.jpg',
  'stotra': '/images/categories/stotra.jpg',
  'haripath': '/images/categories/haripath.jpg',
  'gaulani': '/images/realistic/wari-procession.jpg',
  'deviche_gane': '/images/realistic/temple-aarti.jpg',
  'vitthal': '/images/realistic/pandharpur-temple.jpg',
  'kirtan': '/images/realistic/saint-devotional.jpg',
  'powada': '/images/realistic/ancient-manuscript.jpg',
  'devi': '/images/realistic/temple-aarti.jpg',
  'ganpati': '/images/realistic/pandharpur-temple.jpg',
  'shiva': '/images/realistic/chandrabhaga-river.jpg',
  'namasmaran': '/images/realistic/saint-devotional.jpg',
};

const CATEGORY_DEFAULTS = [
  '/images/realistic/temple-aarti.jpg',
  '/images/realistic/chandrabhaga-river.jpg',
  '/images/realistic/saint-devotional.jpg',
];

function ChapterCategories({ categories }: { categories: Category[] }) {
  const reveal = useScrollReveal();

  return (
    <section
      className={`dp-chapter dp-categories dp-reveal ${reveal.isVisible ? 'visible' : ''}`}
      aria-labelledby="categories-title"
      ref={reveal.ref}
    >
      <div className="dp-chapter-inner">
        <div className="dp-kicker">Chapter 6 — Sacred Worlds</div>
        <h2 id="categories-title" className="dp-title">
          Categories become places
        </h2>
        <p className="dp-subtitle" style={{ marginTop: '0.5rem' }}>
          Each category is a world of its own — manuscript pages, temple aartis, festival crowds, and sacred instruments.
        </p>

        <div className="dp-categories-grid dp-stagger">
          {categories.slice(0, 8).map((cat, i) => {
            const img = CATEGORY_IMAGES[cat.slug] || CATEGORY_DEFAULTS[i % CATEGORY_DEFAULTS.length];
            return (
              <Link key={cat.slug} href={`/category/${cat.slug}`} className="dp-category-card">
                <div className="dp-category-bg">
                  <Image
                    src={img}
                    alt={`${cat.nameMarathi} category`}
                    fill
                    sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 25vw"
                    style={{ objectFit: 'cover' }}
                  />
                </div>
                <div className="dp-category-overlay" />
                <div className="dp-category-content">
                  <div className="dp-category-count">{cat.count.toLocaleString('en-IN')} compositions</div>
                  <h3 className="dp-category-name">{cat.nameMarathi}</h3>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CHAPTER 8 — BOOKS: Museum Shelf
   ============================================================ */
const BOOK_ITEMS = [
  { title: 'तुकाराम अभंग संग्रह', meta: 'Saint Tukaram · 17th Century', image: '/images/realistic/wari-procession.jpg' },
  { title: 'ज्ञानेश्वरी', meta: 'Saint Dnyaneshwar · 13th Century', image: '/images/realistic/saint-devotional.jpg' },
  { title: 'हरिपाठ', meta: 'Devotional Poetry', image: '/images/realistic/ancient-manuscript.jpg' },
  { title: 'वारकरी भजन', meta: 'Temple Hymns', image: '/images/realistic/temple-aarti.jpg' },
  { title: 'आरती संग्रह', meta: 'Evening Prayers', image: '/images/realistic/temple-aarti.jpg' },
  { title: 'स्तोत्र मंजरी', meta: 'Sacred Hymns', image: '/images/realistic/chandrabhaga-river.jpg' },
];

function ChapterBooks() {
  const reveal = useScrollReveal();

  return (
    <section
      className={`dp-chapter dp-books dp-reveal ${reveal.isVisible ? 'visible' : ''}`}
      aria-labelledby="books-title"
      ref={reveal.ref}
    >
      <div className="dp-chapter-inner">
        <div className="dp-kicker">Chapter 7 — Artifacts</div>
        <h2 id="books-title" className="dp-title">
          Books & Sacred Texts
        </h2>
        <p className="dp-subtitle" style={{ marginTop: '0.5rem' }}>
          Museum shelves hold centuries of devotional literature — from palm-leaf manuscripts to printed gathas.
        </p>

        <div className="dp-books-grid dp-stagger">
          {BOOK_ITEMS.map((book, i) => (
            <Link key={i} href="/books" className="dp-book">
              <div className="dp-book-cover">
                <Image
                  src={book.image}
                  alt={book.title}
                  fill
                  sizes="200px"
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <div className="dp-book-info">
                <h3 className="dp-book-title">{book.title}</h3>
                <p className="dp-book-meta">{book.meta}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CHAPTER 9 — COMMUNITY
   ============================================================ */
const COMMUNITY_ITEMS = [
  {
    icon: <Users size={22} />,
    title: 'Contributors',
    desc: 'Scholars, devotees, and volunteers who digitize manuscripts, verify texts, and enrich the archive daily.',
  },
  {
    icon: <Upload size={22} />,
    title: 'Recent Uploads',
    desc: 'New compositions added this week — verified, categorized, and ready for the world to read.',
  },
  {
    icon: <BookMarked size={22} />,
    title: 'Scholar Spotlight',
    desc: 'Recognizing the researchers and translators who make this digital preservation possible.',
  },
  {
    icon: <Heart size={22} />,
    title: 'Temple Partners',
    desc: 'Temples across Maharashtra sharing their archives for digital preservation.',
  },
  {
    icon: <Eye size={22} />,
    title: 'Verification Queue',
    desc: 'Help verify newly digitized texts — every contribution ensures accuracy for future generations.',
  },
];

/** Impact card — live numbers from the real catalog, never hardcoded. */
function ChapterCommunity({
  totalCompositions,
  saintsCount,
}: {
  totalCompositions: number;
  saintsCount: number;
}) {
  const reveal = useScrollReveal();
  const items = [
    ...COMMUNITY_ITEMS,
    {
      icon: <Shield size={22} />,
      title: 'Impact',
      desc: `${totalCompositions.toLocaleString('en-IN')}+ compositions preserved. ${saintsCount} saints documented. Growing daily.`,
    },
  ];

  return (
    <section
      className={`dp-chapter dp-community dp-reveal ${reveal.isVisible ? 'visible' : ''}`}
      aria-labelledby="community-title"
      ref={reveal.ref}
    >
      <div className="dp-chapter-inner">
        <div className="dp-kicker">Chapter 8 — Living Community</div>
        <h2 id="community-title" className="dp-title">
          The People Behind the Archive
        </h2>
        <p className="dp-subtitle" style={{ marginTop: '0.5rem' }}>
          This archive lives because of its community. Scholars verify, volunteers digitize, and devotees contribute.
        </p>

        <div className="dp-community-grid dp-stagger">
          {items.map((item, i) => (
            <div key={i} className="dp-community-card">
              <div className="dp-community-icon">{item.icon}</div>
              <h3 className="dp-community-title">{item.title}</h3>
              <p className="dp-community-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CHAPTER 10 — PRESERVATION
   ============================================================ */
const PRESERVATION_STEPS = [
  { num: '01', label: 'Scan', desc: 'Physical manuscripts and books are photographed in high resolution' },
  { num: '02', label: 'OCR', desc: 'Optical character recognition extracts Devanagari text from images' },
  { num: '03', label: 'Verify', desc: 'Scholars review extracted text for accuracy and completeness' },
  { num: '04', label: 'Enrich', desc: 'AI adds metadata, categorization, and cross-references' },
  { num: '05', label: 'Publish', desc: 'Verified compositions enter the searchable knowledge graph' },
];

function ChapterPreservation() {
  const reveal = useScrollReveal();

  return (
    <section
      className={`dp-chapter dp-preservation dp-reveal ${reveal.isVisible ? 'visible' : ''}`}
      aria-labelledby="preservation-title"
      ref={reveal.ref}
    >
      <div className="dp-chapter-inner">
        <div className="dp-kicker">Chapter 9 — Preserve Heritage</div>
        <h2 id="preservation-title" className="dp-title">
          From Manuscript to Knowledge Graph
        </h2>
        <p className="dp-subtitle" style={{ marginTop: '0.5rem' }}>
          Every composition passes through a rigorous pipeline — from physical scan to verified digital preservation.
        </p>

        <div className="dp-preservation-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3rem', marginTop: '3rem' }}>
          <div className="dp-preservation-flow dp-stagger">
            {PRESERVATION_STEPS.map((step) => (
              <div key={step.num} className="dp-preservation-step">
                <div className="dp-preservation-num">{step.num}</div>
                <div className="dp-preservation-label">{step.label}</div>
                <p className="dp-preservation-desc">{step.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="dp-preservation-image-container">
            <Image
              src="/images/realistic/ancient-manuscript.jpg"
              alt="Ancient Manuscript Digitization"
              width={500}
              height={375}
              className="dp-preservation-image"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div className="dp-preservation-image-overlay">
              <span className="dp-preservation-image-caption">Preserving Marathi manuscripts for eternity 🙏</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CHAPTER 11 — CTA
   ============================================================ */
function ChapterCTA() {
  const reveal = useScrollReveal();

  return (
    <section
      className={`dp-chapter dp-cta dp-reveal ${reveal.isVisible ? 'visible' : ''}`}
      aria-labelledby="cta-title"
      ref={reveal.ref}
    >
      <div className="dp-chapter-inner">
        <div className="dp-kicker" style={{ justifyContent: 'center' }}>Chapter 10 — Join the Mission</div>
        <h2 id="cta-title" className="dp-title" style={{ textAlign: 'center' }}>
          Help Preserve Heritage
        </h2>
        <p className="dp-subtitle" style={{ margin: '0.5rem auto 0', textAlign: 'center' }}>
          Every contribution — whether a manuscript, a verification, or a donation — helps preserve
          centuries of devotional heritage for future generations.
        </p>

        <div className="dp-cta-grid dp-stagger">
          <Link href="/community" className="dp-cta-card">
            <div className="dp-cta-icon"><Upload size={24} /></div>
            <h3 className="dp-cta-title">Upload Manuscripts</h3>
            <p className="dp-cta-desc">Share rare manuscripts and books for digitization and preservation.</p>
          </Link>
          <Link href="/donate" className="dp-cta-card">
            <div className="dp-cta-icon"><Heart size={24} /></div>
            <h3 className="dp-cta-title">Donate</h3>
            <p className="dp-cta-desc">Support the digital preservation of Maharashtra&apos;s devotional heritage.</p>
          </Link>
          <Link href="/community" className="dp-cta-card">
            <div className="dp-cta-icon"><Users size={24} /></div>
            <h3 className="dp-cta-title">Volunteer</h3>
            <p className="dp-cta-desc">Join our community of scholars, translators, and digital archivists.</p>
          </Link>
        </div>
      </div>
    </section>
  );
}


