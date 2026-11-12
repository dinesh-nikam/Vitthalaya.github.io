'use client';

import * as React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

/**
 * Tanpura Ambient Drone Synthesizer
 * Generates an authentic, meditative Indian classical Tanpura drone (Sa-Pa-Sa-Sa)
 * in real-time via the Web Audio API without requiring external audio files.
 *
 * Props:
 *  isActive     — optional controlled play/stop (gateway + SoundController integration)
 *  onStateChange — notifies parent when internal play state changes
 *  hidden        — when true renders nothing (use as headless audio node)
 */
interface TanpuraDroneProps {
  isActive?: boolean;
  onStateChange?: (playing: boolean) => void;
  hidden?: boolean;
  baseFrequency?: number;
  autoPlay?: boolean;
  className?: string;
}

export function TanpuraDrone({
  isActive,
  onStateChange,
  hidden = false,
  baseFrequency = 130.81,
}: TanpuraDroneProps = {}) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [volume, setVolume] = React.useState(0.2);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const masterGainRef = React.useRef<GainNode | null>(null);
  const timerRef = React.useRef<number | null>(null);

  const startDrone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume, ctx.currentTime);
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;

      // Base Tonic (default C3 at 130.81 Hz)
      const baseFreq = baseFrequency;
      const strings = [
        { freq: baseFreq * 1.5, detune: 1 },    // 1st string: Pa (196.2 Hz)
        { freq: baseFreq * 2.0, detune: -2 },   // 2nd string: Madhya Sa (261.6 Hz)
        { freq: baseFreq * 2.0, detune: 2 },    // 3rd string: Madhya Sa (261.6 Hz)
        { freq: baseFreq, detune: 0 },          // 4th string: Kharja Sa (130.8 Hz)
      ];

      let stringIndex = 0;

      // Pluck a single tanpura string with rich harmonics
      const pluckString = () => {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;
        const now = audioCtxRef.current.currentTime;
        const str = strings[stringIndex];
        stringIndex = (stringIndex + 1) % strings.length;

        const partials = [
          { mult: 1, gain: 0.35 },
          { mult: 2, gain: 0.22 },
          { mult: 3, gain: 0.18 },
          { mult: 4, gain: 0.12 },
          { mult: 5, gain: 0.08 },
          { mult: 6, gain: 0.04 },
        ];

        const stringGain = ctx.createGain();
        stringGain.gain.setValueAtTime(0, now);
        stringGain.gain.linearRampToValueAtTime(0.4, now + 0.08); // soft pluck attack
        stringGain.gain.exponentialRampToValueAtTime(0.001, now + 4.8); // long resonant decay

        // Subtle low-pass filter for warm wooden bridge resonance
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1800, now);
        filter.frequency.exponentialRampToValueAtTime(600, now + 4.5);

        stringGain.connect(filter);
        filter.connect(masterGain);

        partials.forEach((p) => {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(str.freq * p.mult, now);
          osc.detune.setValueAtTime(str.detune + (Math.random() - 0.5) * 3, now);

          const partGain = ctx.createGain();
          partGain.gain.setValueAtTime(p.gain, now);

          osc.connect(partGain);
          partGain.connect(stringGain);

          osc.start(now);
          osc.stop(now + 5.0);
        });
      };

      // Initial pluck and interval loop every 1.4 seconds
      pluckString();
      timerRef.current = window.setInterval(pluckString, 1400);

      setIsPlaying(true);
      onStateChange?.(true);
    } catch {
      setIsPlaying(false);
      onStateChange?.(false);
    }
  };

  const stopDrone = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setIsPlaying(false);
    onStateChange?.(false);
  };

  const toggleDrone = () => {
    if (isPlaying) {
      stopDrone();
    } else {
      startDrone();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime(val, audioCtxRef.current.currentTime);
    }
  };

  // Sync with external isActive prop (gateway + SoundController)
  React.useEffect(() => {
    if (isActive === undefined) return;
    if (isActive && !isPlaying) startDrone();
    if (!isActive && isPlaying) stopDrone();
  }, [isActive]);

  React.useEffect(() => {
    return () => {
      stopDrone();
    };
  }, []);

  // Hidden mode — renders nothing, used as headless audio node by SoundController
  if (hidden) return null;

  return (
    <div className="inline-flex items-center gap-2 p-1.5 px-3 rounded-full bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] text-xs font-marathi">
      <button
        type="button"
        onClick={toggleDrone}
        className="inline-flex items-center gap-1.5 whitespace-nowrap text-[var(--dp-gold)] hover:text-[var(--dp-ink)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={isPlaying ? 'तानपुरा बंद' : 'तानपुरा सुरू'}
      >
        {isPlaying ? (
          <>
            <span className="w-2 h-2 rounded-full bg-[var(--dp-gold)] motion-safe:animate-pulse motion-reduce:animate-none" aria-hidden="true" />
            <Volume2 size={13} aria-hidden="true" />
            <span>तानपुरा चालू</span>
          </>
        ) : (
          <>
            <VolumeX size={13} aria-hidden="true" />
            <span>ध्यान नाद</span>
          </>
        )}
      </button>

      {isPlaying && (
        <div className="flex items-center gap-1.5 pl-2 border-l border-[var(--dp-rule)]">
          <label htmlFor="tanpura-vol" className="sr-only">
            तानपुरा आवाज
          </label>
          <input
            id="tanpura-vol"
            type="range"
            min="0"
            max="0.5"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="w-14 h-1 accent-[var(--dp-gold)] cursor-pointer disabled:opacity-50"
          />
        </div>
      )}
    </div>
  );
}
