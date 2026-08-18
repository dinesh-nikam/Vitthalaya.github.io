/**
 * Digital Pandharpur — Order Access Control
 *
 * An order may be viewed by:
 *   1. The logged-in user who placed it (order.userId === session userId), or
 *   2. Anyone holding the shareable link token `?token=` — a deterministic
 *      HMAC-SHA256 of the order id keyed by NEXTAUTH_SECRET, computed by
 *      computeOrderAccessToken() and returned by /api/orders/create, or
 *   3. A guest supplying the email used at checkout (`?email=`), matched
 *      case-insensitively — the same guest-lookup model used by GET /api/orders.
 *
 * Both the order detail page (app/orders/[id]/page.tsx) and the order detail
 * API (app/api/orders/[id]/route.ts) enforce these rules, so a shared link
 * works identically on either surface.
 */

import { createHmac } from 'crypto';

export interface OrderAccessSubject {
  id: string;
  userId: string | null;
  guestEmail: string | null;
}

export interface OrderAccessContext {
  order: OrderAccessSubject;
  sessionUserId?: string | null;
  token?: string | null;
  email?: string | null;
}

/**
 * Deterministic share token for an order: HMAC-SHA256(orderId) keyed by
 * NEXTAUTH_SECRET. Anyone with `?token=` on the order URL may view it.
 *
 * When NEXTAUTH_SECRET is unset (local development only — the db client
 * warns loudly about this in production) a fixed fallback is used so dev
 * links still work; the fallback must never be relied on in production.
 */
export function computeOrderAccessToken(orderId: string): string {
  const secret = process.env.NEXTAUTH_SECRET || 'guest-secret-key';
  return createHmac('sha256', secret).update(orderId).digest('hex');
}

/**
 * True when the viewer (session user, link token, or guest email) may access
 * the order. Pure and testable — no DB or network access.
 */
export function canAccessOrder(context: OrderAccessContext): boolean {
  const { order, sessionUserId, token, email } = context;

  // 1. Logged-in owner
  if (sessionUserId && order.userId && sessionUserId === order.userId) {
    return true;
  }

  // 2. Shareable link token (?token=)
  if (token && order.id && token === computeOrderAccessToken(order.id)) {
    return true;
  }

  // 3. Guest supplying the checkout email (?email=), case-insensitive
  if (order.guestEmail && email && order.guestEmail.toLowerCase() === email.trim().toLowerCase()) {
    return true;
  }

  return false;
}
