'use client';

/**
 * Add to Cart Button — shown on book detail pages for each edition.
 * Uses the existing localStorage cart from src/lib/orders/cart.ts.
 */
import { useState, useEffect } from 'react';
import { addToCart, getCart } from '@/src/lib/orders/cart';
import type { CartItem } from '@/src/lib/orders/cart';

interface Props {
  publicationId: string;
  editionId: string;
  slug: string;
  titleMarathi: string;
  format: string;
  unitPrice: number;
  pageCount?: number;
}

export function AddToCartButton({
  publicationId,
  editionId,
  slug,
  titleMarathi,
  format,
  unitPrice,
  pageCount,
}: Props) {
  const [inCart, setInCart] = useState(false);

  useEffect(() => {
    const updateInCart = () => {
      const cart = getCart();
      setInCart(cart.items.some((i) => i.editionId === editionId));
    };

    updateInCart();

    window.addEventListener('cart-updated', updateInCart);
    return () => {
      window.removeEventListener('cart-updated', updateInCart);
    };
  }, [editionId]);

  const handleAdd = () => {
    addToCart({
      publicationId,
      editionId,
      slug,
      titleMarathi,
      format: format as CartItem['format'],
      unitPrice,
      pageCount,
    });
    setInCart(true);
    // Dispatch custom event so other components (CartIcon) stay in sync
    window.dispatchEvent(new Event('cart-updated'));
  };

  return (
    <button
      onClick={handleAdd}
      disabled={inCart}
      className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
        inCart
          ? 'bg-green-100 text-green-700 border border-green-300 cursor-default'
          : 'bg-saffron text-white hover:bg-saffron-600 active:scale-[0.98]'
      }`}
      aria-label={inCart ? `Already in cart — ${titleMarathi}` : `Add ${titleMarathi} to cart`}
    >
      {inCart ? (
        <span className="flex items-center justify-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          टोपलीत आहे
        </span>
      ) : (
        <span className="flex items-center justify-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          ₹{unitPrice} — टोपलीत घाला
        </span>
      )}
    </button>
  );
}
