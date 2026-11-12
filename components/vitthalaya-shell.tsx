'use client';

import * as React from 'react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTheme } from '@/src/lib/theme';

interface StatItem {
  label: string;
  value: string | number;
}

export function VitthalayaShell({
  children,
  title,
  description,
  primaryHref,
  primaryLabel,
  eyebrow,
  stats = [] as StatItem[],
  theme,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
  eyebrow?: string;
  stats?: StatItem[];
  theme?: 'dark' | 'light';
}) {
  const [, setScrollY] = useState(0);
  const { isDark } = useTheme();
  const currentTheme = theme || (isDark ? 'dark' : 'light');

  // Scroll progress bar effect
  useEffect(() => {
    const updateScroll = () => {
      setScrollY(window.scrollY);
      const docHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const scrollPercent = (scrollTop / docHeight) * 100;

      const progressBar = document.querySelector('.scroll-progress') as HTMLElement | null;
      if (progressBar) {
        progressBar.style.width = `${Math.min(scrollPercent, 100)}%`;
      }
    };

    window.addEventListener('scroll', updateScroll);
    window.addEventListener('load', updateScroll);
    return () => {
      window.removeEventListener('scroll', updateScroll);
    };
  }, []);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const isLight = currentTheme === 'light';

  return (
    <div
      className={`min-h-screen ${
        isLight ? 'bg-[#FFF8EC] text-[#2D1810]' : 'bg-[#0a0806] text-[#FFF8EC]'
      } overflow-x-clip transition-colors duration-200`}
      style={{
        backgroundImage: isLight
          ? `linear-gradient(rgba(255,248,236,0.92), rgba(255,248,236,0.92)), url('/bg-texture.svg')`
          : `linear-gradient(rgba(10,8,6,0.95), rgba(10,8,6,0.95)), url('/bg-texture.svg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Scroll Progress Bar */}
      <div
        className={`fixed top-0 left-0 w-full h-0.5 bg-[#FF7A1A] pointer-events-none z-50 transition-opacity duration-300 ${
          prefersReducedMotion ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Hero Section */}
      <header className="relative pt-12 pb-16 overflow-hidden border-b border-[rgba(201,162,39,0.2)]">
        {/* Hero Content */}
        <div className="relative container mx-auto px-4 max-w-5xl">
          <div className="text-center">
            {eyebrow && (
              <p className={`text-xs font-semibold mb-2 font-marathi ${
                isLight ? 'text-[#C9A227]' : 'text-[#f6bc55]'
              }`}>
                {eyebrow}
              </p>
            )}

            <h1 className={`text-3xl sm:text-4xl md:text-5xl font-bold font-marathiHeading tracking-tight mb-4 ${
              isLight ? 'text-[#2D1810]' : 'text-[#FFF8EC]'
            }`}>
              {title || 'Digital Pandharpur'}
            </h1>

            <p className={`text-base sm:text-lg max-w-2xl mx-auto mb-8 font-marathi leading-relaxed ${
              isLight ? 'text-[#5C4033]' : 'text-[#c5b6a3]'
            }`}>
              {description || 'सर्व संग्रहातील सर्वात पवित्र स्थान.'}
            </p>
          </div>

          {/* Primary Action */}
          {primaryHref && primaryLabel && (
            <div className="flex justify-center mb-10">
              <Link
                href={primaryHref}
                className="inline-flex items-center justify-center gap-2 bg-[#FF7A1A] text-white font-medium py-3 px-8 rounded-lg shadow-md hover:bg-[#e0670d] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A] active:translate-y-px"
              >
                <span>{primaryLabel}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}

          {/* Stats Bar */}
          {stats.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-lg p-5 text-center border ${
                    isLight
                      ? 'bg-white border-[#e2e8f0] shadow-sm'
                      : 'bg-[#14100c] border-[rgba(201,162,39,0.2)]'
                  }`}
                >
                  <span className={`block text-xs font-marathi mb-1 ${
                    isLight ? 'text-[#8c7d6b]' : 'text-[#a39585]'
                  }`}>
                    {stat.label}
                  </span>
                  <span className={`block font-bold text-2xl font-marathiHeading ${
                    isLight ? 'text-[#2D1810]' : 'text-[#FFF8EC]'
                  }`}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 max-w-5xl py-12">{children}</main>

      {/* Footer Navigation */}
      <footer className="border-t border-[rgba(201,162,39,0.2)] py-10 mt-16">
        <div className="container mx-auto px-4 max-w-5xl flex flex-wrap justify-center gap-6 text-sm font-marathi">
          {[
            { label: 'एक्सप्लोर', href: '/explore' },
            { label: 'लायब्ररी', href: '/library' },
            { label: 'संत मंडळ', href: '/sant' },
            { label: 'सण व उत्सव', href: '/festival' },
            { label: 'पवित्र वारी', href: '/wari' },
            { label: 'साहाय्य', href: '/about' },
            { label: 'सहकार्य', href: '/donate' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-colors hover:text-[#FF7A1A] ${
                isLight ? 'text-[#5C4033]' : 'text-[#c5b6a3]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
