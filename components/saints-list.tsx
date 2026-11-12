'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, BookOpen, ArrowRight, Calendar, MapPin } from 'lucide-react';
import { SaintCardVisual } from '@/components/saint-card-visual';

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

  const regions = React.useMemo(() => {
    const allRegions = initialSaints
      .map((s) => s.region?.trim())
      .filter((r): r is string => !!r);
    return ['ALL', ...Array.from(new Set(allRegions))];
  }, [initialSaints]);

  const filteredSaints = React.useMemo(() => {
    return initialSaints.filter((saint) => {
      const matchesSearch =
        saint.nameMarathi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        saint.nameTranslit.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (saint.biography && saint.biography.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRegion =
        selectedRegion === 'ALL' || saint.region?.trim() === selectedRegion;

      return matchesSearch && matchesRegion;
    });
  }, [initialSaints, searchQuery, selectedRegion]);

  return (
    <div className="space-y-8">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <label htmlFor="saint-search-input" className="sr-only">
            संतांचे नाव किंवा चरित्र शोधा
          </label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--dp-muted)]" aria-hidden="true" />
          <input
            id="saint-search-input"
            type="search"
            placeholder="संतांचे नाव किंवा चरित्र शोधा..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] rounded text-[var(--dp-ink)] font-marathi text-sm focus:outline-none focus:border-[var(--dp-gold)] focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="w-full sm:w-64">
          <label htmlFor="saint-region-select" className="sr-only">
            प्रांत किंवा भाग निवडा
          </label>
          <select
            id="saint-region-select"
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="w-full px-4 py-2.5 bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] rounded text-[var(--dp-ink)] font-marathi text-sm focus:outline-none focus:border-[var(--dp-gold)] focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="ALL">सर्व प्रांत (सर्व भाग)</option>
            {regions.filter((r) => r !== 'ALL').map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Saints */}
      {filteredSaints.length === 0 ? (
        <div className="text-center py-16 vitthalaya-card rounded">
          <p className="text-[var(--dp-muted)] text-sm font-marathi">माहिती आढळली नाही. कृपया वेगळा शोध घ्या.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSaints.map((saint) => (
            <Link
              key={saint.id}
              href={`/sant/${saint.slug}`}
              className="vitthalaya-card rounded overflow-hidden group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
            >
              <SaintCardVisual
                slug={saint.slug}
                nameMarathi={saint.nameMarathi}
                nameTranslit={saint.nameTranslit}
                period={saint.period}
                region={saint.region}
              />

              <div className="p-5 space-y-3">
                <div>
                  <h2 className="vitthalaya-display text-xl font-bold text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors">
                    {saint.nameMarathi}
                  </h2>
                  <p className="text-xs text-[var(--dp-muted)] font-marathi mt-0.5">
                    {saint.nameTranslit}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--dp-rule)] text-xs text-[var(--dp-ink-dim)] font-marathi">
                  {saint.period && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={13} className="text-[var(--dp-gold)]" aria-hidden="true" />
                      {saint.period}
                    </span>
                  )}
                  {saint.region && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={13} className="text-[var(--dp-gold)]" aria-hidden="true" />
                      {saint.region}
                    </span>
                  )}
                </div>

                {saint.biography && (
                  <p className="text-xs text-[var(--dp-ink-dim)] line-clamp-3 leading-relaxed font-marathi">
                    {saint.biography}
                  </p>
                )}

                <div className="pt-2 flex items-center justify-end text-xs font-semibold font-marathi text-[var(--dp-gold)] group-hover:underline">
                  <span className="inline-flex items-center gap-1">
                    <BookOpen size={13} aria-hidden="true" />
                    चरित्र व अभंग
                    <ArrowRight size={13} aria-hidden="true" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
