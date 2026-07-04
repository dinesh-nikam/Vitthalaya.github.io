'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';

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

const HERO_SLIDES = [
  {
    kicker: 'पायी पंढरीची वारी | The Pilgrimage',
    titleLine1: 'महाराष्ट्राचे',
    titleLine2: 'आध्यात्मिक दालन',
    description: 'ज्ञानेश्वरांच्या हरिपाठापासून ते तुकारामांच्या गाथ्यापर्यंत, महाराष्ट्राच्या वारकरी संस्कृती आणि भक्ती परंपरेचा पवित्र डिजिटल संग्रह.',
    video: '/videos/wari-loop.mp4',
    fallbackImg: '/images/realistic/wari-procession.jpg'
  },
  {
    kicker: 'काकड आरती व उपासना | The Temple Rituals',
    titleLine1: 'पंढरीचे',
    titleLine2: 'दिव्य दर्शन',
    description: 'विठू माऊलीच्या चरणी अर्पण केलेल्या आरत्या, स्तोत्र आणि काकड आरती संग्रहाचा मनमोहक संग्रह, थेट मंदिराच्या गर्भगृहातून.',
    video: '/videos/aarti-loop.mp4',
    fallbackImg: '/images/realistic/temple-aarti.jpg'
  },
  {
    kicker: 'कीर्तन आणि भजन संग्रह | The Devotional Chants',
    titleLine1: 'टाळ-मृदंगाचा',
    titleLine2: 'नादब्रह्म',
    description: 'शतकांपासून घुमणाऱ्या अभंगांचा आणि भजनांचा स्वरसंग्रह, जो वारकरी भक्तांना विठ्ठलाच्या भक्तीत तल्लीन करतो.',
    video: '/videos/bhajan-loop.mp4',
    fallbackImg: '/images/categories/bhajan.jpg'
  }
];

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = React.useState(0);
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
    if (prefersReducedMotion) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

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
      .catch(() => { });
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
        .catch(() => { });
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
        <BackgroundLayers currentSlide={currentSlide} prefersReducedMotion={prefersReducedMotion} />
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

          {/* Animated Slide Copy Container */}
          <div className="relative h-[220px] sm:h-[180px] md:h-[220px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className="space-y-4 absolute inset-0 text-left"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-saffron/10 border border-saffron/20 text-saffron text-xs font-bold tracking-wide uppercase font-sans">
                  <span>🚩</span> {HERO_SLIDES[currentSlide].kicker}
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-marathiHeading text-maroon dark:text-saffron leading-tight drop-shadow-sm">
                  {HERO_SLIDES[currentSlide].titleLine1} <br />
                  <span className="text-saffron dark:text-gold font-bold">{HERO_SLIDES[currentSlide].titleLine2}</span>
                </h1>

                <p className="text-base sm:text-lg md:text-xl text-foreground/80 leading-relaxed font-marathi max-w-xl">
                  {HERO_SLIDES[currentSlide].description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Slide Indicators */}
          <div className="flex items-center gap-2 pt-2">
            {HERO_SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentSlide === idx ? 'w-8 bg-saffron' : 'w-2 bg-saffron/30 hover:bg-saffron/65'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>

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

          <div className="w-full aspect-square max-w-[380px] min-h-[280px] sm:min-h-[320px] bg-gradient-to-b from-saffron/5 to-transparent rounded-full p-4 border border-saffron/10 shadow-inner flex items-center justify-center relative">
            {/* Static SVG Diya — visible fallback while 3D loads or if WebGL unavailable */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden="true">
              <svg viewBox="0 0 200 200" className="w-48 h-48 opacity-20" fill="none">
                {/* Diya bowl */}
                <ellipse cx="100" cy="140" rx="60" ry="18" fill="#8a4a2a" />
                <path d="M40 140 Q45 110 100 105 Q155 110 160 140 Z" fill="#a0522d" />
                {/* Oil surface */}
                <ellipse cx="100" cy="112" rx="45" ry="10" fill="#4a3b1a" opacity="0.8" />
                {/* Flame outer */}
                <path d="M100 108 Q108 90 103 70 Q115 55 105 40 Q95 55 90 70 Q88 90 100 108Z" fill="#ffaa00" opacity="0.9" />
                {/* Flame inner */}
                <path d="M100 105 Q105 93 102 78 Q108 67 102 55 Q97 67 97 78 Q97 93 100 105Z" fill="#ffffff" opacity="0.8" />
                {/* Sparks */}
                <circle cx="88" cy="52" r="2" fill="#ff9900" opacity="0.7" />
                <circle cx="112" cy="46" r="1.5" fill="#ffcc00" opacity="0.6" />
                <circle cx="93" cy="38" r="1" fill="#ff7700" opacity="0.5" />
              </svg>
            </div>
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

function BackgroundLayers({ currentSlide, prefersReducedMotion }: { currentSlide: number; prefersReducedMotion: boolean }) {
  if (prefersReducedMotion) {
    return (
      <div className="w-full h-full bg-cream dark:bg-[#121212] opacity-80" />
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Background Videos cross-fading */}
      {HERO_SLIDES.map((slide, index) => (
        <div
          key={index}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: currentSlide === index ? 0.35 : 0 }}
        >
          <video
            src={slide.video}
            poster={slide.fallbackImg}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
      ))}
      
      {/* Premium Dark Saffron & Gold Gradient Mask */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-saffron-950/20 to-black/95 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-tr from-maroon/25 via-transparent to-gold/15" />

      {/* Floating Diya Sparks rising upwards */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-gradient-to-t from-saffron to-gold shadow-lg"
            style={{
              bottom: `${10 + Math.random() * 20}%`,
              left: `${15 + Math.random() * 70}%`,
              width: `${6 + Math.random() * 8}px`,
              height: `${6 + Math.random() * 8}px`,
              opacity: 0.2 + Math.random() * 0.3,
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