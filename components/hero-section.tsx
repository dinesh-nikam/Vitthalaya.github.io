'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

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

  React.useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SEARCH_EXAMPLES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10">
        <BackgroundAnimation />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 text-center relative z-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-marathiHeading text-saffron mb-6 leading-relaxed">
          मराठी भक्ती साहित्याचा वाढता डिजिटल संग्रह
        </h1>

        <p className="text-lg sm:text-xl md:text-2xl text-foreground/80 mb-12 max-w-3xl mx-auto leading-relaxed">
          लाखो अभंग, भजन, गौळणी, आरत्या, स्तोत्रे आणि संत साहित्य एका ठिकाणी
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-saffron"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={SEARCH_EXAMPLES[placeholderIndex]}
              className="w-full pl-12 pr-32 py-4 sm:py-5 rounded-full border-2 border-saffron/30 bg-card focus:border-saffron focus:ring-4 focus:ring-saffron/20 text-lg sm:text-xl font-marathi transition-all duration-300 outline-none"
              aria-label="भक्ती साहित्य शोधा"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-6 sm:px-8 py-2 sm:py-3 bg-saffron text-white font-medium rounded-full hover:bg-saffron/90 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-saffron"
            >
              शोधा
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function BackgroundAnimation() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
  }, []);

  if (prefersReducedMotion) {
    return (
      <svg className="w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <path
          d="M0,600 C200,550 400,580 600,560 C800,540 1000,580 1200,550 L1200,800 L0,800 Z"
          fill="#6B1E1E"
          opacity="0.1"
        />
      </svg>
    );
  }

  return (
    <svg className="w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="riverGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1B6E8C" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#1B6E8C" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* Sky background */}
      <rect width="1200" height="800" fill="#FFF8EC" />

      {/* Temple Silhouette - Pandharpur style */}
      <path
        d="M300,400 L350,300 L400,320 L450,250 L500,280 L550,200 L600,260 L650,220 L700,280 L750,200 L800,260 L850,220 L900,280 L950,200 L1000,320 L1050,300 L1100,400 Z"
        fill="#6B1E1E"
        opacity="0.15"
      />

      {/* River flow */}
      <path
        d="M0,600 C200,550 400,580 600,560 C800,540 1000,580 1200,550 L1200,800 L0,800 Z"
        fill="url(#riverGradient)"
      />

      {/* Floating particles - diya glow effect */}
      <g>
        {Array.from({ length: 20 }).map((_, i) => (
          <circle
            key={i}
            cx={Math.random() * 1200}
            cy={300 + Math.random() * 300}
            r={2 + Math.random() * 3}
            fill="#C9A227"
            opacity={0.3 + Math.random() * 0.4}
            className="animate-particle-drift"
            style={{
              animationDelay: `${-Math.random() * 20}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
            }}
          />
        ))}
      </g>

      {/* Saffron flags - waving effect */}
      <g>
        {Array.from({ length: 6 }).map((_, i) => (
          <path
            key={i}
            d={`M${150 + i * 180},380 L${150 + i * 180},320 L${170 + i * 180},320 L${170 + i * 180},380 Z`}
            fill="#FF7A1A"
            opacity="0.7"
            className="animate-flag-wave"
            style={{
              animationDelay: `${-i * 0.5}s`,
            }}
          />
        ))}
      </g>
    </svg>
  );
}

export default HeroSection;