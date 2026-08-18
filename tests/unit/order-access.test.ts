/**
 * Tests for order access control (owner / shareable token / guest email).
 *
 * The same rules gate both the order detail page (app/orders/[id]/page.tsx)
 * and the order detail API (app/api/orders/[id]/route.ts) via
 * canAccessOrder(). A shared link with ?token= works on either surface.
 *
 * Covers TC-ORDER-ACCESS-001 to TC-ORDER-ACCESS-010.
 */

import { describe, test, expect } from 'bun:test';
import { canAccessOrder, computeOrderAccessToken } from '../../src/lib/orders/order-access';

const ORDER = {
  id: 'order-abc-123',
  userId: 'user-owner',
  guestEmail: 'ram@example.com',
};

const otherOrder = { id: 'order-xyz-999', userId: 'user-other', guestEmail: null };

describe('Order access — owner via session', () => {
  test('TC-ORDER-ACCESS-001: the logged-in owner may view the order', () => {
    expect(canAccessOrder({ order: ORDER, sessionUserId: 'user-owner' })).toBe(true);
  });

  test('TC-ORDER-ACCESS-002: a different logged-in user is denied', () => {
    expect(canAccessOrder({ order: ORDER, sessionUserId: 'user-other' })).toBe(false);
  });

  test('TC-ORDER-ACCESS-003: anonymous without token/email is denied', () => {
    expect(canAccessOrder({ order: ORDER, sessionUserId: null })).toBe(false);
  });
});

describe('Order access — shareable token', () => {
  test('TC-ORDER-ACCESS-004: a valid ?token= grants access', () => {
    const token = computeOrderAccessToken(ORDER.id);
    expect(canAccessOrder({ order: ORDER, token })).toBe(true);
  });

  test('TC-ORDER-ACCESS-005: a wrong or missing token is denied', () => {
    expect(canAccessOrder({ order: ORDER, token: 'forged-token' })).toBe(false);
    expect(canAccessOrder({ order: ORDER, token: null })).toBe(false);
  });

  test('TC-ORDER-ACCESS-006: token for one order does not open another order', () => {
    const token = computeOrderAccessToken(ORDER.id);
    expect(canAccessOrder({ order: otherOrder, token })).toBe(false);
  });

  test('TC-ORDER-ACCESS-007: token is deterministic per order and differs between orders', () => {
    expect(computeOrderAccessToken(ORDER.id)).toBe(computeOrderAccessToken(ORDER.id));
    expect(computeOrderAccessToken(ORDER.id)).not.toBe(computeOrderAccessToken(otherOrder.id));
  });
});

describe('Order access — guest email', () => {
  test('TC-ORDER-ACCESS-008: the checkout email grants access (case/space insensitive)', () => {
    expect(canAccessOrder({ order: ORDER, email: 'ram@example.com' })).toBe(true);
    expect(canAccessOrder({ order: ORDER, email: '  RAM@Example.COM ' })).toBe(true);
  });

  test('TC-ORDER-ACCESS-009: a wrong email is denied', () => {
    expect(canAccessOrder({ order: ORDER, email: 'someone-else@example.com' })).toBe(false);
  });

  test('TC-ORDER-ACCESS-010: email only works when the order has a guest email', () => {
    expect(canAccessOrder({ order: otherOrder, email: 'ram@example.com' })).toBe(false);
  });
});
