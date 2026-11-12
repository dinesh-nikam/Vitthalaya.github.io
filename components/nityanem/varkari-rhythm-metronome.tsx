'use client';

import * as React from 'react';
import { Play, Square, Volume2, RotateCcw } from 'lucide-react';
import type { TaalDefinition } from '@/src/services/nityanem-service';

interface Props {
  taals: TaalDefinition[];
  initialTaalId?: string;
  initialBpm?: number;
}

export function VarkariRhythmMetronome({
  taals,
  initialTaalId = 'bhajani',
  initialBpm = 88,
}: Props) {
  const [selectedTaalId, setSelectedTaalId] = React.useState(initialTaalId);
  const [bpm, setBpm] = React.useState(initialBpm);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentBeat, setCurrentBeat] = React.useState(0);
  const [mridangaVol, setMridangaVol] = React.useState(0.8);
  const [cymbalsVol, setCymbalsVol] = React.useState(0.7);

  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const timerRef = React.useRef<number | null>(null);
  const beatIndexRef = React.useRef(0);

  const activeTaal = React.useMemo(() => {
    return taals.find((t) => t.id === selectedTaalId) || taals[0];
  }, [taals, selectedTaalId]);

  // Ensure AudioContext is initialized on user gesture
  const getAudioContext = React.useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Synthesize Mridanga Dhum (Bass)
  const playDhum = React.useCallback(
    (ctx: AudioContext, time: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(68, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.32);

      gain.gain.setValueAtTime(mridangaVol * 0.9, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.36);
    },
    [mridangaVol]
  );

  // Synthesize Mridanga Taap (Treble snap)
  const playTaap = React.useCallback(
    (ctx: AudioContext, time: number) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340, time);
      osc.frequency.exponentialRampToValueAtTime(160, time + 0.08);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, time);
      filter.Q.setValueAtTime(3.0, time);

      gain.gain.setValueAtTime(mridangaVol * 0.7, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.1);
    },
    [mridangaVol]
  );

  // Synthesize Varkari Bronze Cymbals (टाळ - चिमटा/झांज)
  const playCymbals = React.useCallback(
    (ctx: AudioContext, time: number) => {
      // Dual high frequencies with rapid transient shimmer
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(3800, time);

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(5400, time);

      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2800, time);

      gain.gain.setValueAtTime(cymbalsVol * 0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + 0.23);
      osc2.stop(time + 0.23);
    },
    [cymbalsVol]
  );

  // Main tick scheduler
  React.useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      beatIndexRef.current = 0;
      setCurrentBeat(0);
      return;
    }

    const intervalMs = (60 / bpm) * 1000;

    const playStep = () => {
      const ctx = getAudioContext();
      if (!ctx) return;

      const idx = beatIndexRef.current % activeTaal.beatsCount;
      const now = ctx.currentTime;

      // Play Mridanga stroke
      const mStroke = activeTaal.mridangaPattern[idx];
      if (mStroke === 'both') {
        playDhum(ctx, now);
        playTaap(ctx, now);
      } else if (mStroke === 'dhum') {
        playDhum(ctx, now);
      } else if (mStroke === 'taap') {
        playTaap(ctx, now);
      }

      // Play Cymbals stroke
      const cStroke = activeTaal.cymbalsPattern[idx];
      if (cStroke === 'chipli') {
        playCymbals(ctx, now);
      }

      setCurrentBeat(idx);
      beatIndexRef.current++;
    };

    // Trigger first stroke immediately
    playStep();
    timerRef.current = window.setInterval(playStep, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, bpm, activeTaal, getAudioContext, playDhum, playTaap, playCymbals]);

  // Handle spacebar play/pause
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="vitthalaya-card rounded-2xl p-6 sm:p-8 space-y-6 border border-saffron/20 shadow-md">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--dp-rule)] pb-4">
        <div>
          <span className="text-[11px] font-marathi font-semibold text-[var(--dp-gold)] uppercase tracking-wider">
            वारकरी ताल साधना
          </span>
          <h3 className="vitthalaya-display text-xl sm:text-2xl font-bold mt-0.5">
            टाळ-मृदंग ठेका व ताल साथी
          </h3>
          <p className="text-xs text-[var(--dp-ink-dim)] font-marathi mt-1">
            {activeTaal.description}
          </p>
        </div>

        {/* Play / Stop Master Button */}
        <button
          type="button"
          onClick={() => {
            getAudioContext();
            setIsPlaying((p) => !p);
          }}
          className={`inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-semibold transition-all shadow-sm ${
            isPlaying
              ? 'bg-[var(--dp-brick)] text-white hover:opacity-90 ring-4 ring-[var(--dp-brick)]/20'
              : 'vitthalaya-btn-primary'
          }`}
          aria-label={isPlaying ? 'ठेका थांबवा' : 'ठेका सुरू करा'}
        >
          {isPlaying ? (
            <>
              <Square size={16} fill="currentColor" aria-hidden="true" />
              <span>थांबवा</span>
            </>
          ) : (
            <>
              <Play size={16} fill="currentColor" aria-hidden="true" />
              <span>ठेका सुरू करा</span>
            </>
          )}
        </button>
      </div>

      {/* Taal Selection Chips */}
      <div>
        <label className="block text-xs font-marathi font-medium text-[var(--dp-muted)] mb-2">
          ताल निवडा (छंद व प्रमाण)
        </label>
        <div className="flex flex-wrap gap-2">
          {taals.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setSelectedTaalId(t.id);
                setBpm(t.defaultBpm);
                beatIndexRef.current = 0;
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-marathi transition-all border ${
                selectedTaalId === t.id
                  ? 'bg-[var(--dp-gold)] text-white border-[var(--dp-gold)] font-bold shadow-sm'
                  : 'bg-[var(--dp-ground-well)] border-[var(--dp-rule)] text-[var(--dp-ink)] hover:border-[var(--dp-gold)]'
              }`}
            >
              {t.nameMarathi}
            </button>
          ))}
        </div>
      </div>

      {/* Beat Ring & Bol Display */}
      <div className="bg-[var(--dp-ground-well)] rounded-xl p-5 border border-[var(--dp-rule)] text-center space-y-4">
        {/* Visual Beats Row */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          {activeTaal.bol.map((bol, idx) => {
            const isCurrent = isPlaying && currentBeat === idx;
            const isSam = idx === 0;

            return (
              <div
                key={idx}
                className={`flex flex-col items-center justify-center w-10 sm:w-12 h-14 sm:h-16 rounded-xl border transition-all duration-75 ${
                  isCurrent
                    ? isSam
                      ? 'bg-[var(--dp-gold)] border-[var(--dp-gold)] text-white scale-110 shadow-lg ring-4 ring-[var(--dp-gold)]/25'
                      : 'bg-saffron-500/20 border-saffron-500 text-[var(--dp-gold)] scale-105'
                    : 'bg-[var(--dp-ground)] border-[var(--dp-rule)] text-[var(--dp-ink-dim)]'
                }`}
              >
                <span className="text-[10px] font-mono opacity-60">
                  {idx + 1}
                </span>
                <span className="text-sm sm:text-base font-marathi font-bold mt-0.5">
                  {bol}
                </span>
              </div>
            );
          })}
        </div>

        {/* Current Beat Announced */}
        <div className="text-xs font-marathi text-[var(--dp-ink-dim)]" aria-live="polite">
          {isPlaying ? (
            <span>
              मात्रा: <strong className="text-[var(--dp-ink)]">{currentBeat + 1} / {activeTaal.beatsCount}</strong>
              {currentBeat === 0 ? ' (सम - मुख्य आघात)' : ''} — बोल: <strong className="text-[var(--dp-gold)]">{activeTaal.bol[currentBeat]}</strong>
            </span>
          ) : (
            <span>ठेका सुरू करण्यासाठी वरील बटण दाबा किंवा स्पेसबार दाबा.</span>
          )}
        </div>
      </div>

      {/* BPM & Speed Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* BPM Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-marathi">
            <span className="text-[var(--dp-muted)]">लय व गती (BPM):</span>
            <span className="font-mono font-bold text-[var(--dp-gold)] text-sm">
              {bpm} ठोके/मिनिट
            </span>
          </div>
          <input
            type="range"
            min={45}
            max={170}
            step={2}
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value, 10))}
            className="w-full accent-[var(--dp-gold)] cursor-pointer"
            aria-label="लय वेग"
          />
          {/* Quick BPM Presets */}
          <div className="flex gap-2 pt-1">
            {[
              { label: 'विलंबित (६८)', val: 68 },
              { label: 'मध्य (८८)', val: 88 },
              { label: 'द्रुत (११२)', val: 112 },
              { label: 'अतिद्रुत (१३६)', val: 136 },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => setBpm(p.val)}
                className={`flex-1 py-1 text-[11px] font-marathi rounded border transition-colors ${
                  bpm === p.val
                    ? 'border-[var(--dp-gold)] text-[var(--dp-gold)] font-bold'
                    : 'border-[var(--dp-rule)] text-[var(--dp-muted)] hover:border-[var(--dp-rule-strong)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Volume Mixers */}
        <div className="space-y-3 bg-[var(--dp-ground-well)] p-3.5 rounded-xl border border-[var(--dp-rule)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-marathi font-medium text-[var(--dp-ink)] flex items-center gap-1.5">
              <Volume2 size={13} className="text-[var(--dp-gold)]" aria-hidden="true" />
              ध्वनी संतुलन (मिक्सर)
            </span>
            <button
              type="button"
              onClick={() => {
                setMridangaVol(0.8);
                setCymbalsVol(0.7);
              }}
              className="text-[10px] text-[var(--dp-muted)] hover:text-[var(--dp-gold)] flex items-center gap-1"
              title="मूळ आवाज रीसेट करा"
            >
              <RotateCcw size={10} aria-hidden="true" /> रीसेट
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[11px] font-marathi text-[var(--dp-ink-dim)] mb-1">
                <span>मृदंग (पखावज नाद)</span>
                <span className="font-mono">{Math.round(mridangaVol * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={mridangaVol}
                onChange={(e) => setMridangaVol(parseFloat(e.target.value))}
                className="w-full accent-[var(--dp-gold)] cursor-pointer h-1.5"
                aria-label="मृदंग आवाज"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-marathi text-[var(--dp-ink-dim)] mb-1">
                <span>वारकरी टाळ (कांस्य झंकार)</span>
                <span className="font-mono">{Math.round(cymbalsVol * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={cymbalsVol}
                onChange={(e) => setCymbalsVol(parseFloat(e.target.value))}
                className="w-full accent-[var(--dp-gold)] cursor-pointer h-1.5"
                aria-label="टाळ आवाज"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
