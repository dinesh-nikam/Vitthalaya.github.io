/**
 * Pricing Engine — calculates book costs, print costs, shipping,
 * and final retail prices.
 *
 * Pricing Tiers (from architecture plan):
 *   Edition       | Digital | Print
 *   --------------|---------|-------
 *   Pocket        | ₹99     | ₹299
 *   Standard      | ₹199    | ₹599
 *   Premium HC    | ₹399    | ₹1,299
 *   Collector     | ₹999    | ₹2,999
 *   Temple        | Free    | ₹4,999
 */

import type { BookType, BookFormat } from '../../book-generation/types';

// ── Base Pricing Table ─────────────────────────────────────────────────────────

const TIER_PRICES: Record<BookType, { digital: number; print: number }> = {
  POCKET:            { digital: 99,   print: 299 },
  STANDARD:          { digital: 199,  print: 599 },
  PREMIUM_HARDCOVER: { digital: 399,  print: 1299 },
  COLLECTOR:         { digital: 999,  print: 2999 },
  TEMPLE:            { digital: 0,    print: 4999 },
};

// ── Print Cost Estimation (per part) ──────────────────────────────────────────

interface PrintCostParams {
  pageCount: number;
  bookType: BookType;
  color: boolean;
  paperType: 'cream' | 'white' | 'premium';
  coverFinish: 'matte' | 'glossy' | 'leather';
}

const PAGE_COST: Record<BookType, { bw: number; color: number }> = {
  POCKET:            { bw: 0.50,  color: 1.00 },
  STANDARD:          { bw: 0.60,  color: 1.20 },
  PREMIUM_HARDCOVER: { bw: 0.80,  color: 1.80 },
  COLLECTOR:         { bw: 1.20,  color: 2.50 },
  TEMPLE:            { bw: 0.90,  color: 2.00 },
};

const COVER_COST: Record<string, number> = {
  matte: 25, glossy: 30, leather: 120,
};

const PAPER_PREMIUM: Record<string, number> = {
  cream: 0, white: 0.20, premium: 0.50,
};

export function estimatePrintCost(params: PrintCostParams): number {
  const perPage = PAGE_COST[params.bookType];
  const pageCost = params.pageCount * (params.color ? perPage.color : perPage.bw);
  const paperCost = params.pageCount * (PAPER_PREMIUM[params.paperType] ?? 0);
  const coverCost = COVER_COST[params.coverFinish] ?? 25;

  return Math.round((pageCost + paperCost + coverCost) * 100) / 100;
}

// ── Shipping Cost Estimation ──────────────────────────────────────────────────

const SHIPPING_RATES: Record<string, { base: number; perKg: number }> = {
  domestic: { base: 50,  perKg: 30 },
  saarc:    { base: 200, perKg: 100 },
  international: { base: 500, perKg: 300 },
};

export interface ShippingParams {
  weightG: number;
  region: 'domestic' | 'saarc' | 'international';
}

export function estimateShipping(params: ShippingParams): number {
  const rate = SHIPPING_RATES[params.region] ?? SHIPPING_RATES.international;
  const weightKg = params.weightG / 1000;
  return Math.round((rate.base + rate.perKg * weightKg) * 100) / 100;
}

// ── Tax ───────────────────────────────────────────────────────────────────────

/** GST on books in India, expressed as a percentage — single source of truth
 *  for both tax math and the labels shown at checkout / order details. Change
 *  it here and every surface updates at once. */
export const GST_RATE_PERCENT = 5;

/** GST as a fraction (0.05), used by calculateTax(). */
export const GST_RATE = GST_RATE_PERCENT / 100;

/** Human-readable GST label (e.g. "कर (GST 5%)"), derived from the rate above
 *  so a rate change updates the checkout and order detail pages together. */
export const GST_LABEL = `कर (GST ${GST_RATE_PERCENT}%)`;

export function calculateTax(amount: number): number {
  return Math.round(amount * GST_RATE * 100) / 100;
}

// ── Full Price Breakdown ──────────────────────────────────────────────────────

export interface PriceBreakdown {
  basePrice: number;
  printCost: number;
  shippingCost: number;
  tax: number;
  total: number;
  currency: string;
}

export interface PricingInput {
  bookType: BookType;
  format: BookFormat;
  pageCount: number;
  shippingRegion?: 'domestic' | 'saarc' | 'international';
  weightG?: number;
  color?: boolean;
}

export function computePrice(input: PricingInput): PriceBreakdown {
  const basePrice = TIER_PRICES[input.bookType];

  const isDigital = input.format.startsWith('DIGITAL_');
  const base = isDigital ? basePrice.digital : basePrice.print;

  const printCost = isDigital
    ? 0
    : estimatePrintCost({
        pageCount: input.pageCount,
        bookType: input.bookType,
        color: input.color ?? false,
        paperType: input.bookType === 'COLLECTOR' ? 'premium' : 'cream',
        coverFinish: input.bookType === 'PREMIUM_HARDCOVER' || input.bookType === 'COLLECTOR' ? 'leather' : 'matte',
      });

  const shipping = isDigital
    ? 0
    : estimateShipping({
        weightG: input.weightG ?? input.pageCount * 3, // ~3g per page
        region: input.shippingRegion ?? 'domestic',
      });

  const subtotal = base + printCost + shipping;
  const tax = isDigital ? 0 : calculateTax(subtotal);

  return {
    basePrice: base,
    printCost,
    shippingCost: shipping,
    tax,
    total: Math.round((subtotal + tax) * 100) / 100,
    currency: 'INR',
  };
}

// ── Format Price Lookup ───────────────────────────────────────────────────────

export function getBasePrice(bookType: BookType, format: BookFormat): number {
  const tier = TIER_PRICES[bookType] ?? TIER_PRICES.STANDARD;
  return format.startsWith('DIGITAL_') ? tier.digital : tier.print;
}

/**
 * The unit price a customer pays for one copy of an edition — single source
 * of truth shared by the book detail page (what the customer sees), the cart,
 * and /api/orders/create (what gets charged).
 *
 * An explicit edition price always wins; otherwise DIGITAL formats default to
 * ₹99 and print formats to ₹299. Accepts Prisma Decimal via the toNumber()
 * shape (or a number/string) so callers can pass edition.price directly.
 */
export function getUnitPrice(
  editionPrice: number | string | { toNumber(): number } | null | undefined,
  format: string
): number {
  if (editionPrice != null) {
    const n = typeof editionPrice === 'object' ? editionPrice.toNumber() : Number(editionPrice);
    if (Number.isFinite(n)) return n;
  }
  return format.startsWith('DIGITAL_') ? 99 : 299;
}
