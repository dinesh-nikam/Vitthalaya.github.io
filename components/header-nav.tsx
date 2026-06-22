'use client';

/**
 * Header Navigation — renders nav links, cart icon, and orders link.
 */
import { CartIcon } from './cart-icon';

export function HeaderNav() {
  return (
    <nav className="flex items-center gap-4" aria-label="मुख्य नेव्हिगेशन">
      <a href="/books" className="text-sm font-medium hover:text-saffron transition-colors">
        पुस्तके
      </a>
      <a href="/sant" className="text-sm font-medium hover:text-saffron transition-colors">
        संत
      </a>
      <a href="/category" className="text-sm font-medium hover:text-saffron transition-colors">
        श्रेणी
      </a>
      <a href="/festival" className="text-sm font-medium hover:text-saffron transition-colors">
        सण
      </a>
      <a href="/orders" className="text-sm font-medium hover:text-saffron transition-colors">
        ऑर्डर्स
      </a>
      <div className="w-px h-5 bg-gray-200" />
      <CartIcon />
    </nav>
  );
}
