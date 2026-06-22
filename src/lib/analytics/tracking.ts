/**
 * Analytics & Conversion Tracking.
 *
 * Lightweight analytics event logging for book commerce funnel tracking.
 * Logs events to console in dev; in production, replace with GA4 / Plausible / PostHog.
 */

export type AnalyticsEvent =
  | { type: 'page_view'; page: string; referrer?: string; timestamp: number }
  | { type: 'book_view'; bookId: string; bookTitle: string; timestamp: number }
  | { type: 'add_to_cart'; bookId: string; editionId: string; price: number; currency: string; timestamp: number }
  | { type: 'remove_from_cart'; bookId: string; timestamp: number }
  | { type: 'checkout_start'; cartTotal: number; itemCount: number; timestamp: number }
  | { type: 'checkout_complete'; orderId: string; total: number; currency: string; timestamp: number }
  | { type: 'payment_initiated'; orderId: string; gateway: 'razorpay' | 'stripe'; timestamp: number }
  | { type: 'payment_success'; orderId: string; razorpayPaymentId?: string; timestamp: number }
  | { type: 'payment_failed'; orderId: string; error: string; timestamp: number }
  | { type: 'book_generated'; bookId: string; bookType: string; compositionCount: number; timestamp: number }
  | { type: 'book_preview_3d'; bookId: string; timestamp: number }
  | { type: 'book_export'; bookId: string; format: string; timestamp: number }
  | { type: 'subscription_started'; orderId: string; plan: string; timestamp: number }
  | { type: 'search'; query: string; resultsCount: number; timestamp: number }
  | { type: 'error'; context: string; message: string; timestamp: number };

const IS_DEV = process.env.NODE_ENV === 'development';

/**
 * Log an analytics event.
 * In development: writes to console.table for debugging.
 * In production: sends to analytics endpoint.
 */
export function trackEvent(event: AnalyticsEvent): void {
  if (IS_DEV) {
    console.log('[Analytics]', event.type, JSON.stringify(event));
    return;
  }

  // Production: fire-and-forget to internal analytics API
  try {
    const payload = JSON.stringify(event);
    fetch('/api/internal/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    }).catch(() => {
      // Silent fail — analytics must never break the app
    });
  } catch {
    // Silent fail
  }
}

/**
 * Higher-order function that returns a page view tracker for Next.js pages.
 * Call from useEffect in client components.
 */
export function usePageView(page: string) {
  if (typeof window !== 'undefined') {
    const referrer = document.referrer || undefined;
    // Use requestIdleCallback for non-blocking tracking
    const send = () => {
      trackEvent({ type: 'page_view', page, referrer, timestamp: Date.now() });
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(send, { timeout: 1000 });
    } else {
      setTimeout(send, 0);
    }
  }
}

/**
 * Track a book view event.
 */
export function trackBookView(bookId: string, bookTitle: string): void {
  trackEvent({ type: 'book_view', bookId, bookTitle, timestamp: Date.now() });
}

/**
 * Track add-to-cart.
 */
export function trackAddToCart(
  bookId: string,
  editionId: string,
  price: number,
  currency: string = 'INR',
): void {
  trackEvent({
    type: 'add_to_cart',
    bookId,
    editionId,
    price,
    currency,
    timestamp: Date.now(),
  });
}

/**
 * Track checkout completion.
 */
export function trackCheckoutComplete(orderId: string, total: number, currency: string = 'INR'): void {
  trackEvent({
    type: 'checkout_complete',
    orderId,
    total,
    currency,
    timestamp: Date.now(),
  });
}

/**
 * Track payment success.
 */
export function trackPaymentSuccess(orderId: string, razorpayPaymentId?: string): void {
  trackEvent({
    type: 'payment_success',
    orderId,
    razorpayPaymentId,
    timestamp: Date.now(),
  });
}
