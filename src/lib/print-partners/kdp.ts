/**
 * Amazon KDP Integration — Kindle Direct Publishing for print & eBook.
 *
 * KDP uses their Cover Creator and paperback submission APIs.
 * For Phase 1: generates KDP-compatible files + metadata for manual upload.
 * For Phase 2: automated submission via KDP API (requires KDP account approval).
 *
 * Environment:
 *   KDP_API_KEY          (optional, for automated submission)
 *   KDP_API_SECRET       (optional)
 */

import AdmZip from 'adm-zip';
import type { BookType } from '../../book-generation/types';

// ── KDP Format Specs ──────────────────────────────────────────────────────────

interface KdpFormatSpec {
  trimSize: string;
  bleed: string;
  minPages: number;
  maxPages: number;
}

const KDP_FORMATS: Record<string, KdpFormatSpec> = {
  POCKET:           { trimSize: '5.5x8.5', bleed: '0.125in', minPages: 24, maxPages: 828 },
  STANDARD:         { trimSize: '6x9',     bleed: '0.125in', minPages: 24, maxPages: 828 },
  PREMIUM_HARDCOVER: { trimSize: '7x10',   bleed: '0.125in', minPages: 75, maxPages: 550 },
  COLLECTOR:        { trimSize: '7x10',    bleed: '0.125in', minPages: 75, maxPages: 550 },
  TEMPLE:           { trimSize: '8.5x11',  bleed: '0.125in', minPages: 24, maxPages: 828 },
};

// ── KDP Metadata ──────────────────────────────────────────────────────────────

export interface KdpMetadata {
  title: string;
  subtitle?: string;
  author: string;
  description: string;
  language: string;           // 'mr'
  categories: string[];       // Amazon BISAC categories
  keywords: string[];         // 7 max
  isbn?: string;
  series?: string;
  editionNumber?: number;
  publicationDate?: string;
  pricing: {
    marketplace: string;       // 'IN', 'US', 'GB', etc.
    currency: string;          // 'INR', 'USD'
    listPrice: number;
  }[];
}

// ── Generate KDP-Ready PDF Package ────────────────────────────────────────────

export interface KdpPackage {
  /** Print-ready PDF with KDP bleed specs */
  interiorPdf: Buffer;
  /** Cover PDF (wrap: front + spine + back) */
  coverPdf: Buffer;
  /** Metadata JSON for KDP upload */
  metadata: KdpMetadata;
}

export function getKdpFormat(bookType: BookType): KdpFormatSpec {
  return KDP_FORMATS[bookType] ?? KDP_FORMATS.STANDARD;
}

// ── KDP Manuscript Template Guide ─────────────────────────────────────────────

export function generateKdpGuide(bookType: BookType): string {
  const spec = getKdpFormat(bookType);

  return `# KDP Upload Guide — ${bookType}

## Interior File
- Format: PDF
- Trim size: ${spec.trimSize}
- Bleed: ${spec.bleed}
- Pages must be multiples of 2
- Embed all fonts (Noto Sans Devanagari, Inter)
- CMYK color mode for color pages

## Cover File
- Format: PDF
- Includes: front cover + spine + back cover
- Spine width: calculated from page count + paper type
- Resolution: 300 DPI

## Metadata
- Language: Marathi (mr)
- Categories: Religion & Spirituality > Hinduism
- Keywords: abhang, aarti, bhakti, marathi, वारकरी, संत

## Pricing (India Market)
- Set INR pricing in KDP dashboard
- Enable expanded distribution for global reach

## Review
- Download KDP Previewer to check rendering
- Check all Devanagari characters render correctly
- Verify page breaks and section starts
`;
}

// ── KDP Cover Dimensions Calculator ───────────────────────────────────────────

export function calculateKdpCoverDimensions(
  pageCount: number,
  bookType: BookType,
  paperType: 'cream' | 'white' = 'cream',
): { widthPx: number; heightPx: number; spineMm: number } {
  const spec = getKdpFormat(bookType);
  const [wStr, hStr] = spec.trimSize.split('x');
  const widthIn = parseFloat(wStr);
  const heightIn = parseFloat(hStr);

  // Spine thickness: ~0.002252 inches per page for cream, 0.002 for white
  const spineIn = pageCount * (paperType === 'cream' ? 0.002252 : 0.002);

  // Cover wrap width = back + spine + front + bleeds
  const bleedIn = 0.125;
  const totalWidthIn = widthIn + spineIn + widthIn + bleedIn * 2;
  const totalHeightIn = heightIn + bleedIn * 2;

  return {
    widthPx: Math.round(totalWidthIn * 300),
    heightPx: Math.round(totalHeightIn * 300),
    spineMm: Math.round(spineIn * 25.4),
  };
}
