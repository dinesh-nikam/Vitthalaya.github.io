'use client';

import * as React from 'react';

interface SoundControllerProps {
  isPlaying: boolean;
  onToggle: () => void;
}

/**
 * Floating ambient audio pill — always visible once the gateway is dismissed.
 * Shows animated waveform bars when the tanpura drone is active.
 * Positioned above BottomTabBar on mobile (bottom-20) and bottom-6 on desktop.
 */
export function SoundController({ isPlaying, onToggle }: SoundControllerProps) {
  return (
    <div className="fixed bottom-20 right-4 z-40 md:bottom-6" aria-live="polite">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full
                   bg-[var(--dp-ground-well)] border border-[var(--dp-rule)]
                   text-xs font-marathi text-[var(--dp-gold-celestial)]
                   hover:border-[var(--dp-gold-celestial)]
                   focus-visible:outline-none focus-visible:ring-1
                   focus-visible:ring-[var(--dp-focus)]
                   transition-colors duration-200
                   shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
        aria-label={isPlaying ? 'तानपुरा बंद करा' : 'तानपुरा सुरू करा'}
        aria-pressed={isPlaying}
      >
        {/* Animated wave bars */}
        <span
          className="flex items-end gap-0.5"
          style={{ height: '1rem' }}
          aria-hidden="true"
        >
          {[0.4, 0.8, 1, 0.7, 0.5].map((relH, i) => (
            <span
              key={i}
              className="dp-wave-bar"
              style={{
                height: `${relH * 100}%`,
                animationPlayState: isPlaying ? 'running' : 'paused',
                animationDelay: `${i * 0.1}s`,
                opacity: isPlaying ? 1 : 0.3,
                transition: 'opacity 300ms',
              }}
            />
          ))}
        </span>
        <span className="text-[11px] leading-none">
          {isPlaying ? 'नाद चालू' : 'नाद'}
        </span>
      </button>
    </div>
  );
}
