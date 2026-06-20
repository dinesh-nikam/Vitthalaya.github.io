'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, MapPin, Calendar, BookOpen, ArrowRight } from 'lucide-react';
import { SAINTS_COLLECTION } from '@/src/lib/assets-registry';

// Map slugs to curated images from SAINTS_COLLECTION for premium layout
const SAINT_IMAGES: Record<string, string> = {
  'tukaram-maharaj': SAINTS_COLLECTION[10]?.url || SAINTS_COLLECTION[0].url, // Dehu Woods / Meditation
  'dnyaneshwar-maharaj': SAINTS_COLLECTION[0].url, // Meditation
  'namdev-maharaj': SAINTS_COLLECTION[7]?.url || SAINTS_COLLECTION[0].url, // Reading scriptures
  'eknath-maharaj': SAINTS_COLLECTION[3].url, // Light of knowledge
};

// Fallback generator if slug not in mapping
function getSaintImage(slug: string, id: string): string {
  if (SAINT_IMAGES[slug]) return SAINT_IMAGES[slug];
  // Deterministic fallback based on id length or char codes
  const charCodeSum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = charCodeSum % SAINTS_COLLECTION.length;
  return SAINTS_COLLECTION[index].url;
}

interface Saint {
  id: string;
  nameMarathi: string;
  nameTranslit: string;
  slug: string;
  period: string | null;
  biography: string | null;
  region: string | null;
  imageUrl: string | null;
}

interface SaintsListProps {
  initialSaints: Saint[];
}

export function SaintsList({ initialSaints }: SaintsListProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedRegion, setSelectedRegion] = React.useState('ALL');

  // Extract unique regions dynamically
  const regions = React.useMemo(() => {
    const allRegions = initialSaints
      .map(s => s.region?.trim())
      .filter((r): r is string => !!r);
    return ['ALL', ...Array.from(new Set(allRegions))];
  }, [initialSaints]);

  // Filter saints
  const filteredSaints = React.useMemo(() => {
    return initialSaints.filter(saint => {
      const matchesSearch = 
        saint.nameMarathi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        saint.nameTranslit.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (saint.biography && saint.biography.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRegion = 
        selectedRegion === 'ALL' || 
        saint.region?.trim() === selectedRegion;

      return matchesSearch && matchesRegion;
    });
  }, [initialSaints, searchQuery, selectedRegion]);

  return (
    <div className="space-y-8">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 glass-premium p-5 rounded-2xl border border-saffron/15 shadow-sm saffron-glow">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-saffron" />
          <input
            type="search"
            placeholder="संतांचे नाव किंवा चरित्र शोधा..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-saffron/20 rounded-xl bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-saffron/30 focus:border-saffron text-sm font-marathi transition-all text-foreground"
          />
        </div>

        {/* Region Filter */}
        <div className="w-full sm:w-64">
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="w-full px-3 py-2.5 border border-saffron/20 rounded-xl bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-saffron/30 focus:border-saffron text-sm font-marathi transition-all text-foreground"
          >
            <option value="ALL">सर्व प्रांत / भाग (All Regions)</option>
            {regions.filter(r => r !== 'ALL').map(region => (
              <option key={region} value={region}>
                📍 {region}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid List */}
      {filteredSaints.length === 0 ? (
        <div className="text-center py-16 bg-card border border-saffron/10 rounded-xl">
          <p className="text-muted-foreground text-md">माहिती आढळली नाही. कृपया वेगळा शोध घ्या.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSaints.map((saint) => (
            <Link
              key={saint.id}
              href={`/sant/${saint.slug}`}
              className="group block glass-premium rounded-2xl border border-saffron/15 hover:border-saffron/40 hover:shadow-lg hover:shadow-saffron/5 hover-card-premium transition-all duration-500 overflow-hidden focus:outline-none focus:ring-2 focus:ring-saffron"
            >
              {/* Card Image Header */}
              <div className="relative h-56 w-full overflow-hidden bg-muted/20 border-b border-saffron/10">
                {/* Visual Image */}
                <img
                  src={getSaintImage(saint.slug, saint.id)}
                  alt={saint.nameMarathi}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out brightness-90 group-hover:brightness-100"
                  loading="lazy"
                />
                {/* Saffron overlay and gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                
                {/* Floating Saint Indicator Badge */}
                <div className="absolute top-4 left-4 bg-saffron/90 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-md flex items-center gap-1 backdrop-blur-sm border border-white/10">
                  <span className="animate-pulse">🚩</span> वारकरी संत
                </div>

                {/* Name Overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                  <h2 className="font-marathiHeading text-xl text-white font-bold leading-tight drop-shadow-md group-hover:text-saffron transition-colors">
                    {saint.nameMarathi}
                  </h2>
                  <p className="text-xs text-white/70 font-sans tracking-wide drop-shadow-sm">
                    {saint.nameTranslit}
                  </p>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-4">
                {/* Metadata Details */}
                <div className="grid grid-cols-2 gap-3 py-1.5 border-b border-saffron/5 text-xs">
                  {saint.period && (
                    <div className="flex items-center gap-1.5 text-foreground/75 font-marathi">
                      <span className="w-5 h-5 rounded-md bg-saffron/10 flex items-center justify-center text-saffron font-sans">📅</span>
                      <span className="truncate">{saint.period}</span>
                    </div>
                  )}
                  {saint.region && (
                    <div className="flex items-center gap-1.5 text-foreground/75 font-marathi">
                      <span className="w-5 h-5 rounded-md bg-saffron/10 flex items-center justify-center text-saffron font-sans">📍</span>
                      <span className="truncate">{saint.region}</span>
                    </div>
                  )}
                </div>

                {/* Bio snippet */}
                {saint.biography && (
                  <p className="text-xs text-foreground/80 line-clamp-3 leading-relaxed font-marathi">
                    {saint.biography}
                  </p>
                )}

                {/* Footer Link shortcut */}
                <div className="text-xs font-bold text-saffron flex items-center gap-1 justify-end group-hover:underline pt-2 border-t border-saffron/5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>चरित्र व अभंग पहा</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
