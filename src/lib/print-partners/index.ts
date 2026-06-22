/**
 * Print Partner Resolution & Cost Calculation.
 * Routes orders to the best partner based on region, format, and cost.
 */

import type { BookType } from '../../book-generation/types';

// ── Partner Types ─────────────────────────────────────────────────────────────

export type PartnerProvider = 'printful' | 'lulu' | 'kdp' | 'regional_printer';

export interface PrintPartnerInfo {
  id: string;
  name: string;
  provider: PartnerProvider;
  isActive: boolean;
  supportsHardcover: boolean;
  supportsColor: boolean;
  maxPages: number | null;
  baseCostPerPage: number | null;
  baseCostPerBook: number | null;
  coverCostPerBook: number | null;
  currency: string;
  regions: string[];
}

export interface PrintJobRequest {
  partnerId: string;
  title: string;
  author: string;
  format: BookType;
  pageCount: number;
  color: boolean;
  copies: number;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  pdfUrl: string;
  coverUrl: string;
}

export interface PrintJobResult {
  jobId: string;
  partnerOrderId: string;
  status: 'pending' | 'processing' | 'shipped' | 'cancelled';
  trackingNumber?: string;
  estimatedDelivery?: string;
  cost: number;
  currency: string;
}

// ── Cost Calculation ──────────────────────────────────────────────────────────

export function estimatePartnerCost(
  partner: PrintPartnerInfo,
  pageCount: number,
  color: boolean,
): number {
  const perPage = color
    ? (partner.baseCostPerPage ?? 0.6)
    : (partner.baseCostPerPage ?? 0.4) * 0.7;

  const pageCost = pageCount * perPage;
  const baseCost = partner.baseCostPerBook ?? 0;
  const coverCost = partner.coverCostPerBook ?? 25;

  return Math.round((baseCost + pageCost + coverCost) * 100) / 100;
}

// ── Partner Selection Strategy ────────────────────────────────────────────────

export interface SelectPartnerParams {
  region: string;
  bookType: BookType;
  pageCount: number;
  hardcover: boolean;
  color: boolean;
}

export function selectBestPartner(
  partners: PrintPartnerInfo[],
  params: SelectPartnerParams,
): PrintPartnerInfo | null {
  const candidates = partners.filter((p) => {
    if (!p.isActive) return false;
    if (params.hardcover && !p.supportsHardcover) return false;
    if (params.color && !p.supportsColor) return false;
    if (p.maxPages && params.pageCount > p.maxPages) return false;
    if (!p.regions.some((r) => params.region.toLowerCase().includes(r.toLowerCase()))) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  // Pick cheapest
  candidates.sort(
    (a, b) => estimatePartnerCost(a, params.pageCount, params.color)
      - estimatePartnerCost(b, params.pageCount, params.color),
  );

  return candidates[0];
}
