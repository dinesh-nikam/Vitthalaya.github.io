'use client';

import * as React from 'react';
import { Sparkles, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { TanpuraDrone } from './tanpura-drone';

const MANTRAS = [
  { id: 'rkh', label: 'राम कृष्ण हरी', meaning: 'वारकरी संप्रदायाचा महामंत्र' },
  { id: 'vitthal', label: 'विठ्ठल विठ्ठल विठ्ठल', meaning: 'अखंड नामस्मरण' },
  { id: 'dnyanoba', label: 'ज्ञानोबा माऊली तुकाराम', meaning: 'गुरु परंपरा वंदन' },
  { id: 'hari', label: 'जय जय रामकृष्ण हरी', meaning: 'वारी भक्ती गजर' },
];

export function JapaMala() {
  const [selectedMantra, setSelectedMantra] = React.useState(MANTRAS[0].id);
  const [beadCount, setBeadCount] = React.useState(0);
  const [completedMalas, setCompletedMalas] = React.useState(0);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [vibrateEnabled, _setVibrateEnabled] = React.useState(true);

  // Web Audio click synthesis for Tulsi bead sound
  const playBeadClick = React.useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // Woody click: short noise burst + pitched wooden resonance
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.04);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.Q.setValueAtTime(3.0, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // Audio fallback
    }
  }, [soundEnabled]);

  const advanceBead = React.useCallback(() => {
    playBeadClick();

    if (vibrateEnabled && typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(15);
    }

    setBeadCount((prev) => {
      const next = prev + 1;
      if (next >= 108) {
        setCompletedMalas((m) => m + 1);
        if (vibrateEnabled && typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([40, 60, 80]); // Celebration vibration on mala completion
        }
        return 0;
      }
      return next;
    });
  }, [playBeadClick, vibrateEnabled]);

  const resetCount = () => {
    if (window.confirm('नामजप मोजणी रीसेट करायची?')) {
      setBeadCount(0);
      setCompletedMalas(0);
    }
  };

  // Keyboard navigation: Spacebar advances bead
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        advanceBead();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [advanceBead]);

  const currentMantraObj = MANTRAS.find((m) => m.id === selectedMantra) || MANTRAS[0];

  return (
    <div className="vitthalaya-card rounded p-6 sm:p-8 border border-[var(--dp-rule)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--dp-rule)]">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] text-[var(--dp-gold)] text-xs font-marathi mb-2">
            <Sparkles size={12} aria-hidden="true" />
            पवित्र तुळशी जपमाळ
          </span>
          <h2 className="vitthalaya-display text-2xl font-bold">
            १०८ मणी नामजप साधना
          </h2>
          <p className="vitthalaya-prose text-xs text-[var(--dp-ink-dim)] mt-0.5">
            स्क्रीनवर टॅप करा किंवा स्पेसबार दाबून मणी पुढे सरकवा.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <TanpuraDrone />
          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            className="p-2 rounded-full border border-[var(--dp-rule)] text-[var(--dp-muted)] hover:text-[var(--dp-gold)] hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
            title={soundEnabled ? 'मणी आवाज बंद करा' : 'मणी आवाज सुरू करा'}
            aria-label={soundEnabled ? 'मणी आवाज बंद करा' : 'मणी आवाज सुरू करा'}
          >
            {soundEnabled ? <Volume2 size={15} aria-hidden="true" /> : <VolumeX size={15} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mantra Selector */}
      <div className="mb-8">
        <label htmlFor="mantra-picker" className="block text-xs font-marathi text-[var(--dp-muted)] mb-2">
          नामस्मरण मंत्र निवडा:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MANTRAS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMantra(m.id)}
              className={`p-2.5 rounded text-left border text-xs font-marathi transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedMantra === m.id
                  ? 'bg-[var(--dp-gold)]/20 border-[var(--dp-gold)] text-[var(--dp-gold)] font-bold'
                  : 'bg-[var(--dp-ground-well)] border-[var(--dp-rule)] text-[var(--dp-ink-dim)] hover:border-[var(--dp-gold)]'
              }`}
            >
              <p className="truncate font-semibold">{m.label}</p>
              <p className="text-[10px] text-[var(--dp-muted)] truncate mt-0.5">{m.meaning}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Mala Visual Counter & Central Dial */}
      <div className="flex flex-col items-center justify-center py-6">
        <button
          type="button"
          onClick={advanceBead}
          className="group relative w-60 h-60 sm:w-68 sm:h-68 rounded-full border-2 border-[var(--dp-rule)] bg-[var(--dp-ground-well)] hover:border-[var(--dp-gold)] flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dp-focus)] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          aria-label={`जप पुढे सरकवा: ${currentMantraObj.label}, मणी ${beadCount} पैकी १०८`}
        >
          {/* Subtle concentric beads circle guide */}
          <div className="absolute inset-2 rounded-full border border-[var(--dp-gold)]/20 pointer-events-none" />

          <span className="text-xs font-semibold text-[var(--dp-gold)] font-marathi mb-2 whitespace-nowrap">
            {currentMantraObj.label}
          </span>

          <span className="vitthalaya-display text-5xl sm:text-6xl font-bold text-[var(--dp-ink)] tracking-tight whitespace-nowrap">
            {beadCount}
          </span>
        </button>

        <p className="text-xs text-[var(--dp-muted)] font-marathi mt-3 whitespace-nowrap">
          १०८ मण्यांपैकी
        </p>

        <div className="mt-2 px-3 py-1 rounded-full bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] text-[11px] font-marathi text-[var(--dp-ink-dim)] whitespace-nowrap">
          टॅप करा किंवा Space दाबा
        </div>
      </div>

      {/* Progress & Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-[var(--dp-rule)] text-center text-xs font-marathi">
        <div className="p-3 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)]">
          <p className="text-[10px] text-[var(--dp-muted)]">सध्याचा मणी</p>
          <p className="vitthalaya-display text-xl font-bold text-[var(--dp-gold)] mt-0.5">
            {beadCount} / १०८
          </p>
        </div>

        <div className="p-3 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)]">
          <p className="text-[10px] text-[var(--dp-muted)]">पूर्ण झालेल्या माळा</p>
          <p className="vitthalaya-display text-xl font-bold text-[var(--dp-ink)] mt-0.5">
            {completedMalas} माळा
          </p>
        </div>

        <div className="p-3 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] col-span-2 sm:col-span-1">
          <p className="text-[10px] text-[var(--dp-muted)]">एकूण नामस्मरण</p>
          <p className="vitthalaya-display text-xl font-bold text-[var(--dp-gold)] mt-0.5">
            {completedMalas * 108 + beadCount} जप
          </p>
        </div>
      </div>

      {/* Reset button */}
      <div className="pt-4 flex justify-end">
        <button
          type="button"
          onClick={resetCount}
          className="inline-flex items-center gap-1 text-xs text-[var(--dp-muted)] hover:text-red-400 font-marathi transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw size={12} aria-hidden="true" />
          <span>मोजणी रीसेट करा</span>
        </button>
      </div>
    </div>
  );
}
