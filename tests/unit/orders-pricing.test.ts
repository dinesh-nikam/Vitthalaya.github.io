/**
 * Tests for the checkout unit-price contract.
 *
 * The price a customer pays is decided by getUnitPrice() — the single source
 * of truth shared by the book detail page (what the customer sees), the cart,
 * and /api/orders/create (what gets charged). These tests lock in that the
 * charged amount always matches the displayed amount.
 *
 * Covers TC-ORDER-PRICE-001 to TC-ORDER-PRICE-008.
 */

import { describe, test, expect } from 'bun:test';
import { getUnitPrice, calculateTax, GST_RATE, GST_RATE_PERCENT, GST_LABEL } from '../../src/lib/orders/pricing';

describe('Unit price contract — getUnitPrice', () => {
  test('TC-ORDER-PRICE-001: explicit edition price always wins', () => {
    expect(getUnitPrice(499, 'DIGITAL_PDF')).toBe(499);
    expect(getUnitPrice(1299, 'PRINT_PAPERBACK')).toBe(1299);
  });

  test('TC-ORDER-PRICE-002: string price is converted to a number', () => {
    expect(getUnitPrice('349', 'DIGITAL_EPUB')).toBe(349);
  });

  test('TC-ORDER-PRICE-003: Prisma Decimal (toNumber shape) is supported', () => {
    const decimal = { toNumber: () => 449 };
    expect(getUnitPrice(decimal, 'PRINT_HARDCOVER')).toBe(449);
  });

  test('TC-ORDER-PRICE-004: null price falls back to the DIGITAL default (₹99)', () => {
    expect(getUnitPrice(null, 'DIGITAL_PDF')).toBe(99);
    expect(getUnitPrice(null, 'DIGITAL_KINDLE')).toBe(99);
  });

  test('TC-ORDER-PRICE-005: undefined price falls back to the DIGITAL default (₹99)', () => {
    expect(getUnitPrice(undefined, 'DIGITAL_EPUB')).toBe(99);
  });

  test('TC-ORDER-PRICE-006: no price on a print edition defaults to ₹299', () => {
    expect(getUnitPrice(null, 'PRINT_PAPERBACK')).toBe(299);
    expect(getUnitPrice(undefined, 'PRINT_COLLECTOR')).toBe(299);
  });

  test('TC-ORDER-PRICE-007: a zero price is preserved (free temple editions)', () => {
    expect(getUnitPrice(0, 'DIGITAL_PDF')).toBe(0);
    expect(getUnitPrice({ toNumber: () => 0 }, 'DIGITAL_PDF')).toBe(0);
  });

  test('TC-ORDER-PRICE-008: invalid price falls back to the format default', () => {
    expect(getUnitPrice(NaN, 'DIGITAL_PDF')).toBe(99);
    expect(getUnitPrice('not-a-number', 'PRINT_PAPERBACK')).toBe(299);
  });
});

describe('GST tax — checkout breakdown contract', () => {
  test('TC-ORDER-PRICE-009: 5% GST is rounded to paise', () => {
    expect(calculateTax(499)).toBe(24.95);
    expect(calculateTax(99)).toBe(4.95);
  });

  test('TC-ORDER-PRICE-010: zero subtotal has zero tax', () => {
    expect(calculateTax(0)).toBe(0);
  });

  test('TC-ORDER-PRICE-011: checkout total equals subtotal + GST (free shipping)', () => {
    const subtotal = 99 * 2 + 499; // two ₹99 editions + one ₹499 = ₹697
    expect(calculateTax(subtotal)).toBe(34.85);
    expect(subtotal + calculateTax(subtotal)).toBe(731.85);
  });
});

describe('GST rate — single source of truth', () => {
  test('TC-ORDER-PRICE-012: rate and percentage stay consistent', () => {
    expect(GST_RATE_PERCENT).toBe(5);
    expect(GST_RATE).toBe(GST_RATE_PERCENT / 100);
    expect(GST_RATE).toBe(0.05);
  });

  test('TC-ORDER-PRICE-013: UI label derives from the rate', () => {
    expect(GST_LABEL).toBe(`कर (GST ${GST_RATE_PERCENT}%)`);
    expect(GST_LABEL).toBe('कर (GST 5%)');
  });
});
