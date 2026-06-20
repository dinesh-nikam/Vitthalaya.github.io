'use client';

import * as React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export function ConchSoundButton() {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioCtxRef = React.useRef<AudioContext | null>(null);

  const playConchSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (isPlaying) return; // Prevent double trigger

      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;
      const now = ctx.currentTime;
      setIsPlaying(true);

      // --- 1. Synthesize the Horn sound (Triangle wave with harmonics) ---
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Lower resonant frequencies simulating a large conch shell
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(115, now); // Fundamental frequency (around A2#)
      
      // Pitch swell (blowing harder increases pitch slightly)
      osc1.frequency.linearRampToValueAtTime(125, now + 1.2);
      osc1.frequency.linearRampToValueAtTime(110, now + 3.2);

      // Second harmonic for richness
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(230, now);
      osc2.frequency.linearRampToValueAtTime(250, now + 1.2);
      osc2.frequency.linearRampToValueAtTime(220, now + 3.2);

      // Lowpass filter to shave off sharp sawtooth edges, giving a woody, deep resonance
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(280, now + 3.5);

      // Gain Envelope (Swell up and slow release)
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 1.2); // Swell (attack)
      gainNode.gain.setValueAtTime(0.3, now + 2.5); // Sustain
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 4.2); // Decay (release)

      // --- 2. Synthesize Breath Noise (for authentic air-blowing sound) ---
      const bufferSize = ctx.sampleRate * 4.5; // 4.5 seconds
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      // Fill buffer with white noise
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(180, now); // Bandpass noise near horn pitch
      noiseFilter.Q.setValueAtTime(2.0, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.08, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.0);

      // Connect noise nodes
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      // Connect horn nodes
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Start all nodes
      osc1.start(now);
      osc2.start(now);
      noiseSource.start(now);

      // Stop nodes when done
      const duration = 4.5;
      osc1.stop(now + duration);
      osc2.stop(now + duration);
      noiseSource.stop(now + duration);

      setTimeout(() => {
        setIsPlaying(false);
      }, duration * 1000);

    } catch (e) {
      console.warn('Conch sound block: ', e);
      setIsPlaying(false);
    }
  };

  return (
    <button
      onClick={playConchSound}
      disabled={isPlaying}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all ${
        isPlaying 
          ? 'bg-saffron text-white border-saffron animate-pulse' 
          : 'bg-card border-saffron/20 hover:border-saffron text-saffron'
      }`}
      aria-label="शंखनाद ऐका"
    >
      {isPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      <span>{isPlaying ? 'शंखनाद चालू आहे...' : 'शंखनाद ऐका 🐚'}</span>
    </button>
  );
}
export default ConchSoundButton;
