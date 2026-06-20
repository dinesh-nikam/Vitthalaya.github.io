'use client';

import * as React from 'react';

interface BellLikeButtonProps {
  slug: string;
  className?: string;
}

export function BellLikeButton({ slug, className = '' }: BellLikeButtonProps) {
  const [liked, setLiked] = React.useState(false);
  const [angle, setAngle] = React.useState(0);
  
  // Spring physics variables
  const animationFrameRef = React.useRef<number | null>(null);
  const velocityRef = React.useRef(0);
  const currentAngleRef = React.useRef(0);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLiked = localStorage.getItem(`liked_${slug}`) === 'true';
      setLiked(isLiked);
    }
  }, [slug]);

  // Clean up animation on unmount
  React.useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Bell chime synthesizer
  const playBellChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // Higher bell pitch (G5/A5) for micro-interaction feedback
      const baseFreq = 783.99; // G5

      const partials = [
        { ratio: 1.0, decay: 1.2, gain: 0.15 },
        { ratio: 2.0, decay: 0.8, gain: 0.08 },
        { ratio: 2.4, decay: 0.5, gain: 0.10 },
        { ratio: 3.0, decay: 0.3, gain: 0.05 }
      ];

      partials.forEach((p) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * p.ratio, now);

        gainNode.gain.setValueAtTime(p.gain, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + p.decay + 0.1);
      });
    } catch (e) {
      // Ignored if blocked
    }
  };

  const startSwingAnimation = () => {
    // Inject sudden momentum
    velocityRef.current = 45.0; // Starting angular velocity (degrees/sec)

    const springConst = 15.0; // Spring stiffness
    const damping = 2.2;      // Resistance

    let lastTime = performance.now();

    const updateSwing = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1); // delta in seconds
      lastTime = now;

      // Hooke's Law: Acceleration = -k * x - c * v
      const acceleration = -springConst * currentAngleRef.current - damping * velocityRef.current;
      velocityRef.current += acceleration * dt;
      currentAngleRef.current += velocityRef.current * dt;

      setAngle(currentAngleRef.current);

      // Stop loop when spring settles near rest position (angle and velocity near 0)
      if (Math.abs(currentAngleRef.current) > 0.1 || Math.abs(velocityRef.current) > 0.1) {
        animationFrameRef.current = requestAnimationFrame(updateSwing);
      } else {
        setAngle(0);
        currentAngleRef.current = 0;
        velocityRef.current = 0;
      }
    };

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(updateSwing);
  };

  const handleLike = () => {
    const nextLikedState = !liked;
    setLiked(nextLikedState);
    localStorage.setItem(`liked_${slug}`, String(nextLikedState));

    // Swing bell and chime on positive click
    startSwingAnimation();
    if (nextLikedState) {
      playBellChime();
    }
  };

  return (
    <button
      onClick={handleLike}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-saffron/20 text-sm hover:bg-saffron/10 text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-saffron ${
        liked ? 'bg-gold/10 border-gold/40 text-gold' : ''
      } ${className}`}
      aria-label={liked ? 'आवडले याला काढा' : 'आवडले'}
    >
      <div 
        className="w-5 h-5 flex items-center justify-center"
        style={{
          transform: `rotate(${angle}deg)`,
          transformOrigin: '10px 2px',
          transition: animationFrameRef.current ? 'none' : 'transform 0.3s ease'
        }}
      >
        <svg 
          viewBox="0 0 20 20" 
          className={`w-4 h-4 fill-none stroke-current ${liked ? 'text-gold fill-gold/20' : 'text-saffron'}`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Bell Hanger Chain Loop */}
          <path d="M10 1v2" />
          {/* Bell Body */}
          <path d="M6 8a4 4 0 0 1 8 0c0 3 1.5 4.5 2 5H4c.5-.5 2-2 2-5z" />
          {/* Clapper (striker) */}
          <circle cx="10" cy="16" r="1.5" className={liked ? 'fill-gold' : 'fill-saffron'} />
        </svg>
      </div>
      <span className="font-medium">{liked ? 'आवडले!' : 'आवडले'}</span>
    </button>
  );
}
export default BellLikeButton;
