'use client';

/**
 * Cart Icon — shown in the header nav with item count badge.
 * Syncs with localStorage cart via custom 'cart-updated' events.
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCart } from '@/src/lib/orders/cart';

export function CartIcon() {
  const [itemCount, setItemCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  const refresh = () => {
    const cart = getCart();
    const count = cart.items.reduce((s, i) => s + i.quantity, 0);
    setItemCount(count);
  };

  useEffect(() => {
    refresh();
    setMounted(true);
    // Re-sync when cart changes (AddToCartButton dispatches this event)
    window.addEventListener('cart-updated', refresh);
    // Also sync when storage changes from another tab
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dp_cart') refresh();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('cart-updated', refresh);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  if (!mounted) return null;

  return (
    <Link
      href="/cart"
      className="relative flex items-center gap-1 text-sm font-medium hover:text-saffron transition-colors"
      aria-label={`Cart with ${itemCount} items`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
      <span className="hidden sm:inline">टोपली</span>
      {itemCount > 0 && (
        <span className="absolute -top-2 -right-2 sm:static sm:ml-0.5 bg-saffron text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  );
}
