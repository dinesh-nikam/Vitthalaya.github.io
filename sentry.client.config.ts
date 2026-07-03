/**
 * Sentry Client Configuration
 * Loaded automatically by @sentry/nextjs on the client side.
 *
 * Install: bun add @sentry/nextjs
 * Set SENTRY_DSN in .env to enable.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,

  // Adjust this value in production, or use tracesSampleRate for performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay — captures 10% of sessions in production, 100% in dev
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,

  // Only send errors in production
  enabled:
    process.env.NODE_ENV === 'production' ||
    process.env.NODE_ENV === 'development',

  // Environment tag
  environment: process.env.NODE_ENV || 'development',

  // Don't report these errors
  ignoreErrors: [
    'ResizeObserver loop',
    'Non-Error promise rejection',
    'Network request failed',
  ],
});
