'use client';

import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export function setTheme(theme: Theme) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('theme', theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
  window.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
}

export function useTheme() {
  const [theme, setInternalTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setInternalTheme(getTheme());

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<Theme>;
      setInternalTheme(customEvent.detail);
    };

    window.addEventListener('themechange', handleThemeChange);
    
    // Also listen to storage events from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        const nextTheme = (e.newValue as Theme) || 'light';
        document.documentElement.classList.toggle('dark', nextTheme === 'dark');
        setInternalTheme(nextTheme);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('themechange', handleThemeChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
    mounted,
  };
}
