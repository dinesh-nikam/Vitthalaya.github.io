/**
 * Error Tracking Service
 * Simple error tracking with structured logging and optional Sentry integration
 * In production, sends to Sentry if DSN configured, otherwise logs structured errors
 */

interface ErrorContext {
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  [key: string]: unknown;
}

interface TrackedError {
  errorId: string;
  timestamp: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  environment: string;
  service: string;
}

/**
 * Track an error with structured logging
 */
export function trackError(
  error: Error | string,
  context: ErrorContext = {}
): TrackedError {
  const errorId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);
  const message = typeof error === 'string' ? error : error.message;
  const stack = typeof error === 'string' ? undefined : error.stack;

  const trackedError: TrackedError = {
    errorId,
    timestamp: new Date().toISOString(),
    message,
    stack,
    context,
    environment: process.env.NODE_ENV || 'development',
    service: 'digital-pandharpur',
  };

  // Log as JSON for log aggregation
  console.error(JSON.stringify(trackedError));

  // In production, send to Sentry if configured
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    // Placeholder for Sentry integration
    // In real implementation, use @sentry/nextjs
    void fetch(process.env.SENTRY_DSN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trackedError),
      // Fire and forget - don't wait for response
    }).catch(() => {
      // Silently fail on Sentry send
    });
  }

  return trackedError;
}

/**
 * Wrap an async function with error tracking
 */
export function withErrorTracking<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context: ErrorContext = {}
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (err: any) {
      trackError(err, context);
      throw err;
    }
  };
}

/**
 * Get current error tracking status
 */
export function getErrorTrackingStatus(): {
  provider: string;
  configured: boolean;
  dsn?: string;
} {
  return {
    provider: process.env.SENTRY_DSN ? 'sentry' : 'console',
    configured: !!process.env.SENTRY_DSN,
    dsn: process.env.SENTRY_DSN ? 'configured' : undefined,
  };
}