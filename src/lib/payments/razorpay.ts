/**
 * Razorpay Integration — creates payment orders and verifies webhook signatures.
 *
 * Flow:
 *   1. Backend creates Razorpay order → returns order_id
 *   2. Frontend opens Razorpay Checkout modal with order_id
 *   3. On success: Razorpay calls webhook → order status updated
 *
 * Environment variables:
 *   RAZORPAY_KEY_ID
 *   RAZORPAY_KEY_SECRET
 *   RAZORPAY_WEBHOOK_SECRET
 */

// ── Razorpay API Client ───────────────────────────────────────────────────────

interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;       // in paise
  amount_paid: number;
  amount_due: number;
  currency: string;     // "INR"
  receipt: string;
  status: 'created' | 'attempted' | 'paid';
  attempts: number;
  created_at: number;
}

export interface CreateOrderParams {
  amountPaise: number;  // total in paise (₹1 = 100 paise)
  receiptId: string;    // your internal order ID
  notes?: Record<string, string>;
}

export async function createRazorpayOrder(params: CreateOrderParams): Promise<RazorpayOrder> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set');
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: 'INR',
      receipt: params.receiptId,
      notes: params.notes ?? {},
      payment_capture: 1,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Razorpay order creation failed: ${err}`);
  }

  return res.json() as Promise<RazorpayOrder>;
}

// ── Webhook Verification ──────────────────────────────────────────────────────

export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret?: string,
): boolean {
  const webhookSecret = secret ?? process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET must be set');
  }

  const expectedSignature = createHmacSha256(body, webhookSecret);
  return expectedSignature === signature;
}

// ── Webhook Event Types ───────────────────────────────────────────────────────

export interface RazorpayWebhookEvent {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        status: string;
        amount: number;
        currency: string;
        method: string;
        email: string;
        contact: string;
        description: string;
        notes: Record<string, string>;
        created_at: number;
      };
    };
    order?: {
      entity: {
        id: string;
        receipt: string;
        status: string;
        amount: number;
        amount_paid: number;
        notes: Record<string, string>;
      };
    };
  };
  created_at: number;
}

export function parseWebhookEvent(body: string): RazorpayWebhookEvent {
  return JSON.parse(body) as RazorpayWebhookEvent;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

import { createHmac } from 'crypto';

function createHmacSha256(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}

// ── Payment Verification ──────────────────────────────────────────────────────

export interface PaymentVerificationResult {
  verified: boolean;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amount: number;
  currency: string;
}

export function verifyPayment(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return false;

  const expected = createHmacSha256(`${orderId}|${paymentId}`, keySecret);
  return expected === signature;
}
