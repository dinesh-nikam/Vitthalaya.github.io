/**
 * Cart Service — manages shopping cart state.
 *
 * Cart is stored in localStorage for anonymous users.
 * Logged-in users can sync cart to server (Phase 2: POST /api/cart/sync).
 */

import type { BookFormat } from '../../book-generation/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  publicationId: string;
  slug: string;
  titleMarathi: string;
  editionId: string;
  format: BookFormat;
  unitPrice: number;
  quantity: number;
  pageCount?: number;
  coverColor?: string;
  dedicationText?: string;
}

export interface Cart {
  items: CartItem[];
  updatedAt: string;
}

const STORAGE_KEY = 'dp_cart';

// ── LocalStorage Cart ─────────────────────────────────────────────────────────

function readCart(): Cart {
  if (typeof window === 'undefined') return { items: [], updatedAt: new Date().toISOString() };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Cart;
  } catch {
    // Corrupted cart — reset
  }
  return { items: [], updatedAt: new Date().toISOString() };
}

function writeCart(cart: Cart): void {
  cart.updatedAt = new Date().toISOString();
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }
}

// ── Cart Operations ───────────────────────────────────────────────────────────

export function getCart(): Cart {
  return readCart();
}

export function addToCart(item: Omit<CartItem, 'quantity'>): Cart {
  const cart = readCart();
  const existing = cart.items.find(
    (i) => i.publicationId === item.publicationId && i.editionId === item.editionId,
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.items.push({ ...item, quantity: 1 });
  }

  writeCart(cart);
  return cart;
}

export function removeFromCart(editionId: string): Cart {
  const cart = readCart();
  cart.items = cart.items.filter((i) => i.editionId !== editionId);
  writeCart(cart);
  return cart;
}

export function updateQuantity(editionId: string, quantity: number): Cart {
  const cart = readCart();
  const item = cart.items.find((i) => i.editionId === editionId);
  if (item) {
    item.quantity = Math.max(1, quantity);
  }
  writeCart(cart);
  return cart;
}

export function clearCart(): void {
  writeCart({ items: [], updatedAt: new Date().toISOString() });
}

export function getCartSummary(cart: Cart): { subtotal: number; itemCount: number } {
  const subtotal = cart.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  return { subtotal, itemCount };
}
