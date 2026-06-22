'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { CartItem } from '../../src/lib/orders/cart';
import { getCart, removeFromCart, updateQuantity, getCartSummary } from '../../src/lib/orders/cart';

export default function CartPage() {
  const [cart, setCart] = useState<ReturnType<typeof getCart>>({ items: [], updatedAt: '' });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCart(getCart());
    setMounted(true);
  }, []);

  const refresh = useCallback(() => {
    setCart({ ...getCart() });
  }, []);

  const handleRemove = (editionId: string) => {
    removeFromCart(editionId);
    refresh();
  };

  const handleQty = (editionId: string, qty: number) => {
    updateQuantity(editionId, qty);
    refresh();
  };

  if (!mounted) return null;

  const { subtotal, itemCount } = getCartSummary(cart);

  return (
    <div className="min-h-screen bg-cream-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-maroon-800 mb-6">खरेदीची टोपली</h1>

        {cart.items.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">तुमची टोपली रिकामी आहे</p>
            <Link href="/books" className="inline-block px-6 py-2 bg-saffron text-white rounded-lg hover:bg-saffron-600">
              पुस्तके ब्राउझ करा
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.items.map((item) => (
              <div key={item.editionId} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Link href={`/books/${item.slug}`} className="font-medium text-maroon-800 hover:text-saffron truncate block">
                    {item.titleMarathi}
                  </Link>
                  <p className="text-sm text-gray-500">{item.format.replace('_', ' ')} · {item.pageCount ?? '-'}p</p>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={() => handleQty(item.editionId, item.quantity - 1)} disabled={item.quantity <= 1}
                    className="w-8 h-8 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30">−</button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button onClick={() => handleQty(item.editionId, item.quantity + 1)}
                    className="w-8 h-8 rounded border border-gray-200 hover:bg-gray-50">+</button>
                </div>

                <div className="text-right min-w-[80px]">
                  <p className="font-semibold">₹{item.unitPrice * item.quantity}</p>
                  <p className="text-xs text-gray-400">₹{item.unitPrice}/pc</p>
                </div>

                <button onClick={() => handleRemove(item.editionId)}
                  className="text-red-400 hover:text-red-600 text-sm">काढा</button>
              </div>
            ))}

            {/* Summary */}
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-3">
              <div className="flex justify-between text-sm"><span>एकूण वस्तू</span><span>{itemCount}</span></div>
              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <span>एकूण रक्कम</span><span>₹{subtotal}</span>
              </div>
              <Link href="/checkout"
                className="block w-full text-center py-3 bg-saffron text-white rounded-lg hover:bg-saffron-600 font-medium transition-colors">
                खरेदी पूर्ण करा →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
