'use client';

/**
 * SearchOverlay — full-screen mobile search overlay.
 * Triggered by custom event `open-search-overlay` dispatched from header nav.
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2 } from 'lucide-react';

interface Suggestion {
  text: string;
  type: string;
  label: string;
}

const TYPE_LABELS: Record<string, string> = {
  saint: 'संत',
  composition: 'रचना',
  category: 'श्रेणी',
  festival: 'सण',
  deity: 'देवता',
};

const TYPE_COLORS: Record<string, string> = {
  saint: 'bg-saffron/10 text-saffron',
  composition: 'bg-peacock/10 text-peacock',
  category: 'bg-maroon/10 text-maroon',
  festival: 'bg-gold/10 text-gold',
  deity: 'bg-tulsi/10 text-tulsi',
};

const POPULAR_SEARCHES = [
  'तुकाराम महाराज',
  'विठ्ठल',
  'हरिपाठ',
  'देवी आरती',
  'ज्ञानेश्वरी',
  'अभंग',
];

export function SearchOverlay() {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Listen for open event from header
  React.useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setQuery('');
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 150);
    };

    window.addEventListener('open-search-overlay', handleOpen);
    return () => window.removeEventListener('open-search-overlay', handleOpen);
  }, []);

  // Close on Escape
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  // Debounced suggestions
  React.useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();

    fetch(`/api/search?q=${encodeURIComponent(query)}&mode=suggest`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        const items: Suggestion[] = (data.suggestions || []).map((s: any) => ({
          text: s.text || s.label,
          type: s.type,
          label: s.label || s.text,
        }));
        setSuggestions(items);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));

    return () => controller.abort();
  }, [query]);

  const handleSubmit = (searchQuery: string) => {
    setIsOpen(false);
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(query);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Overlay Panel */}
      <div className="absolute top-0 left-0 right-0 bg-background rounded-b-2xl shadow-2xl animate-slide-up border-b border-saffron/10">
        {/* Header with search input */}
        <div className="flex items-center gap-3 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-saffron/60" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="अभंग, संत, देवता शोधा..."
              className="w-full pl-10 pr-4 py-3 bg-card border-2 border-saffron/20 rounded-xl focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/15 text-base font-marathi transition-all"
              autoComplete="off"
              aria-label="शोधा"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-saffron animate-spin" />
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-saffron/10 rounded-lg transition-colors text-muted-foreground"
            aria-label="बंद करा"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="px-4 pb-6 max-h-[60vh] overflow-y-auto">
          {suggestions.length > 0 ? (
            <div className="space-y-1">
              {suggestions.map((s, idx) => (
                <button
                  key={`${s.type}-${s.text}-${idx}`}
                  onClick={() => handleSubmit(s.text)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-saffron/5 transition-colors text-left"
                >
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${TYPE_COLORS[s.type] || 'bg-muted text-muted-foreground'}`}>
                    {TYPE_LABELS[s.type] || s.type}
                  </span>
                  <span className="text-sm font-marathi text-foreground truncate">{s.label}</span>
                </button>
              ))}
            </div>
          ) : query.length < 2 ? (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                लोकप्रिय शोध
              </p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleSubmit(term)}
                    className="px-4 py-2 rounded-full border border-saffron/20 bg-saffron/5 text-sm hover:bg-saffron/10 hover:border-saffron/30 transition-colors font-marathi"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              &ldquo;{query}&rdquo; साठी कोणतेही सूचन नाही
            </p>
          )}
        </div>

        {/* Quick action: Search all */}
        {query.trim().length >= 2 && (
          <div className="px-4 pb-4">
            <button
              onClick={() => handleSubmit(query)}
              className="w-full py-3 bg-saffron text-white font-semibold rounded-xl hover:bg-saffron/90 transition-colors flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              &ldquo;{query}&rdquo; साठी सर्व निकाल पहा
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
