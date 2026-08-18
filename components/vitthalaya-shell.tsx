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

  // Add scroll progress bar effect
  useEffect(() => {
    const updateScroll = () => {
      setScrollY(window.scrollY);
      const docHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const scrollPercent = (scrollTop / docHeight) * 100;

      // Update progress bar
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

  return (
    <div
      className={`min-h-screen scroll-smooth ${currentTheme === 'dark' ? 'bg-black' : 'bg-white'} transition-colors duration-300 ${prefersReducedMotion ? 'no-transition-all' : 'transition-all duration-300'} overflow-x-hidden`}
      style={{
        scrollBehavior: 'smooth',
        backgroundImage: `linear-gradient(rgba(0,0,0,0.05), rgba(0,0,0,0.05)), url('/bg-texture.svg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Scroll Progress Bar */}
      <div className={`fixed top-0 left-0 w-full h-0.5 bg-saffron-500 opacity-70 transition-all duration-300 ${prefersReducedMotion ? 'opacity-0' : 'opacity-100'} pointer-events-none z-50`}></div>

      {/* Hero Section - uses same structure as home page */}
      <header className="relative py-20 overflow-hidden">
        {/* Animated BG Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 opacity-10 group-hover:opacity-20 transition-opacity animate-pulse rounded-full w-32 h-32 bg-saffron-200" style={{ transform: 'scale(0.8)' }}></div>
          <div className="absolute bottom-1/4 right-1/4 opacity-5 group-hover:opacity-10 transition-opacity animate-pulse rounded-full w-28 h-28 bg-saffron-100" style={{ transform: 'scale(0.6)' }}></div>
        </div>

        {/* Hero Content */}
        <div className="relative container mx-auto px-4 py-12 max-w-6xl">
          <div className="v4-subpage-stars flex justify-between mb-6 opacity-80">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="text-white star animate-sparkle" style={{
                animationDelay: `${Math.random() * 5}s`,
                transform: `scale(${Math.random() * 0.8 + 0.2})`
              }}>
                ✦
              </span>
            ))}
          </div>

          <div className="v4-subpage-copy text-center">
            {eyebrow && <span className="text-saffron-300 text-sm tracking-wide font-medium mb-2">{eyebrow}</span>}
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4 line-clamp-3">
              {title || 'Digital Pandharpur'}
            </h1>
            <p className="text-saffron-100 text-lg md:text-xl max-w-2xl mx-auto mb-8 line-clamp-4">
              {description || 'सर्व संग्रहातील सर्वात उजळं स्थान.'}
            </p>
          </div>

          {/* Primary Action */}
          {primaryHref && primaryLabel && (
            <Link href={primaryHref} className="inline-block bg-saffron-600 text-white font-medium py-3 px-8 rounded-full shadow-lg hover:bg-saffron-700 transition-all duration-300 flex items-center justify-center gap-2">
              <span className="sr-only">Next</span>
              {primaryLabel}
              <span className="animate-pulse">→</span>
            </Link>
          )}

          {/* Stats */}
          {stats.length > 0 && (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 justify-center space-x-4">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-saffron-50/30 rounded-xl p-6 text-center rounded-l-lg rounded-r-lg transition-all duration-300 hover:bg-saffron-100">
                  <span className="text-saffron-300 text-sm tracking-wide mb-1">{stat.label}</span>
                  <span className="text-white font-bold text-xl">{stat.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Content */}
          <main className="mt-16">{children}</main>
        </div>
      </header>

      {/* Footer Navigation */}
      <footer className="pt-16 border-t pt-8">
        <div className="container mx-auto px-4 flex flex-wrap justify-between items-center gap-4">
          {['Explore', 'Library', 'Saints', 'Festivals', 'Learn', 'Wari', 'About', 'Donate'].map((label) => {
            const href = label === 'Festivals' ? '/festival' : `/${label.toLowerCase()}`;
            return (
              <Link key={label} href={href} className="text-saffron-300 hover:text-saffron-400 transition-colors duration-300 text-sm flex items-center gap-1">
                {label === 'Saints' && <span className="inline-flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-saffron-300"></span>
                  <span className="sr-only">Current</span>
                </span>}
                {label}
              </Link>
            );
          })}
        </div>
      </footer>

      {/* Background Texture */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{
          background:
            'url(/bg-texture.svg) repeat',
          opacity: 0.05,
          backgroundSize: 'auto 100vh'
        }}
      />

      {/* 3D Floating Elements - only in dark mode */}
      {currentTheme === 'dark' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Floating temple elements */}
          <div className="w-64 h-48 bg-transparent border-4 border-saffron-200/30 rounded-full shadow-2xl animate-bounce" style={{ left: '10%', top: '10%' }}></div>
          <div className="w-56 h-32 bg-transparent border-4 border-saffron-200/20 rounded-full shadow-lg animate-pulse" style={{ left: '20%', bottom: '5%' }}></div>
          <div className="w-68 h-40 bg-transparent shadow-2xl animate-bounce" style={{ right: '15%', bottom: '15%' }}></div>
        </div>
      )}
    </div>
  );
}