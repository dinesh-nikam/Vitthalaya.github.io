'use client';

import Link from 'next/link';
import { Music, User, Building2, Loader2, Search } from 'lucide-react';

export interface SearchResultItem {
  id: string;
  titleMarathi: string;
  titleTranslit: string;
  slug: string;
  type: string;
  saintName: string | null;
  saintTranslit: string | null;
  deityName: string | null;
  hasAudio: boolean;
  snippet: string;
  /** Meilisearch _formatted with <em> tags for highlights */
  formatted?: {
    titleMarathi?: string;
    fullText?: string;
    saintName?: string;
    deityName?: string;
  };
}

interface Props {
  results: SearchResultItem[];
  query: string;
  isLoading?: boolean;
  total?: number;
}

/** Render text with <em> highlight tags as styled spans */
function HighlightedText({ text, fallback, className = '' }: { text?: string; fallback: string; className?: string }) {
  if (!text) {
    return <span className={className}>{fallback}</span>;
  }

  // Check if there are any <em> tags
  if (!text.includes('<em>')) {
    return <span className={className}>{text}</span>;
  }

  const parts = text.split(/(<em>|<\/em>)/g);
  const rendered: React.ReactNode[] = [];
  let isHighlight = false;

  for (const part of parts) {
    if (part === '<em>') {
      isHighlight = true;
    } else if (part === '</em>') {
      isHighlight = false;
    } else if (part) {
      rendered.push(
        isHighlight ? (
          <mark key={rendered.length} className="bg-saffron/20 text-foreground rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      );
    }
  }

  return <span className={className}>{rendered}</span>;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  abhang: <Music className="w-4 h-4" />,
  आरती: <Music className="w-4 h-4" />,
  भजन: <Music className="w-4 h-4" />,
  हरिपाठ: <Music className="w-4 h-4" />,
  स्तोत्र: <Music className="w-4 h-4" />,
  गौळणी: <Music className="w-4 h-4" />,
};

export default function SearchResultsList({ results, query, isLoading, total }: Props) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-saffron" />
        <p className="text-sm">शोधत आहे...</p>
      </div>
    );
  }

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Search className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">शोधासाठी मजकूर टाइप करा</p>
        <p className="text-xs mt-1">अभंग, संत, देवता, कीवर्ड शोधा</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Search className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-base">"{query}" साठी कोणतेही निकाल आढळले नाही</p>
        <p className="text-sm mt-1">इतर शब्दांनी पुन्हा प्रयत्न करा</p>
      </div>
    );
  }

  return (
    <div>
      {total !== undefined && (
        <p className="text-sm text-muted-foreground mb-4">
          {total} निकाल आढळले
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {results.map((result) => (
          <Link
            key={result.id}
            href={`/abhang/${result.slug}`}
            className="block rounded-lg border border-saffron/10 bg-card p-5 hover:shadow-md hover:border-saffron/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-saffron"
          >
            {/* Title with highlight */}
            <h2 className="font-marathiHeading text-lg text-maroon mb-2 line-clamp-2">
              <HighlightedText
                text={result.formatted?.titleMarathi}
                fallback={result.titleMarathi}
              />
            </h2>
            <p className="text-sm text-muted-foreground mb-2">
              {result.titleTranslit}
            </p>

            {/* Type badge + Audio icon */}
            <div className="flex items-center gap-2 mb-3">
              {result.hasAudio && (
                <Music className="w-4 h-4 text-saffron shrink-0" aria-label="ऑडिओ उपलब्ध" />
              )}
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-saffron/10 text-saffron rounded-full">
                {TYPE_ICONS[result.type.toLowerCase()] || null}
                {result.type}
              </span>
            </div>

            {/* Snippet with highlights */}
            <p className="text-sm text-foreground line-clamp-3 mb-4">
              <HighlightedText
                text={result.formatted?.fullText}
                fallback={result.snippet}
              />
            </p>

            {/* Saint + Deity */}
            <div className="flex justify-between items-center text-sm gap-2">
              {result.saintName && (
                <span className="inline-flex items-center gap-1 text-maroon truncate">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <HighlightedText
                    text={result.formatted?.saintName}
                    fallback={result.saintName}
                  />
                </span>
              )}
              {result.deityName && (
                <span className="inline-flex items-center gap-1 text-muted-foreground truncate">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <HighlightedText
                    text={result.formatted?.deityName}
                    fallback={result.deityName}
                  />
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
