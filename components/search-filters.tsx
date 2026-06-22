'use client';

import { useState } from 'react';
import { Filter, X, ChevronDown, Music, User, Building2, Tag, Volume2 } from 'lucide-react';

export interface FilterState {
  type: string;
  deityName: string;
  saintName: string;
  festivalNames: string;
  hasAudio: boolean;
}

interface Props {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  className?: string;
  saints?: { name: string; slug: string }[];
  deities?: { name: string; slug: string }[];
  festivals?: { name: string; slug: string }[];
}

const COMPOSITION_TYPES = [
  { value: '', label: 'सर्व प्रकार', icon: null },
  { value: 'अभंग', label: 'अभंग', icon: Music },
  { value: 'आरती', label: 'आरती', icon: Music },
  { value: 'भजन', label: 'भजन', icon: Music },
  { value: 'हरिपाठ', label: 'हरिपाठ', icon: Music },
  { value: 'स्तोत्र', label: 'स्तोत्र', icon: Music },
  { value: 'गौळणी', label: 'गौळणी', icon: Music },
];

export default function SearchFilters({
  filters,
  onChange,
  onReset,
  className = '',
  saints = [],
  deities = [],
  festivals = [],
}: Props) {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasActiveFilters = filters.type || filters.deityName || filters.saintName || filters.festivalNames || filters.hasAudio;

  const handleChange = (key: keyof FilterState, value: string | boolean) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className={`bg-card rounded-lg border border-saffron/10 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 font-medium text-maroon"
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          फिल्टर
        </span>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-saffron/10 text-saffron">
              सक्रिय
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-saffron/10 pt-3">
          {/* Type filter */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <Music className="w-3 h-3" />
              प्रकार
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMPOSITION_TYPES.map((t) => {
                const isActive = filters.type === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => handleChange('type', isActive ? '' : t.value)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      isActive
                        ? 'bg-saffron text-white border-saffron'
                        : 'bg-transparent text-muted-foreground border-saffron/20 hover:border-saffron/40'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audio toggle */}
          <div>
            <button
              onClick={() => handleChange('hasAudio', !filters.hasAudio)}
              className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filters.hasAudio
                  ? 'bg-saffron text-white border-saffron'
                  : 'bg-transparent text-muted-foreground border-saffron/20 hover:border-saffron/40'
              }`}
            >
              <Volume2 className="w-3 h-3" />
              फक्त ऑडिओ
            </button>
          </div>

          {/* Saint filter */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <User className="w-3 h-3" />
              संत
            </label>
            <select
              value={filters.saintName}
              onChange={(e) => handleChange('saintName', e.target.value)}
              className="w-full text-sm px-3 py-1.5 rounded-lg border border-saffron/20 bg-background focus:outline-none focus:border-saffron/50"
            >
              <option value="">सर्व संत</option>
              {saints.map((s) => (
                <option key={s.slug} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Deity filter */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <Building2 className="w-3 h-3" />
              देवता
            </label>
            <select
              value={filters.deityName}
              onChange={(e) => handleChange('deityName', e.target.value)}
              className="w-full text-sm px-3 py-1.5 rounded-lg border border-saffron/20 bg-background focus:outline-none focus:border-saffron/50"
            >
              <option value="">सर्व देवता</option>
              {deities.map((d) => (
                <option key={d.slug} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Festival filter */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <Tag className="w-3 h-3" />
              सण
            </label>
            <select
              value={filters.festivalNames}
              onChange={(e) => handleChange('festivalNames', e.target.value)}
              className="w-full text-sm px-3 py-1.5 rounded-lg border border-saffron/20 bg-background focus:outline-none focus:border-saffron/50"
            >
              <option value="">सर्व सण</option>
              {festivals.map((f) => (
                <option key={f.slug} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset filters */}
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-maroon transition-colors"
            >
              <X className="w-3 h-3" />
              फिल्टर रीसेट करा
            </button>
          )}
        </div>
      )}
    </div>
  );
}
