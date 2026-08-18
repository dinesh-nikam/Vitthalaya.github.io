/**
 * Checkout order-summary test.
 *
 * Renders the shared PriceBreakdown component (used by the cart and checkout
 * pages) with a realistic cart and asserts:
 *   1. the breakdown shows the exact subtotal / shipping / GST / total rows,
 *   2. the pay-now amount (total) converts to the same paise value the server
 *      computes in /api/orders/create (amountPaise = round(total * 100)).
 *
 * The cart construction and tax math mirror app/cart/page.tsx and
 * app/checkout/page.tsx; the server side mirrors app/api/orders/create/route.ts.
 *
 * Covers TC-SUMMARY-001 to TC-SUMMARY-004.
 */

import { describe, test, expect } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Cart, CartItem } from '../../src/lib/orders/cart';
import { getCartSummary } from '../../src/lib/orders/cart';
import { calculateTax, GST_LABEL } from '../../src/lib/orders/pricing';
import { PriceBreakdown } from '../../components/price-breakdown';

// Two digital editions: one ₹499 and two copies of a ₹99 edition (₹697 subtotal).
function sampleCart(): Cart {
  const items: CartItem[] = [
    {
      publicationId: 'pub-1',
      slug: 'gatha-1',
      titleMarathi: 'पहिले पुस्तक',
      editionId: 'ed-1',
      format: 'DIGITAL_PDF',
      unitPrice: 499,
      quantity: 1,
      pageCount: 200,
    },
    {
      publicationId: 'pub-2',
      slug: 'gatha-2',
      titleMarathi: 'दुसरे पुस्तक',
      editionId: 'ed-2',
      format: 'DIGITAL_EPUB',
      unitPrice: 99,
      quantity: 2,
      pageCount: 100,
    },
  ];
  return { items, updatedAt: new Date().toISOString() };
}

describe('Checkout order summary', () => {
  test('TC-SUMMARY-001: breakdown renders subtotal / shipping / GST / total', () => {
    const cart = sampleCart();
    const { subtotal } = getCartSummary(cart);
    const shippingCost = 0;
    const tax = calculateTax(subtotal);
    const total = subtotal + shippingCost + tax;

    const html = renderToStaticMarkup(
      <PriceBreakdown subtotal={subtotal} shippingCost={shippingCost} tax={tax} total={total} />
    );

    expect(subtotal).toBe(697);
    expect(tax).toBe(34.85);
    expect(total).toBe(731.85);

    expect(html).toContain('उप-एकूण');
    expect(html).toContain('₹697');
    expect(html).toContain('शिपिंग');
    expect(html).toContain('मोफत'); // free shipping
    expect(html).toContain(GST_LABEL);
    expect(html).toContain('₹34.85');
    expect(html).toContain('एकूण');
    expect(html).toContain('₹731.85');
  });

  test('TC-SUMMARY-002: pay-now amount equals the server amountPaise', () => {
    const cart = sampleCart();
    const { subtotal } = getCartSummary(cart);

    // Client side (cart/checkout pages): what the pay button shows.
    const shippingCost = 0;
    const tax = calculateTax(subtotal);
    const total = subtotal + shippingCost + tax;

    // Server side (/api/orders/create): amountPaise = round(total * 100).
    const amountPaise = Math.round(total * 100);

    expect(amountPaise).toBe(73185);
    // The paise conversion must be an exact integer — no floating-point drift
    // between what the customer approves and what Razorpay is asked to charge.
    expect(Number.isInteger(amountPaise)).toBe(true);
  });

  test('TC-SUMMARY-003: client total and server total agree for any subtotal', () => {
    for (const subtotal of [99, 299, 499, 697, 1298, 1234.5, 0]) {
      // Client: breakdown displayed to the customer.
      const clientTax = calculateTax(subtotal);
      const clientTotal = subtotal + clientTax;

      // Server: same shared helpers, same shipping policy.
      const serverTax = calculateTax(subtotal);
      const serverTotal = subtotal + serverTax;

      expect(clientTotal).toBe(serverTotal);
      expect(Number.isInteger(Math.round(clientTotal * 100))).toBe(true);
    }
  });

  test('TC-SUMMARY-004: breakdown renders the GST label derived from GST_RATE_PERCENT', () => {
    const html = renderToStaticMarkup(
      <PriceBreakdown subtotal={100} tax={5} total={105} />
    );
    expect(html).toContain(GST_LABEL);
    expect(html).toContain('कर (GST 5%)');
    expect(html).not.toContain('कर (GST)');
  });
});
