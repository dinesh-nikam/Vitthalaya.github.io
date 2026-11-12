'use client';

import * as React from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  hue: number; // 35–55 → gold to turmeric
  life: number;
  maxLife: number;
}

interface ParticleCanvasProps {
  /** Steady-state ambient particle count */
  count?: number;
  /** Rising from true triggers a one-shot burst */
  burst?: boolean;
  /** Relative [0–1, 0–1] origin for the burst */
  burstOrigin?: [number, number];
  className?: string;
}

/**
 * GPU-accelerated 2D canvas particle system.
 * Renders drifting gold dust / turmeric embers with Brownian motion.
 * Pauses via IntersectionObserver when off-screen.
 * Zero Three.js dependency — raw CanvasRenderingContext2D only.
 * Fully respects prefers-reduced-motion (renders nothing when active).
 */
export function ParticleCanvas({
  count = 40,
  burst = false,
  burstOrigin = [0.5, 0.45],
  className = '',
}: ParticleCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const particlesRef = React.useRef<Particle[]>([]);
  const rafRef = React.useRef<number | null>(null);
  const visibleRef = React.useRef(true);
  const prevBurstRef = React.useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  // ── Main draw loop ──────────────────────────────────────
  React.useEffect(() => {
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const io = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { threshold: 0 },
    );
    io.observe(canvas);

    // Seed ambient particles at random positions
    for (let i = 0; i < count; i++) {
      particlesRef.current.push(makeAmbient(canvas, Math.random() * 300));
    }

    let frame = 0;
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      if (!visibleRef.current) return;
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Spawn new ambient particle every 7 frames
      if (frame % 7 === 0 && particlesRef.current.length < count * 2) {
        particlesRef.current.push(makeAmbient(canvas, 0));
      }

      particlesRef.current = particlesRef.current.filter((p) => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        // Slight Brownian micro-drift
        p.vx += (Math.random() - 0.5) * 0.025;

        const progress = p.life / p.maxLife;
        const alpha = p.alpha * (1 - progress);
        if (alpha <= 0) return false;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `hsl(${p.hue}, 90%, 65%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return p.life < p.maxLife;
      });
    };

    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      io.disconnect();
      particlesRef.current = [];
    };
  }, [count, prefersReducedMotion]);

  // ── Burst effect ────────────────────────────────────────
  React.useEffect(() => {
    if (prefersReducedMotion) return;
    if (!burst || prevBurstRef.current) return;
    prevBurstRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const cx = canvas.width * burstOrigin[0];
    const cy = canvas.height * burstOrigin[1];

    for (let i = 0; i < 90; i++) {
      const angle = (i / 90) * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      particlesRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        alpha: 0.9,
        size: 2 + Math.random() * 3.5,
        hue: 35 + Math.random() * 25,
        life: 0,
        maxLife: 70 + Math.random() * 60,
      });
    }
  }, [burst, burstOrigin, prefersReducedMotion]);

  if (prefersReducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeAmbient(canvas: HTMLCanvasElement, initialLife: number): Particle {
  return {
    x: Math.random() * (canvas.width || 400),
    y: (canvas.height || 600) + 10 - Math.random() * (canvas.height || 600),
    vx: (Math.random() - 0.5) * 0.5,
    vy: -(0.35 + Math.random() * 0.75),
    alpha: 0.4 + Math.random() * 0.5,
    size: 1.2 + Math.random() * 2.2,
    hue: 36 + Math.random() * 20,
    life: initialLife,
    maxLife: 180 + Math.random() * 140,
  };
}

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
