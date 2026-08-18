'use client';

import * as React from 'react';
import { motion, useTransform, useSpring } from 'framer-motion';

const WARI_STOPS = ['Dehu', 'Aalandi', 'Pune', 'Saswad', 'Wakhari', 'Pandharpur'];

export function ChapterWari({ activeStop, progress }: { activeStop: string; progress: number }) {
  // We can use framer-motion to smooth out the progress value visually
  const smoothProgress = useSpring(progress, { stiffness: 100, damping: 30 });
  
  // Transform progress 0-1 to percentage for road filling
  const roadFillWidth = useTransform(smoothProgress, [0, 1], ['0%', '100%']);
  const distanceRemaining = Math.max(0, Math.round(250 - progress * 250));

  return (
    <section
      className="relative h-[200vh] bg-[#100b08]"
      aria-labelledby="wari-title"
    >
      <div className="sticky top-0 h-screen flex flex-col justify-center px-6 overflow-hidden">
        
        {/* Atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050402]/80 to-[#100b08] z-0 pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ff7a1a]/10 blur-[150px] z-0 pointer-events-none" />
        
        {/* Pilgrim particles simulating walking crowd */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30" aria-hidden="true">
          {Array.from({ length: 40 }, (_, i) => (
            <motion.span 
              key={i} 
              className="absolute w-1.5 h-1.5 rounded-full bg-saffron"
              style={{
                left: `${(i * 37) % 100}%`,
                top: `${(i * 23) % 100}%`,
              }}
              animate={{
                y: [0, -20, 0],
                x: [0, -10, 0],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 2 + (i % 3),
                repeat: Infinity,
                delay: i * -0.5,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-6xl mx-auto w-full">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 text-[#f6bc55] text-xs font-bold tracking-[0.2em] uppercase mb-4">
              <span className="w-8 h-px bg-[#f6bc55]/50" />
              Chapter 4 — The Walk
              <span className="w-8 h-px bg-[#f6bc55]/50" />
            </div>
            <h2 id="wari-title" className="text-4xl md:text-6xl font-extrabold text-[#fff6df] tracking-tight mb-6">
              The Wari Experience
            </h2>
            <p className="text-lg md:text-xl text-[#fff6df]/60 max-w-2xl mx-auto leading-relaxed">
              The journey moves under your feet. Scroll from Dehu and Alandi toward Pandharpur —
              following the path that millions of Warkaris have walked for centuries.
            </p>
          </motion.div>

          {/* Interactive HUD / Dashboard */}
          <div className="max-w-4xl mx-auto bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-saffron/10 to-transparent opacity-50" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
              <div className="text-center md:text-left">
                <span className="block text-[#fff6df]/40 text-sm font-bold tracking-widest uppercase mb-1">Current Stop</span>
                <span className="block text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#f6bc55] to-[#ff7a1a]">
                  {activeStop}
                </span>
              </div>
              
              <div className="text-center md:text-right">
                <span className="block text-[#fff6df]/40 text-sm font-bold tracking-widest uppercase mb-1">Distance to Vitthal</span>
                <div className="text-4xl md:text-5xl font-extrabold text-[#fff6df] tabular-nums">
                  {distanceRemaining}
                  <span className="text-xl text-[#fff6df]/50 ml-2">km</span>
                </div>
              </div>
            </div>

            {/* The Road Timeline */}
            <div className="relative pt-8 pb-4">
              {/* Background Track */}
              <div className="absolute top-9 left-0 w-full h-1 bg-white/10 rounded-full" />
              
              {/* Active Fill Track */}
              <motion.div 
                className="absolute top-9 left-0 h-1 bg-gradient-to-r from-[#f6bc55] to-[#ff7a1a] rounded-full shadow-[0_0_15px_rgba(255,122,26,0.6)]"
                style={{ width: roadFillWidth }}
              />

              {/* Stops */}
              <div className="relative flex justify-between">
                {WARI_STOPS.map((stop, i) => {
                  const isActive = i <= WARI_STOPS.indexOf(activeStop);
                  const isCurrent = stop === activeStop;
                  return (
                    <div key={stop} className="flex flex-col items-center relative -mt-3">
                      <motion.div 
                        animate={{
                          scale: isCurrent ? 1.5 : 1,
                          backgroundColor: isActive ? '#f6bc55' : '#100b08',
                          borderColor: isActive ? '#f6bc55' : 'rgba(255,255,255,0.2)'
                        }}
                        className={`w-4 h-4 rounded-full border-2 z-10 transition-colors duration-300 ${isCurrent ? 'shadow-[0_0_20px_rgba(246,188,85,0.8)]' : ''}`}
                      />
                      <span className={`absolute top-6 text-xs md:text-sm font-medium tracking-wide transition-colors duration-300 whitespace-nowrap ${isActive ? 'text-[#f6bc55]' : 'text-[#fff6df]/30'}`}>
                        {stop}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
