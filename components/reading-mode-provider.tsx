'use client';

import * as React from 'react';
import { Moon, Sun, Bookmark } from 'lucide-react';
import { toggleBookmark, isBookmarked } from '@/src/db/bookmark';

interface ReadingModeContextValue {
  isReadingMode: boolean;
  setReadingMode: (value: boolean) => void;
  isDarkMode: boolean;
  setDarkMode: (value: boolean) => void;
  bookmarked: boolean;
  toggleBookmarkForSlug: (slug: string, title?: string) => void;
}

const ReadingModeContext = React.createContext<ReadingModeContextValue | null>(null);

export function useReadingMode() {
  const context = React.useContext(ReadingModeContext);
  if (!context) {
    throw new Error('useReadingMode must be used within ReadingModeProvider');
  }
  return context;
}

export function ReadingModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isReadingMode, setIsReadingMode] = React.useState(false);
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  // Read from localStorage on mount
  React.useEffect(() => {
    const storedReading = localStorage.getItem('reading-mode');
    const storedDark = localStorage.getItem('dark-mode');

    if (storedReading !== null) {
      setIsReadingMode(JSON.parse(storedReading));
    }
    if (storedDark !== null) {
      setIsDarkMode(JSON.parse(storedDark));
    }
  }, []);

  // Apply dark mode to document
  React.useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('dark-mode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Listen for preference changes
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      localStorage.setItem('dark-mode', JSON.stringify(e.matches));
      setIsDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const setReadingMode = (value: boolean) => {
    setIsReadingMode(value);
    localStorage.setItem('reading-mode', JSON.stringify(value));
  };

  const [currentSlug, setCurrentSlug] = React.useState<string | null>(null);

  // Extract slug from URL for bookmarking
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/');
      const slug = pathParts[pathParts.indexOf('abhang') + 1];
      if (slug) {
        setCurrentSlug(slug);
      }
    }
  }, []);

  const bookmarked = currentSlug ? isBookmarked(currentSlug) : false;

  const toggleBookmarkWithTitle = (slug: string, title?: string) => {
    if (title) {
      toggleBookmark(slug, title);
    }
  };

  return (
    <ReadingModeContext.Provider
      value={{
        isReadingMode,
        setReadingMode,
        isDarkMode,
        setDarkMode: setIsDarkMode,
        bookmarked,
        toggleBookmarkForSlug: toggleBookmarkWithTitle,
      }}
    >
      <div className={isReadingMode ? 'reading-mode-active' : ''}>{children}</div>
    </ReadingModeContext.Provider>
  );
}

// Reading Mode Toggle Button
export function ReadingModeToggle() {
  const { isReadingMode, setReadingMode } = useReadingMode();

  return (
    <button
      onClick={() => setReadingMode(!isReadingMode)}
      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-saffron/20 text-sm hover:bg-saffron/10 transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
      aria-label={isReadingMode ? 'सामान्य मोड' : 'वाचन मोड'}
    >
      {isReadingMode ? (
        <>
          <Sun className="w-4 h-4" />
          <span>सामान्य</span>
        </>
      ) : (
        <>
          <Bookmark className="w-4 h-4" />
          <span>वाचन</span>
        </>
      )}
    </button>
  );
}

// Dark Mode Toggle Button
export function DarkModeToggle() {
  const { isDarkMode, setDarkMode } = useReadingMode();

  return (
    <button
      onClick={() => setDarkMode(!isDarkMode)}
      className="p-2 rounded-lg border border-saffron/20 hover:bg-saffron/10 transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
      aria-label={isDarkMode ? 'लाइट मोड' : 'डार्क मोड'}
    >
      {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}