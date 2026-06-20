'use client';

import * as React from 'react';
import { Bookmark } from 'lucide-react';
import { toggleBookmark, isBookmarked } from '@/src/db/bookmark';

interface BookmarkButtonProps {
  slug: string;
  title: string;
  className?: string;
}

interface LeafParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  spin: number;
  opacity: number;
}

export function BookmarkButton({ slug, title, className = '' }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const particlesRef = React.useRef<LeafParticle[]>([]);
  const animationIdRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    setBookmarked(isBookmarked(slug));
  }, [slug]);

  // Clean up animation on unmount
  React.useEffect(() => {
    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    };
  }, []);

  const triggerLeafBurst = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset canvas dimensions to capture outer bounds
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    const particles: LeafParticle[] = [];
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Create 12 green Tulsi leaf particles
    for (let i = 0; i < 12; i++) {
      particles.push({
        x: centerX,
        y: centerY,
        vx: (Math.random() - 0.5) * 4, // spread horizontally
        vy: -2 - Math.random() * 4,    // shoot upwards
        size: 5 + Math.random() * 6,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.1,
        opacity: 1
      });
    }

    particlesRef.current = particles;

    const animateParticles = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      let alive = false;

      particlesRef.current.forEach((p) => {
        if (p.opacity <= 0) return;

        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // gravity drag
        p.angle += p.spin;
        p.opacity = Math.max(0, p.opacity - 0.025); // fade out

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = `rgba(62, 107, 62, ${p.opacity})`; // Tulsi Green (#3E6B3E)

        // Draw leaf path
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.quadraticCurveTo(p.size * 0.6, -p.size * 0.3, p.size * 0.2, p.size);
        ctx.quadraticCurveTo(-p.size * 0.6, -p.size * 0.3, 0, -p.size);
        ctx.fill();

        // Draw leaf central vein
        ctx.strokeStyle = `rgba(41, 64, 41, ${p.opacity * 0.6})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(0, p.size * 0.6);
        ctx.stroke();

        ctx.restore();
      });

      if (alive) {
        animationIdRef.current = requestAnimationFrame(animateParticles);
      } else {
        ctx.clearRect(0, 0, rect.width, rect.height);
      }
    };

    if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    animateParticles();
  };

  const handleClick = () => {
    const nowBookmarked = toggleBookmark(slug, title);
    setBookmarked(nowBookmarked);
    
    // Only burst particles on active bookmark add
    if (nowBookmarked) {
      triggerLeafBurst();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`relative overflow-visible flex items-center gap-2 px-4 py-2 rounded-lg border border-saffron/20 text-sm hover:bg-saffron/10 text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-saffron ${
        bookmarked ? 'bg-saffron/20 border-saffron/40' : ''
      } ${className}`}
      aria-label={bookmarked ? 'वाचले याला वगळा' : 'वाचले याला'}
    >
      <canvas
        ref={canvasRef}
        className="absolute -inset-10 pointer-events-none z-10 w-[calc(100%+80px)] h-[calc(100%+80px)]"
      />
      <Bookmark className={`w-4 h-4 text-saffron transition-transform duration-300 group-active:scale-90 ${bookmarked ? 'fill-saffron' : ''}`} />
      <span className="relative z-0 font-medium">{bookmarked ? 'वाचले' : 'वाचले याला'}</span>
    </button>
  );
}