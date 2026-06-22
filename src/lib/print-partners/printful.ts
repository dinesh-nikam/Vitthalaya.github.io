/**
 * Printful Integration — REST API wrapper for Printful's POD service.
 *
 * API docs: https://developers.printful.com/docs/
 *
 * Printful supports paperback + hardcover, global fulfillment,
 * and has a printing facility in India (Mumbai).
 *
 * Environment:
 *   PRINTFUL_API_KEY
 */

const PRINTFUL_API = 'https://api.printful.com';

interface PrintfulAuth {
  key: string;
}

function getAuth(): PrintfulAuth {
  const key = process.env.PRINTFUL_API_KEY;
  if (!key) throw new Error('PRINTFUL_API_KEY not set');
  return { key };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { key } = getAuth();
  const res = await fetch(`${PRINTFUL_API}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Printful API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.result as T;
}

// ── Product Catalog ──────────────────────────────────────────────────────────

export interface PrintfulProduct {
  id: number;
  name: string;
  type: string;
  tech: string[];
}

export async function listProducts(): Promise<PrintfulProduct[]> {
  return apiFetch<PrintfulProduct[]>('/store/products');
}

// ── Calculate Shipping ────────────────────────────────────────────────────────

export interface PrintfulShippingRate {
  id: string;
  name: string;
  rate: string;
  currency: string;
  minDeliveryDays: number;
  maxDeliveryDays: number;
}

export async function getShippingRates(
  recipient: { country: string; state?: string; city?: string },
  items: Array<{ variantId: number; quantity: number }>,
): Promise<PrintfulShippingRate[]> {
  return apiFetch<PrintfulShippingRate[]>('/shipping/rates', {
    method: 'POST',
    body: JSON.stringify({ recipient, items }),
  });
}

// ── Create Printful Order ─────────────────────────────────────────────────────

export interface PrintfulOrderRequest {
  recipient: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    country_code: string;
    zip: string;
    phone?: string;
    email?: string;
  };
  items: Array<{
    sync_product_id?: number;
    variant_id: number;
    quantity: number;
    files?: Array<{ url: string }>;
  }>;
}

export interface PrintfulOrderResult {
  id: number;
  external_id: string;
  status: string;
  shipping: string;
  tracking_number?: string;
  tracking_url?: string;
  created: number;
  updated: number;
}

export async function createOrder(
  request: PrintfulOrderRequest,
): Promise<PrintfulOrderResult> {
  return apiFetch<PrintfulOrderResult>('/orders', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ── Estimate Print Cost ───────────────────────────────────────────────────────

export interface PrintCostEstimate {
  cost: number;
  retail: number;
  currency: string;
}

export async function estimateCost(
  variantId: number,
): Promise<PrintCostEstimate> {
  return apiFetch<PrintCostEstimate>(`/products/variant/${variantId}`);
}

// ── Webhook Validation ────────────────────────────────────────────────────────

export async function validatePrintfulWebhook(
  body: string,
  signature: string,
): Promise<boolean> {
  const key = process.env.PRINTFUL_WEBHOOK_SECRET;
  if (!key) return false;

  const { createHmac } = await import('crypto');
  const expected = createHmac('sha256', key).update(body).digest('hex');
  return expected === signature;
}
