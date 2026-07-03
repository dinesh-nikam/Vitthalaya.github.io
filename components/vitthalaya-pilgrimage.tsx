'use client';

import * as React from 'react';
import Link from 'next/link';
import { BookOpen, Compass, Headphones, Search, Sparkles, Star, Volume2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const PandharpurScene = dynamic(
  () => import('./3d/pandharpur-scene').then((mod) => mod.PandharpurScene),
  { ssr: false, loading: () => <div className="w-full h-full bg-saffron/5 animate-pulse rounded-full" /> }
);

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

const WARI_STOPS = ['Dehu', 'Alandi', 'Pune', 'Saswad', 'Wakhari', 'Pandharpur'];
const GALAXY_NODES = [
  { label: 'Saints', href: '/sant', x: 18, y: 32, size: 86 },
  { label: 'Abhangs', href: '/search', x: 46, y: 18, size: 118 },
  { label: 'Books', href: '/books', x: 76, y: 34, size: 94 },
  { label: 'Festivals', href: '/festival', x: 30, y: 70, size: 78 },
  { label: 'Temples', href: '/explore', x: 62, y: 66, size: 84 },
  { label: 'Audio', href: '/collections', x: 84, y: 74, size: 70 },
];

export function VitthalayaPilgrimage({
  saints,
  categories,
  totalBooks,
  totalCompositions,
}: VitthalayaPilgrimageProps) {
  const [progress, setProgress] = React.useState(0);
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    const updateProgress = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(maxScroll > 0 ? window.scrollY / maxScroll : 0);
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, []);

  const activeStop = WARI_STOPS[Math.min(WARI_STOPS.length - 1, Math.floor(progress * WARI_STOPS.length))];

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (query.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
    }
  };

  return (
    <div className="vitthalaya-shell">
      <div className="pilgrimage-progress" style={{ transform: `scaleX(${progress})` }} />
      <ArrivalHero progress={progress} totalCompositions={totalCompositions} onSearch={handleSearch} query={query} setQuery={setQuery} />

      <main className="vitthalaya-main">
        <section className="pilgrimage-chapter welcome-chapter" aria-labelledby="maharashtra-title">
          <div className="chapter-kicker">Chapter 1</div>
          <h2 id="maharashtra-title">Welcome to Maharashtra</h2>
          <p>
            Vitthalaya turns the archive into a moving pilgrimage through saints, abhangs, books,
            festivals, and living devotion.
          </p>
          <div className="living-stats" aria-label="Archive scale">
            <Stat label="Compositions" value={`${totalCompositions.toLocaleString('en-IN')}+`} />
            <Stat label="Saints" value={`${saints.length}+`} />
            <Stat label="Books" value={`${totalBooks.toLocaleString('en-IN')}+`} />
          </div>
        </section>

        <section className="pilgrimage-chapter bhakti-chapter" aria-labelledby="bhakti-title">
          <div className="chapter-kicker">Chapter 2</div>
          <h2 id="bhakti-title">Birth of the Bhakti Movement</h2>
          <div className="timeline-river">
            {[
              ['13th c.', 'Dnyaneshwar opens sacred knowledge in Marathi.'],
              ['14th c.', 'Namdev carries kirtan across regions.'],
              ['16th c.', 'Eknath deepens public teaching through verse.'],
              ['17th c.', 'Tukaram gives the Wari its immortal voice.'],
            ].map(([century, text]) => (
              <article key={century} className="timeline-artifact">
                <span>{century}</span>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="pilgrimage-chapter saints-chapter" aria-labelledby="saints-title">
          <div className="chapter-kicker">Chapter 3</div>
          <h2 id="saints-title">Meet the Saints</h2>
          <div className="saint-portraits">
            {saints.slice(0, 6).map((saint, index) => (
              <Link key={saint.id} href={`/sant/${saint.slug}`} className="saint-portrait" style={{ '--offset': `${(index % 3) * 28}px` } as React.CSSProperties}>
                <span>{saint.period || 'Bhakti era'}</span>
                <strong>{saint.nameMarathi}</strong>
                <small>{saint.nameTranslit}</small>
              </Link>
            ))}
          </div>
        </section>

        <section className="wari-chapter" aria-labelledby="wari-title">
          <div className="wari-sticky">
            <div>
              <div className="chapter-kicker">Chapter 4</div>
              <h2 id="wari-title">The Wari Experience</h2>
              <p>The journey moves under your feet. Scroll from Dehu and Alandi toward Pandharpur.</p>
            </div>
            <div className="wari-meter">
              <span>{activeStop}</span>
              <strong>{Math.max(0, Math.round(250 - progress * 250))} km</strong>
            </div>
            <div className="wari-road" aria-hidden="true">
              {WARI_STOPS.map((stop, index) => (
                <div key={stop} className={index <= WARI_STOPS.indexOf(activeStop) ? 'active' : ''}>
                  <span />
                  <small>{stop}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="pilgrim-field" aria-hidden="true">
            {Array.from({ length: 28 }, (_, index) => (
              <span
                key={index}
                style={{
                  left: `${(index * 37) % 100}%`,
                  top: `${(index * 23) % 72}%`,
                  animationDelay: `${index * -90}ms`,
                }}
              />
            ))}
          </div>
        </section>

        <section className="knowledge-galaxy" aria-labelledby="galaxy-title">
          <div className="chapter-kicker">Chapter 5</div>
          <h2 id="galaxy-title">Vitthalaya Universe</h2>
          <p>Zoom through relationships between saints, abhangs, festivals, books, audio, and places.</p>
          <div className="galaxy-map">
            {GALAXY_NODES.map((node) => (
              <Link
                key={node.label}
                href={node.href}
                className="galaxy-node"
                style={{ left: `${node.x}%`, top: `${node.y}%`, width: node.size, height: node.size } as React.CSSProperties}
              >
                {node.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="worlds-section" aria-labelledby="worlds-title">
          <div>
            <div className="chapter-kicker">Sacred Worlds</div>
            <h2 id="worlds-title">Categories become places</h2>
          </div>
          <div className="category-worlds">
            {categories.slice(0, 6).map((category, index) => (
              <Link key={category.slug} href={`/category/${category.slug}`} className={`category-world world-${index % 3}`}>
                <span>{category.count.toLocaleString('en-IN')} compositions</span>
                <strong>{category.nameMarathi}</strong>
              </Link>
            ))}
          </div>
        </section>

        <section className="artifact-section" aria-labelledby="artifact-title">
          <div className="artifact-copy">
            <div className="chapter-kicker">Books and Music</div>
            <h2 id="artifact-title">Artifacts, not cards</h2>
            <p>Books sit like museum objects. Audio glows like a temple performance. Search responds like a constellation.</p>
          </div>
          <div className="artifact-stage" aria-hidden="true">
            <div className="book-artifact"><BookOpen /></div>
            <div className="music-orb"><Headphones /></div>
            <div className="guide-orb"><Compass /></div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ArrivalHero({
  progress,
  totalCompositions,
  onSearch,
  query,
  setQuery,
}: {
  progress: number;
  totalCompositions: number;
  onSearch: (event: React.FormEvent<HTMLFormElement>) => void;
  query: string;
  setQuery: (value: string) => void;
}) {
  return (
    <section className="arrival-hero" aria-labelledby="arrival-title">
      <PandharpurScene progress={progress} />
      <div className="star-field" aria-hidden="true">
        {Array.from({ length: 44 }, (_, index) => (
          <span
            key={index}
            style={{
              bottom: `${16 + (index % 4) * 13}%`,
              left: `${(index * 17) % 100}%`,
              animationDelay: `${index * -950}ms`,
            }}
          />
        ))}
      </div>
      <div className="temple-silhouette" aria-hidden="true" />
      <div className="river-layer" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
              <span
                key={index}
                style={{
                  left: `${(index * 13) % 100}%`,
                  bottom: `${(index * 19) % 100}%`,
                  animationDelay: `${index * -210}ms`,
                }}
              />
        ))}
      </div>
      <div className="arrival-copy">
        <div className="arrival-mark"><Sparkles size={16} /> Vitthalaya V4</div>
        <h1 id="arrival-title">Enter the living digital temple of Bhakti.</h1>
        <p>
          A cinematic pilgrimage through Pandharpur, the Wari, saints, abhangs, books, music,
          and a knowledge universe of {totalCompositions.toLocaleString('en-IN')} devotional works.
        </p>
        <form onSubmit={onSearch} className="pilgrimage-search">
          <Search size={18} />
          <input
            aria-label="Search abhangs, saints, books, and festivals"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search surrender, Vitthal, Tukaram..."
          />
          <button type="submit">Explore</button>
        </form>
        <div className="hero-actions">
          <Link href="/sant"><Star size={16} /> Saints</Link>
          <Link href="/books"><BookOpen size={16} /> Books</Link>
          <Link href="/collections"><Volume2 size={16} /> Audio</Link>
        </div>
      </div>
      <div className="scroll-cue">Scroll for darshan</div>
    </section>
  );
}



function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
