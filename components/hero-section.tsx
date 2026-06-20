'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import Three.js components to optimize loading performance (Lighthouse 95+)
const DeepakViewer = dynamic(
  () => import('./3d/deepak-viewer').then((mod) => mod.DeepakViewer),
  { ssr: false, loading: () => <div className="w-full h-full bg-saffron/5 animate-pulse rounded-full" /> }
);

const SEARCH_EXAMPLES = [
  'तुकाराम महाराज',
  'विठ्ठल',
  'हरिपाठ',
  'देवी आरती',
  'गणपती वंदन',
];

export function HeroSection() {
  const [placeholderIndex, setPlaceholderIndex] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);
  const [currentFestival, setCurrentFestival] = React.useState<string | null>(null);

  // Suggestions states
  const [suggestions, setSuggestions] = React.useState<Array<{ type: string; label: string; url: string }>>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const searchRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SEARCH_EXAMPLES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
  }, []);

  // Fetch current festival
  React.useEffect(() => {
    fetch('/api/festival/current')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.nameMarathi) {
          setCurrentFestival(data.nameMarathi);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch suggestions
  React.useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(searchQuery)}`)
        .then((res) => res.json())
        .then((data) => {
          setSuggestions(data.suggestions || []);
        })
        .catch(() => {});
    }, 200);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Click outside listener
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Background Layers */}
      <div className="absolute inset-0 z-0">
        <BackgroundLayers prefersReducedMotion={prefersReducedMotion} />
      </div>

      {/* Main Content Overlay */}
      <div className="container mx-auto px-4 text-center relative z-10 grid md:grid-cols-12 gap-8 items-center max-w-6xl py-16">
        
        {/* Left Column: Traditional typography & Search */}
        <div className="md:col-span-7 text-left space-y-6">
          {currentFestival && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/15 border border-gold/30 text-gold-600 dark:text-gold-400 font-semibold animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-gold-500 animate-ping" />
              <span className="text-xs font-marathi">
                सध्याचा सण सोहळा: {currentFestival} 🚩
              </span>
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-marathiHeading text-maroon dark:text-saffron leading-tight drop-shadow-sm">
            महाराष्ट्राचे <br />
            <span className="text-saffron dark:text-gold font-bold">आध्यात्मिक दालन</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-foreground/80 leading-relaxed font-marathi max-w-xl">
            ज्ञानेश्वरांच्या हरिपाठापासून ते तुकारामांच्या गाथ्यापर्यंत, महाराष्ट्राच्या वारकरी संस्कृती आणि भक्ती परंपरेचा पवित्र डिजिटल संग्रह.
          </p>

          {/* Search Box */}
          <div ref={searchRef} className="max-w-xl relative mt-8">
            <form onSubmit={handleSearch} className="relative">
              <div className="relative glass-premium rounded-full shadow-lg p-1 border-2 border-saffron/30 focus-within:border-saffron focus-within:ring-4 focus-within:ring-saffron/15 transition-all duration-300">
                <Search
                  className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-saffron"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  placeholder={`शोधा: "${SEARCH_EXAMPLES[placeholderIndex]}"`}
                  className="w-full pl-14 pr-36 py-3.5 sm:py-4 rounded-full bg-transparent text-foreground placeholder:text-muted-foreground/60 text-base sm:text-lg font-marathi outline-none"
                  aria-label="भक्ती साहित्य शोधा"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-6 sm:px-8 py-2.5 sm:py-3 bg-saffron text-white font-semibold rounded-full hover:bg-saffron/90 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-saffron"
                >
                  शोधा
                </button>
              </div>
            </form>

            {/* Suggestions drop */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-card border-2 border-saffron/20 rounded-2xl shadow-2xl z-50 overflow-hidden text-left max-h-[300px] overflow-y-auto">
                {suggestions.map((suggestion, idx) => (
                  <Link
                    key={idx}
                    href={suggestion.url}
                    className="block px-5 py-3.5 hover:bg-saffron/5 border-b border-saffron/5 last:border-b-0 text-sm font-marathi text-foreground transition-colors"
                    onClick={() => setShowSuggestions(false)}
                  >
                    <span className="mr-2.5 text-[10px] px-2 py-0.5 rounded bg-saffron/10 text-saffron font-bold uppercase tracking-wider">
                      {suggestion.type === 'saint' ? 'संत' : suggestion.type === 'category' ? 'श्रेणी' : 'साहित्य'}
                    </span>
                    <span>{suggestion.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground">
            <span>लोकप्रिय श्रेणी:</span>
            <Link href="/category/vitthal" className="text-saffron hover:underline">
              विठ्ठल संग्रह
            </Link>
            <span>•</span>
            <Link href="/category/haripath" className="text-saffron hover:underline">
              हरिपाठ
            </Link>
            <span>•</span>
            <Link href="/category/aarti" className="text-saffron hover:underline">
              आरत्या
            </Link>
          </div>
        </div>

        {/* Right Column: Dynamic 3D Deepak Experience */}
        <div className="md:col-span-5 flex flex-col items-center justify-center relative">
          {/* Glowing Aura Ring behind 3D Canvas */}
          <div className="absolute w-72 h-72 rounded-full bg-saffron/10 blur-3xl -z-10 animate-pulse" />
          
          <div className="w-full aspect-square max-w-[380px] bg-gradient-to-b from-saffron/5 to-transparent rounded-full p-4 border border-saffron/10 shadow-inner flex items-center justify-center">
            <DeepakViewer />
          </div>
          
          <div className="text-center mt-4">
            <p className="text-xs font-semibold text-saffron font-marathi uppercase tracking-wider">
              सजीव ३डी अनुभव
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              दिव्याला फिरवण्यासाठी माऊसने ओढा
            </p>
          </div>
        </div>

      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 animate-bounce">
        <span className="text-xs font-semibold text-saffron font-marathi">खाली स्क्रोल करा</span>
        <svg width="12" height="12" viewBox="0 0 24 24" className="stroke-saffron fill-none" strokeWidth="2.5">
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}

function BackgroundLayers({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  if (prefersReducedMotion) {
    return (
      <div className="w-full h-full bg-cream dark:bg-[#121212] opacity-80" />
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-cream via-cream to-saffron/5 dark:from-[#121212] dark:to-[#1c1c1c]">
      
      {/* Layer 1: Animated Stars/Particles (Sky) */}
      <div className="absolute inset-0 opacity-40">
        {Array.from({ length: 25 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-gold-400 animate-ping"
            style={{
              top: `${Math.random() * 60}%`,
              left: `${Math.random() * 100}%`,
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
              animationDuration: `${3 + Math.random() * 5}s`,
              animationDelay: `${Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Layer 2: Pandharpur Temple Silhouette in background */}
      <div className="absolute bottom-0 right-0 left-0 h-[30vh] opacity-10 pointer-events-none select-none flex items-end">
        <svg className="w-full h-full" viewBox="0 0 1200 400" preserveAspectRatio="none" fill="none">
          <path
            d="M0,400 Q150,300 300,400 T600,400 Q750,280 900,400 T1200,400 L1200,400 Z"
            fill="#6B1E1E"
          />
          <path
            d="M300,400 L350,250 L380,270 L420,180 L440,200 L470,120 L500,200 L520,180 L550,250 L580,270 L630,400 Z"
            fill="#6B1E1E"
          />
        </svg>
      </div>

      {/* Layer 3: Moving Diyas (SVG water flow overlay) */}
      <div className="absolute bottom-0 left-0 right-0 h-[15vh] opacity-25 select-none pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 1200 200" preserveAspectRatio="none" fill="none">
          {/* Waves */}
          <path
            d="M0,150 C200,120 400,170 600,140 C800,110 1000,170 1200,140 L1200,200 L0,200 Z"
            fill="#1B6E8C"
            opacity="0.5"
          >
            <animate
              attributeName="d"
              dur="12s"
              repeatCount="indefinite"
              values="
                M0,150 C200,120 400,170 600,140 C800,110 1000,170 1200,140 L1200,200 L0,200 Z;
                M0,140 C200,160 400,130 600,150 C800,170 1000,120 1200,140 L1200,200 L0,200 Z;
                M0,150 C200,120 400,170 600,140 C800,110 1000,170 1200,140 L1200,200 L0,200 Z
              "
            />
          </path>
        </svg>
      </div>

      {/* Floating Diya Sparks rising upwards */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-gradient-to-t from-saffron to-gold shadow-lg"
            style={{
              bottom: `${10 + Math.random() * 20}%`,
              left: `${15 + Math.random() * 70}%`,
              width: `${8 + Math.random() * 12}px`,
              height: `${8 + Math.random() * 12}px`,
              opacity: 0.3 + Math.random() * 0.4,
              animation: `particle-drift ${15 + Math.random() * 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
      </div>

    </div>
  );
}

export default HeroSection;