/**
 * Shared types for the Digital Pandharpur Book Generation Engine.
 */

/** All supported composition types (mirrors scraper pipeline enum) */
export type CompositionType =
  | 'abhang'
  | 'aarti'
  | 'bhajan'
  | 'stotra'
  | 'haripath'
  | 'gaulani'
  | 'deviche_gane'
  | 'bharud'
  | 'kirtan'
  | 'namasmaran'
  | 'powada';


// ── Curation ──────────────────────────────────────────────────────────────────

export type CurationType = 'SAINT_BASED' | 'DEITY_BASED' | 'FESTIVAL_BASED' | 'THEME_BASED' | 'USER_CURATED';

export type BookType = 'POCKET' | 'STANDARD' | 'PREMIUM_HARDCOVER' | 'COLLECTOR' | 'TEMPLE';

export type BookFormat = 'DIGITAL_PDF' | 'DIGITAL_EPUB' | 'DIGITAL_KINDLE' | 'PRINT_PAPERBACK' | 'PRINT_HARDCOVER' | 'PRINT_COLLECTOR';

export type BookStatus = 'DRAFT' | 'GENERATING' | 'READY' | 'PUBLISHED' | 'ARCHIVED';

export interface CurationCriteria {
  saintIds?: string[];
  deityIds?: string[];
  festivalIds?: string[];
  themeSlug?: string;
  compositionTypes?: CompositionType[];
  keywordFilters?: string[];
  minScore?: number;
  maxCount?: number;
  balanceByType?: boolean;
  balanceBySaint?: boolean;
  includeMeanings?: boolean;
}

export interface CurationScore {
  compositionId: string;
  scores: {
    popularity: number;
    historicalSignificance: number;
    authenticity: number;
    literaryValue: number;
    spiritualRelevance: number;
    diversityBonus: number;
  };
  compositeScore: number;
  included: boolean;
  reason: string;
}

export interface CuratedSelection {
  compositions: Array<{
    compositionId: string;
    titleMarathi: string;
    fullText: string;
    meaning?: string;
    type: string;
    saintName?: string;
    deityName?: string;
    score: number;
  }>;
  sections: BookSection[];
  totalScore: number;
  stats: {
    totalCandidates: number;
    included: number;
    byType: Record<string, number>;
    bySaint: Record<string, number>;
  };
}

// ── Book Structure ────────────────────────────────────────────────────────────

export interface BookSection {
  title: string;
  titleTranslit: string;
  description?: string;
  type: string;
  compositionIndices: number[];
}

export interface BookContent {
  preface?: string;
  saintBiography?: string;
  historicalContext?: string;
  sections: BookSection[];
  afterword?: string;
  references?: string[];
}

// ── Cover Design ──────────────────────────────────────────────────────────────

export type CoverPalette = 'bhagwa' | 'maroon' | 'gold' | 'cream' | 'emerald' | 'indigo';

export interface CoverDesign {
  titleMarathi: string;
  titleEnglish?: string;
  subtitle?: string;
  palette: CoverPalette;
  saintImage?: string;
  templeArt?: string;
  decorativeBorder?: string;
  fontFamily: string;
  foilEffect?: boolean;
  authorName?: string;
}

// ── Layout ────────────────────────────────────────────────────────────────────

export interface LayoutConfig {
  trimSize: string;       // "6x9", "5.5x8.5", etc.
  dpi: number;
  bleedMm: number;
  marginMm: number;
  lineHeight: number;
  fontSizePt: number;
  fontFamily: string;
  includePageNumbers: boolean;
  includeHeaders: boolean;
  colorMode: 'CMYK' | 'RGB';
}

export const DEFAULT_LAYOUTS: Record<BookType, LayoutConfig> = {
  POCKET:            { trimSize: '5.5x8.5', dpi: 300, bleedMm: 3, marginMm: 15, lineHeight: 1.7, fontSizePt: 10, fontFamily: 'Noto Sans Devanagari', includePageNumbers: true, includeHeaders: true, colorMode: 'CMYK' },
  STANDARD:          { trimSize: '6x9',     dpi: 300, bleedMm: 3, marginMm: 18, lineHeight: 1.8, fontSizePt: 11, fontFamily: 'Noto Sans Devanagari', includePageNumbers: true, includeHeaders: true, colorMode: 'CMYK' },
  PREMIUM_HARDCOVER: { trimSize: '7x10',    dpi: 300, bleedMm: 3, marginMm: 20, lineHeight: 1.8, fontSizePt: 12, fontFamily: 'Noto Sans Devanagari', includePageNumbers: true, includeHeaders: true, colorMode: 'CMYK' },
  COLLECTOR:         { trimSize: '7x10',    dpi: 300, bleedMm: 3, marginMm: 22, lineHeight: 1.9, fontSizePt: 12, fontFamily: 'Noto Serif Devanagari', includePageNumbers: true, includeHeaders: true, colorMode: 'CMYK' },
  TEMPLE:            { trimSize: '8.5x11',  dpi: 300, bleedMm: 3, marginMm: 20, lineHeight: 1.8, fontSizePt: 13, fontFamily: 'Noto Sans Devanagari', includePageNumbers: true, includeHeaders: true, colorMode: 'CMYK' },
};

// ── Generation Request & Result ───────────────────────────────────────────────

export interface GenerateBookRequest {
  titleMarathi: string;
  titleEnglish?: string;
  bookType: BookType;
  curationType: CurationType;
  curationCriteria: CurationCriteria;
  layoutConfig?: Partial<LayoutConfig>;
  coverDesign?: Partial<CoverDesign>;
  creatorId?: string;
  isPublic?: boolean;
}

export interface GenerateBookResult {
  publicationId: string;
  slug: string;
  status: BookStatus;
  editions: Array<{
    format: BookFormat;
    fileUrl?: string;
    pageCount?: number;
  }>;
  stats: {
    totalCompositions: number;
    pageCount: number;
    sections: number;
  };
  error?: string;
}

// ── Pricing ───────────────────────────────────────────────────────────────────

export interface PricingBreakdown {
  basePrice: number;
  printCost: number;
  shippingCost: number;
  tax: number;
  total: number;
  currency: string;
}
