'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2, User, Building2, BookOpen, Music, Tag, Calendar } from 'lucide-react';

interface Suggestion {
  text: string;
  type: string;
}

interface Props {
  initialQuery?: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  /** If true, navigates on submit. If false, calls onSearch callback */
  navigateOnSubmit?: boolean;
  onSearch?: (query: string) => void;
  /** Show suggestions dropdown */
  showSuggestions?: boolean;
  /** Large hero-style input */
  variant?: 'default' | 'hero';
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  saint: <User className="w-3.5 h-3.5" />,
  deity: <Building2 className="w-3.5 h-3.5" />,
  composition: <BookOpen className="w-3.5 h-3.5" />,
  category: <Tag className="w-3.5 h-3.5" />,
  festival: <Calendar className="w-3.5 h-3.5" />,
  type: <Music className="w-3.5 h-3.5" />,
  transliteration: <Search className="w-3.5 h-3.5" />,
};

const TYPE_LABELS: Record<string, string> = {
  saint: 'संत',
  deity: 'देवता',
  composition: 'रचना',
  category: 'श्रेणी',
  festival: 'सण',
  type: 'प्रकार',
  transliteration: 'लिप्यंतर',
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function SearchInput({
  initialQuery = '',
  placeholder = 'अभंग, संत, देवता शोधा...',
  className = '',
  autoFocus = false,
  navigateOnSubmit = true,
  onSearch,
  showSuggestions = true,
  variant = 'default',
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debouncedQuery = useDebounce(query, 200);

  // Fetch suggestions
  useEffect(() => {
    if (!showSuggestions || !debouncedQuery || debouncedQuery.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&mode=suggest`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        const items: Suggestion[] = (data.suggestions || []).map((s: any) => ({
          text: s.label || s.text,
          type: s.type,
        }));
        setSuggestions(items);
        setIsOpen(items.length > 0);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery, showSuggestions]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSubmit = useCallback(
    (searchQuery: string) => {
      setIsOpen(false);
      if (navigateOnSubmit) {
        router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      } else {
        onSearch?.(searchQuery);
      }
    },
    [navigateOnSubmit, onSearch, router]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSubmit(suggestions[selectedIndex].text);
      } else {
        handleSubmit(query);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  };

  const clearQuery = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const inputClasses =
    variant === 'hero'
      ? 'w-full px-5 py-4 text-lg bg-white/95 backdrop-blur-sm border-2 border-saffron/30 rounded-xl focus:outline-none focus:border-saffron transition-colors shadow-lg shadow-saffron/5'
      : 'w-full px-4 py-2.5 bg-background border border-saffron/20 rounded-lg focus:outline-none focus:border-saffron/50 focus:ring-1 focus:ring-saffron/20 transition-colors';

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="search-suggestions"
          aria-activedescendant={selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined}
          className={inputClasses}
        />

        {/* Search icon (left) */}
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-saffron animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-saffron/60" />
          )}
        </div>

        {/* Clear button (right) */}
        {query && (
          <button
            onClick={clearQuery}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="शोध साफ करा"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          id="search-suggestions"
          role="listbox"
          className="absolute z-50 mt-1 w-full bg-card border border-saffron/20 rounded-lg shadow-xl overflow-hidden"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.text}-${index}`}
              id={`suggestion-${index}`}
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => handleSubmit(suggestion.text)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                index === selectedIndex
                  ? 'bg-saffron/10 text-foreground'
                  : 'text-muted-foreground hover:bg-saffron/5'
              }`}
            >
              <span className={`shrink-0 ${index === selectedIndex ? 'text-saffron' : ''}`}>
                {TYPE_ICONS[suggestion.type] || <Search className="w-3.5 h-3.5" />}
              </span>
              <span className="flex-1 truncate">{suggestion.text}</span>
              <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {TYPE_LABELS[suggestion.type] || suggestion.type}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
