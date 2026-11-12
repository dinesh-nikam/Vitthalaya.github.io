'use client';

import * as React from 'react';
import { ParticleCanvas } from './particle-canvas';

/** sessionStorage key — gateway shows once per browser session */
const SESSION_KEY = 'dp_gateway_seen';

interface SanctumGatewayProps {
  /** Called when the user awakens or skips the gateway */
  onAwakened: () => void;
}

type Phase = 'idle' | 'ringing' | 'dissolving' | 'done';

/**
 * Cinematic entry experience — "Draw the bow / Hear the cosmos" equivalent
 * for the Varkari tradition. Fires once per browser session.
 *
 * Accessibility:
 *  - role="dialog" + aria-modal on the overlay
 *  - Skip button is first in DOM tab order
 *  - Taal interactive element has role="button" + keyboard handler
 *  - Veil dissolves via CSS animation; content is immediately focusable after
 *  - prefers-reduced-motion: overlay vanishes instantly, no particles shown
 */
export function SanctumGateway({ onAwakened }: SanctumGatewayProps) {
  const [phase, setPhase] = React.useState<Phase>('idle');
  const [burstFired, setBurstFired] = React.useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const awaken = React.useCallback(() => {
    if (phase !== 'idle') return;
    setPhase('ringing');

    // 1. Temple bell chime (Web Audio synthesis — zero asset download)
    playTempleChime();

    // 2. Particle burst
    setBurstFired(true);

    // 3. If reduced motion, skip instantly
    if (prefersReducedMotion) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setPhase('done');
      onAwakened();
      return;
    }

    // 4. After 400ms start CSS dissolve
    const t1 = window.setTimeout(() => setPhase('dissolving'), 400);
    // 5. After dissolve completes (1100ms animation + 300ms delay = 1400ms), signal parent
    const t2 = window.setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, '1');
      setPhase('done');
      onAwakened();
    }, 1600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase, onAwakened, prefersReducedMotion]);

  const skip = React.useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setPhase('done');
    onAwakened();
  }, [onAwakened]);

  if (phase === 'done') return null;

  return (
    <div
      className={`dp-gateway-veil${phase === 'dissolving' ? ' dp-awakening' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Digital Pandharpur — पवित्र प्रवेश"
    >
      {/* Skip — first in DOM so it's first in tab order */}
      <button
        type="button"
        onClick={skip}
        className="absolute top-5 right-5 z-10 text-xs font-marathi
                   text-[rgba(255,248,236,0.4)] hover:text-[rgba(255,248,236,0.9)]
                   focus-visible:outline-none focus-visible:ring-1
                   focus-visible:ring-[var(--dp-gold-celestial)]
                   transition-colors duration-200"
      >
        थेट पुढे जा →
      </button>

      {/* Ambient particle field */}
      <ParticleCanvas
        count={55}
        burst={burstFired}
        burstOrigin={[0.5, 0.42]}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Central shrine */}
      <div className="relative z-10 text-center px-6 max-w-md mx-auto space-y-10">
        {/* Taal (sacred cymbal) interactive element */}
        <div className="flex justify-center">
          <div
            role="button"
            tabIndex={0}
            aria-label="तानपुरा आणि घंटा सुरू करा — दर्शन घ्या"
            onClick={awaken}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                awaken();
              }
            }}
            className="relative w-32 h-32 cursor-pointer select-none
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-[var(--dp-gold-celestial)]
                       focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dp-basalt-deep)]
                       rounded-full"
            style={phase === 'ringing' ? { animation: 'dp-taal-pulse 0.6s ease-out' } : undefined}
          >
            {/* Soft outer ping ring */}
            <span
              className="dp-taal-ping absolute inset-0 rounded-full border border-[var(--dp-gold-celestial)]/30"
              aria-hidden="true"
            />
            {/* Second, slower ping */}
            <span
              className="dp-taal-ping absolute inset-0 rounded-full border border-[var(--dp-gold-celestial)]/20"
              aria-hidden="true"
              style={{ animationDelay: '1.2s' }}
            />

            {/* Bronze taal SVG disc */}
            <svg
              viewBox="0 0 128 128"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full drop-shadow-[0_0_28px_rgba(246,188,85,0.55)]"
              aria-hidden="true"
            >
              {/* Outer rim */}
              <circle cx="64" cy="64" r="60" fill="#b8752a" stroke="#f6bc55" strokeWidth="2.5"/>
              {/* Mid body */}
              <circle cx="64" cy="64" r="52" fill="#c8963e" opacity="0.9"/>
              {/* Concentric engraved rings */}
              <circle cx="64" cy="64" r="44" stroke="#f6bc55" strokeWidth="1.2" fill="none" opacity="0.5"/>
              <circle cx="64" cy="64" r="32" stroke="#f6bc55" strokeWidth="0.9" fill="none" opacity="0.4"/>
              <circle cx="64" cy="64" r="20" stroke="#f6bc55" strokeWidth="0.8" fill="none" opacity="0.35"/>
              {/* Lotus-petal engraving (8 petals) */}
              {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
                const x1 = 64 + Math.cos(angle) * 20;
                const y1 = 64 + Math.sin(angle) * 20;
                const x2 = 64 + Math.cos(angle) * 40;
                const y2 = 64 + Math.sin(angle) * 40;
                return (
                  <line
                    key={i}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="#f6bc55"
                    strokeWidth="0.7"
                    opacity="0.3"
                  />
                );
              })}
              {/* Centre boss */}
              <circle cx="64" cy="64" r="11" fill="#f6bc55" opacity="0.65"/>
              <circle cx="64" cy="64" r="5"  fill="#fff8ec"/>
            </svg>
          </div>
        </div>

        {/* Tagline block */}
        <div className="space-y-3">
          <p className="text-xs font-marathi tracking-wide text-[rgba(255,248,236,0.4)]">
            ज्ञानोबा तुकाराम · डिजिटल पंढरपूर
          </p>
          <h1
            className="dp-epic-title text-center leading-none"
            style={{ color: 'var(--dp-gold-celestial)' }}
          >
            टाळ वाजवा
          </h1>
          <p className="font-marathi text-sm leading-relaxed text-[rgba(255,248,236,0.55)]">
            भक्तीच्या युगात प्रवेश करा
          </p>
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          onClick={awaken}
          disabled={phase !== 'idle'}
          className="vitthalaya-btn-primary px-10 py-3.5 text-sm
                     focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-[var(--dp-focus)]
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {phase === 'idle' ? 'दर्शन घ्या' : '…'}
        </button>
      </div>
    </div>
  );
}

// ── Web Audio temple bell synthesis ───────────────────────────────────────────
// Five-partial bronze bell resonance — no external file required.
// Partials tuned to authentic Indian temple bell overtone series.

function playTempleChime(): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx();
    const now = ctx.currentTime;

    // Simple room-simulation delay
    const delay = ctx.createDelay(0.1);
    delay.delayTime.value = 0.065;
    const delayGain = ctx.createGain();
    delayGain.gain.value = 0.28;
    delay.connect(delayGain);
    delayGain.connect(ctx.destination);

    const partials: { hz: number; decay: number; gain: number }[] = [
      { hz: 261.63, decay: 4.2, gain: 0.42 }, // Sa — fundamental
      { hz: 523.25, decay: 2.6, gain: 0.18 }, // Sa octave
      { hz: 629.00, decay: 1.7, gain: 0.22 }, // Minor-third overtone (bell character)
      { hz: 784.00, decay: 1.0, gain: 0.10 }, // Pa fifth
      { hz: 1046.5, decay: 0.5, gain: 0.06 }, // High shimmer
    ];

    for (const { hz, decay, gain } of partials) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = hz;
      env.gain.setValueAtTime(gain, now);
      env.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      osc.connect(env);
      env.connect(ctx.destination);
      env.connect(delay);
      osc.start(now);
      osc.stop(now + decay + 0.1);
    }
  } catch {
    // Autoplay policy or missing AudioContext — silent fallback
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
  const [pref, setPref] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPref(mq.matches);
    const cb = (e: MediaQueryListEvent) => setPref(e.matches);
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
  }, []);
  return pref;
}
