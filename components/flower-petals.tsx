'use client';

import * as React from 'react';

interface FlowerPetalsProps {
  active: boolean;
  onComplete?: () => void;
}

interface Petal {
  x: number;
  y: number;
  r: number; // size/radius
  d: number; // density/weight (gravity factor)
  color: string;
  angle: number;
  angleSpeed: number;
  wobble: number; // horizontal oscillation amplitude
  wobbleSpeed: number;
}

export function FlowerPetals({ active, onComplete }: FlowerPetalsProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [shouldRender, setShouldRender] = React.useState(false);

  React.useEffect(() => {
    if (active) {
      setShouldRender(true);
    }
  }, [active]);

  React.useEffect(() => {
    if (!shouldRender || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Curated marigold petal colors (saffron orange, temple gold, deep red-orange)
    const colors = [
      '#FF7A1A', // Saffron
      '#FF9E4D', // Saffron Light
      '#C9A227', // Gold
      '#E8B44D', // Gold Light
      '#9E2A2B', // Deep Orange-Red
      '#E05A47'  // Marigold Orange
    ];

    const petalCount = 80;
    const petals: Petal[] = [];

    // Initialize petals at random starting positions above the viewport
    for (let i = 0; i < petalCount; i++) {
      petals.push({
        x: Math.random() * width,
        y: Math.random() * -height - 20, // Start above the screen
        r: 6 + Math.random() * 10, // Size
        d: 1 + Math.random() * 1.5, // Fall speed factor
        color: colors[Math.floor(Math.random() * colors.length)],
        angle: Math.random() * Math.PI * 2,
        angleSpeed: (Math.random() - 0.5) * 0.03,
        wobble: 5 + Math.random() * 15,
        wobbleSpeed: 0.02 + Math.random() * 0.03
      });
    }

    let time = 0;
    let petalsFinished = 0;

    const drawPetal = (ctx: CanvasRenderingContext2D, p: Petal) => {
      ctx.save();
      // Translate to petal center
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      // Draw an organic elliptical petal shape
      ctx.beginPath();
      ctx.fillStyle = p.color;
      
      // Draw almond/petal shape using bezier curves
      ctx.moveTo(0, -p.r);
      ctx.bezierCurveTo(p.r * 0.7, -p.r * 0.5, p.r * 0.7, p.r * 0.5, 0, p.r);
      ctx.bezierCurveTo(-p.r * 0.7, p.r * 0.5, -p.r * 0.7, -p.r * 0.5, 0, -p.r);
      
      ctx.fill();
      
      // Add subtle internal shading line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
      ctx.lineWidth = 1;
      ctx.moveTo(0, -p.r);
      ctx.lineTo(0, p.r);
      ctx.stroke();

      ctx.restore();
    };

    const update = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.01;
      petalsFinished = 0;

      petals.forEach((p) => {
        // Fall down
        p.y += p.d * 1.6;
        // Sway sideways (wobble)
        p.x += Math.sin(time * p.wobbleSpeed * 10) * 0.6;
        // Spin
        p.angle += p.angleSpeed;

        // Check if petal finished falling
        if (p.y > height + 20) {
          petalsFinished++;
        } else {
          drawPetal(ctx, p);
        }
      });

      // If all petals fell below screen, terminate the animation
      if (petalsFinished >= petalCount) {
        cancelAnimationFrame(animationId);
        setShouldRender(false);
        if (onComplete) onComplete();
      } else {
        animationId = requestAnimationFrame(update);
      }
    };

    update();

    // Resize handler
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [shouldRender, onComplete]);

  if (!shouldRender) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 w-full h-full"
      style={{ mixBlendMode: 'multiply' }} // Blends colors nicely with paper backgrounds
    />
  );
}
export default FlowerPetals;
