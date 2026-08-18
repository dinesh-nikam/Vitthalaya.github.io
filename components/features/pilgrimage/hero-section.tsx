'use client';

import * as React from 'react';
import Link from 'next/link';
import { BookOpen, Compass, Search, Sparkles, Star, Volume2, ArrowRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import { motion, Variants } from 'framer-motion';
import { useMouseParallax } from './hooks';

const PandharpurScene = dynamic(
  () => import('@/components/3d/pandharpur-scene').then((mod) => mod.PandharpurScene),
  { ssr: false, loading: () => <div className="w-full h-full bg-saffron/5 animate-pulse rounded-full" /> }
);

interface ChapterHeroProps {
  totalCompositions: number;
  onSearch: (e: React.FormEvent<HTMLFormElement>) => void;
  query: string;
  setQuery: (v: string) => void;
  progress: number;
}

const STAGGER_DELAY = 0.15;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: custom * STAGGER_DELAY, duration: 0.8 }
  })
};

export function ChapterHero({
  totalCompositions,
  onSearch,
  query,
  setQuery,
  progress,
}: ChapterHeroProps) {
  const mouse = useMouseParallax(30);

  return (
    <section className="dp-hero relative min-h-[100svh] flex items-center justify-center overflow-hidden bg-[#050402]" aria-labelledby="hero-title">
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#100b08]/80 via-transparent to-[#050402] z-10 pointer-events-none" aria-hidden="true" />

      {/* Mist layers */}
      <div className="dp-hero-mist absolute inset-0 z-10 pointer-events-none opacity-40 mix-blend-screen" aria-hidden="true">
        <span className="absolute -bottom-20 left-0 right-0 h-64 bg-saffron/20 blur-[100px]" />
        <span className="absolute top-1/4 -left-20 w-96 h-96 bg-[#f6bc55]/10 blur-[120px]" />
        <span className="absolute top-1/3 -right-20 w-96 h-96 bg-[#1b6e8c]/15 blur-[120px]" />
      </div>

      {/* Stars */}
      <div className="dp-stars absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        {Array.from({ length: 50 }, (_, i) => (
          <span key={i} className="absolute rounded-full bg-white opacity-50" style={{
            width: Math.random() * 2 + 1 + 'px',
            height: Math.random() * 2 + 1 + 'px',
            left: `${(i * 17) % 100}%`,
            top: `${(i * 13) % 50}%`,
            animationDelay: `${i * -0.4}s`,
            animation: `twinkle ${3 + (i % 4)}s infinite alternate`,
          }} />
        ))}
      </div>

      {/* 3D Scene */}
      <div className="absolute inset-0 z-0 transition-transform duration-300 ease-out" style={{ transform: `translate(${mouse.x}px, ${mouse.y}px)` }}>
        <PandharpurScene progress={progress} />
      </div>

      {/* Content */}
      <div className="relative z-20 w-full max-w-5xl mx-auto px-6 text-center pt-24 pb-12 flex flex-col items-center">
        
        <motion.div 
          custom={1} initial="hidden" animate="visible" variants={fadeUp}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 text-[#f6bc55] text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(246,188,85,0.15)]"
        >
          <Sparkles size={14} /> डिजिटल पंढरपूर
        </motion.div>

        <motion.h1 
          id="hero-title"
          custom={2} initial="hidden" animate="visible" variants={fadeUp}
          className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-[#fff6df] to-[#8a7b6b] max-w-4xl mx-auto mb-6 text-balance leading-tight"
        >
          Enter the living digital temple of Bhakti.
        </motion.h1>

        <motion.p 
          custom={3} initial="hidden" animate="visible" variants={fadeUp}
          className="text-lg md:text-xl text-[#fff6df]/70 max-w-2xl mx-auto mb-10 leading-relaxed font-light"
        >
          A cinematic pilgrimage through Pandharpur, the Wari, saints, abhangs, books, music,
          and a knowledge universe of <span className="text-[#f6bc55] font-medium">{totalCompositions.toLocaleString('en-IN')}</span> devotional works.
        </motion.p>

        <motion.form 
          custom={4} initial="hidden" animate="visible" variants={fadeUp}
          onSubmit={onSearch} 
          className="w-full max-w-xl relative group flex items-center mb-12"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#f6bc55]/20 to-[#ff7a1a]/20 blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative flex items-center w-full h-14 bg-[#050402]/60 backdrop-blur-xl border border-white/10 rounded-full overflow-hidden shadow-2xl transition-all duration-300 focus-within:border-[#f6bc55]/50 focus-within:bg-[#050402]/80 focus-within:ring-4 focus-within:ring-[#f6bc55]/10">
            <div className="pl-5 pr-3 text-white/40">
              <Search size={20} />
            </div>
            <input
              aria-label="Search abhangs, saints, books, and festivals"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search surrender, Vitthal, Tukaram..."
              className="w-full h-full bg-transparent border-none outline-none text-[#fff6df] placeholder:text-[#fff6df]/30 text-lg font-medium pr-4"
            />
            <button 
              type="submit" 
              className="mr-2 h-10 px-6 rounded-full bg-gradient-to-r from-[#f6bc55] to-[#ff7a1a] text-[#050402] font-semibold flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform duration-200"
            >
              Explore
            </button>
          </div>
        </motion.form>

        <motion.div 
          custom={5} initial="hidden" animate="visible" variants={fadeUp}
          className="flex flex-wrap justify-center gap-4 md:gap-6"
        >
          <HeroLink href="/sant" icon={<Star size={16} />} label="Saints" />
          <HeroLink href="/books" icon={<BookOpen size={16} />} label="Books" />
          <HeroLink href="/collections" icon={<Volume2 size={16} />} label="Audio" />
          <HeroLink href="/wari" icon={<Compass size={16} />} label="Wari" />
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#fff6df]/40 text-xs font-medium uppercase tracking-widest"
        aria-hidden="true"
      >
        <span className="animate-bounce mt-2">
          <ArrowRight size={14} className="rotate-90" />
        </span>
        Scroll for darshan
      </motion.div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes twinkle {
          0% { opacity: 0.2; transform: scale(0.8); }
          100% { opacity: 0.8; transform: scale(1.2); }
        }
      `}} />
    </section>
  );
}

function HeroLink({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
  return (
    <Link 
      href={href} 
      className="group relative flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 text-[#fff6df]/80 hover:text-white"
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <span className="text-[#f6bc55] group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(246,188,85,0.5)]">
        {icon}
      </span>
      <span className="font-medium tracking-wide">
        {label}
      </span>
    </Link>
  );
}
