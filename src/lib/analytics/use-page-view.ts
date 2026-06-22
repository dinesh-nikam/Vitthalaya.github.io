/**
 * usePageView — client-side analytics hook for Next.js pages.
 *
 * Tracks page views automatically on mount and on path change.
 * Sends to the internal analytics API (fire-and-forget).
 */

'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface PageViewOptions {
  /** Custom event type (default: page_view) */
  eventType?: string;
  /** Additional metadata to include */
  metadata?: Record<string, unknown>;
  /** Don't track in development */
  skipDev?: boolean;
  /** Don't track this specific page */
  skip?: boolean;
}

/**
 * Hook that tracks page views.
 * Place in layout.tsx to track all pages automatically, or in individual pages.
 */
export function usePageView(options: PageViewOptions = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPath = useRef('');

  const { eventType = 'page_view', metadata = {}, skipDev = true, skip = false } = options;

  useEffect(() => {
    if (skip) return;
    if (skipDev && process.env.NODE_ENV === 'development') return;

    const currentPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    if (currentPath === lastPath.current) return;
    lastPath.current = currentPath;

    // Delay slightly to ensure page is fully loaded
    const id = setTimeout(() => {
      try {
        const payload = JSON.stringify({
          eventType,
          page: currentPath,
          referrer: document.referrer || undefined,
          metadata: {
            ...metadata,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
          },
        });

        // Use sendBeacon for reliable delivery during page unload
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon('/api/analytics/track', blob);
        } else {
          fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        // Silent — analytics never breaks the app
      }
    }, 300);

    return () => clearTimeout(id);
  }, [pathname, searchParams, eventType, metadata, skipDev, skip]);
}
