'use client';

import * as React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/src/lib/theme';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { isDark, toggleTheme, mounted } = useTheme();

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
      onClick={toggleTheme}
      className={`p-2 rounded-lg text-muted-foreground hover:text-saffron hover:bg-saffron/10 transition-colors ${className}`}
      aria-label={isDark ? 'उजळ मोड बदला' : 'गडद मोड बदला'}
      title={isDark ? 'उजळ मोड' : 'गडद मोड'}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
