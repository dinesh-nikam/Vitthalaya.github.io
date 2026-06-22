/**
 * Lulu Print API Integration — REST API wrapper for Lulu's print-on-demand service.
 *
 * API docs: https://developers.lulu.com/
 *
 * Lulu supports paperback + hardcover + dust jacket, global fulfillment.
 *
 * Environment:
 *   LULU_API_KEY
 *   LULU_API_SECRET
 */

const LULU_API = 'https://api.lulu.com';

interface LuluAuth {
  token: string;
}

let authCache: LuluAuth | null = null;

async function getAuth(): Promise<LuluAuth> {
  if (authCache) return authCache;

  const key = process.env.LULU_API_KEY;
  const secret = process.env.LULU_API_SECRET;
  if (!key || !secret) throw new Error('LULU_API_KEY and LULU_API_SECRET must be set');

  const res = await fetch(`${LULU_API}/auth/realms/printful/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: key,
      client_secret: secret,
    }),
  });

  if (!res.ok) throw new Error(`Lulu auth failed: ${await res.text()}`);

  const data = await res.json();
  authCache = { token: data.access_token };
  return authCache;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const auth = await getAuth();
  const res = await fetch(`${LULU_API}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Lulu API error (${res.status}): ${err}`);
  }

  return res.json() as Promise<T>;
}

// ── Print Job Types ───────────────────────────────────────────────────────────

export interface LuluPrintJob {
  id: string;
  status: string;
  line_items: Array<{
    id: string;
    printable_normalization: {
      id: string;
      title: string;
      page_count: number;
    };
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  shipping_address: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state_code: string;
    country_code: string;
    postcode: string;
  };
  tracking_number?: string;
  created: string;
}

export interface LuluPrintSpec {
  title: string;
  author: string;
  pageCount: number;
  trimSize: string;         // "6x9", "5.5x8.5"
  paperType: string;        // "standard", "premium"
  coverType: string;        // "softcover", "hardcover"
  color: boolean;
}

// ── Create Print Job ──────────────────────────────────────────────────────────

export async function createPrintJob(
  spec: LuluPrintSpec,
  pdfUrl: string,
  copies: number,
): Promise<LuluPrintJob> {
  return apiFetch<LuluPrintJob>('/print-jobs/', {
    method: 'POST',
    body: JSON.stringify({
      line_items: [
        {
          printable: {
            title: spec.title,
            author: spec.author,
            page_count: spec.pageCount,
            trim_size: spec.trimSize,
            paper_type: spec.paperType,
            cover_type: spec.coverType,
            color: spec.color,
          },
          printable_normalization: {
            source_file: pdfUrl,
          },
          quantity: copies,
        },
      ],
    }),
  });
}

// ── Check Status ─────────────────────────────────────────────────────────────

export async function getPrintJobStatus(jobId: string): Promise<LuluPrintJob> {
  return apiFetch<LuluPrintJob>(`/print-jobs/${jobId}/`);
}

// ── Estimate Cost ─────────────────────────────────────────────────────────────

export interface LuluCostEstimate {
  total_cost: number;
  currency: string;
  line_items: Array<{
    unit_cost: number;
    total_cost: number;
  }>;
}

export async function estimatePrintCost(
  spec: LuluPrintSpec,
  copies: number,
): Promise<LuluCostEstimate> {
  return apiFetch<LuluCostEstimate>('/print-jobs/estimate/', {
    method: 'POST',
    body: JSON.stringify({
      line_items: [
        {
          title: spec.title,
          page_count: spec.pageCount,
          trim_size: spec.trimSize,
          paper_type: spec.paperType,
          cover_type: spec.coverType,
          color: spec.color,
          quantity: copies,
        },
      ],
    }),
  });
}
