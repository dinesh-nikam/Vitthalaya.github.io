'use client';

/**
 * ThemeToggle — global dark/light mode toggle.
 * Uses localStorage + document.documentElement.classList for persistence.
 * Place in header-nav or mobile drawer for global access.
 */
import * as React from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [isDark, setIsDark] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // Initialize from localStorage + HTML class on mount
  React.useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = stored ? stored === 'dark' : prefersDark;

    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  // Prevent hydration mismatch — render neutral icon until mounted
  if (!mounted) {
    return (
      <button
        className={`p-2 rounded-lg text-muted-foreground ${className}`}
        aria-label="थीम बदला"
        disabled
      >
        <Sun className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={`p-2 rounded-lg text-muted-foreground hover:text-saffron hover:bg-saffron/10 transition-colors ${className}`}
      aria-label={isDark ? 'उजळ मोड बदला' : 'गडद मोड बदला'}
      title={isDark ? 'उजळ मोड' : 'गडद मोड'}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
