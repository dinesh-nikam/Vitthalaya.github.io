/**
 * API Key Authentication & Rate Limiting
 *
 * Provides API key validation and rate limiting for public API endpoints.
 * Used by /api/v1/* routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from './api-response';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ApiKeyInfo {
  key: string;
  name: string;
  rateLimit: number; // requests per minute
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

// ─── API Key Store (In-Memory for Demo) ─────────────────────────────────────

// In production, this would be in Redis or a database
const API_KEYS = new Map<string, ApiKeyInfo>();

// Rate limit tracking: key -> { count, resetAt }
const RATE_LIMITS = new Map<string, { count: number; resetAt: Date }>();

// ─── API Key Management ─────────────────────────────────────────────────────

/**
 * Register a new API key (admin only)
 */
export function registerApiKey(
  key: string,
  name: string,
  rateLimit: number = 60
): ApiKeyInfo {
  const info: ApiKeyInfo = {
    key,
    name,
    rateLimit,
    createdAt: new Date(),
  };
  API_KEYS.set(key, info);
  return info;
}

/**
 * Validate an API key
 */
export function validateApiKey(key: string): ApiKeyInfo | null {
  const info = API_KEYS.get(key);
  if (!info) return null;

  // Update last used
  info.lastUsedAt = new Date();
  return info;
}

// ─── Per-User Rate Limiting (session-authenticated routes) ──────────────────

// In production this would live in Redis (see src/lib/auth-rate-limit.ts)
const USER_RATE_LIMITS = new Map<string, { count: number; resetAt: Date }>();

/**
 * Check rate limit for a user id.
 *
 * Mirrors checkRateLimit but keys the in-memory window by the session
 * user id, for routes that authenticate via getServerSession instead of
 * an X-API-Key header (e.g. /api/acquire/upload and the correction route).
 *
 * `scope` names the bucket (e.g. 'upload' vs 'correction') so different
 * routes on the same user keep independent windows — same prefixed-key
 * convention as src/lib/auth-rate-limit.ts ('auth:attempts:<id>').
 */
export function checkUserRateLimit(
  userId: string,
  limit: number,
  scope: string = 'default'
): RateLimitResult {
  const key = `${scope}:${userId}`;
  const now = new Date();
  const record = USER_RATE_LIMITS.get(key);

  // No record or expired window
  if (!record || now > record.resetAt) {
    const resetAt = new Date(now.getTime() + 60 * 1000); // 1 minute window
    USER_RATE_LIMITS.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt,
    };
  }

  // Within window
  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  // Increment count
  record.count++;
  return {
    allowed: true,
    remaining: limit - record.count,
    resetAt: record.resetAt,
  };
}

/**
 * Build the 429 response for an exceeded limit, with Retry-After (seconds
 * until the window resets) and X-RateLimit-* headers so clients know when
 * to retry.
 */
export function rateLimitExceededResponse(resetAt: Date): NextResponse {
  const response = errorResponse('Rate limit exceeded. Try again later.', 429, {
    code: 'RATE_LIMITED',
  });
  const retryAfter = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
  response.headers.set('Retry-After', String(retryAfter));
  response.headers.set('X-RateLimit-Remaining', '0');
  response.headers.set('X-RateLimit-Reset', resetAt.toISOString());
  return response;
}

/**
 * Full per-user check: returns the 429 response when the limit is exceeded,
 * or null when the request may proceed. `scope` names the per-route bucket.
 */
export function enforceUserRateLimit(
  userId: string,
  limit: number,
  scope: string = 'default'
): NextResponse | null {
  const result = checkUserRateLimit(userId, limit, scope);
  if (!result.allowed) {
    return rateLimitExceededResponse(result.resetAt);
  }
  return null;
}

// ─── Rate Limiting ──────────────────────────────────────────────────────────

/**
 * Check rate limit for an API key
 */
export function checkRateLimit(key: string, limit: number): RateLimitResult {
  const now = new Date();
  const record = RATE_LIMITS.get(key);

  // No record or expired window
  if (!record || now > record.resetAt) {
    const resetAt = new Date(now.getTime() + 60 * 1000); // 1 minute window
    RATE_LIMITS.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt,
    };
  }

  // Within window
  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  // Increment count
  record.count++;
  return {
    allowed: true,
    remaining: limit - record.count,
    resetAt: record.resetAt,
  };
}

// ─── Authentication Middleware ───────────────────────────────────────────────

/**
 * Extract and validate API key from request
 */
export function authenticateApiKey(
  request: NextRequest
): { valid: true; keyInfo: ApiKeyInfo } | { valid: false; response: ReturnType<typeof errorResponse> } {
  const apiKey = request.headers.get('X-API-Key');

  if (!apiKey) {
    return {
      valid: false,
      response: errorResponse('Missing API key. Provide X-API-Key header.', 401, {
        code: 'MISSING_API_KEY',
      }),
    };
  }

  const keyInfo = validateApiKey(apiKey);
  if (!keyInfo) {
    return {
      valid: false,
      response: errorResponse('Invalid API key.', 401, {
        code: 'INVALID_API_KEY',
      }),
    };
  }

  return { valid: true, keyInfo };
}

/**
 * Check rate limit and return error if exceeded
 */
export function checkRateLimitOrError(
  request: NextRequest,
  keyInfo: ApiKeyInfo
): ReturnType<typeof errorResponse> | null {
  const rateLimitResult = checkRateLimit(keyInfo.key, keyInfo.rateLimit);

  if (!rateLimitResult.allowed) {
    return errorResponse('Rate limit exceeded. Try again later.', 429, {
      code: 'RATE_LIMITED',
    });
  }

  return null; // Allowed
}

// ─── Convenience Function ───────────────────────────────────────────────────

/**
 * Full authentication + rate limit check
 * Returns null if OK, or error response if not
 */
export function authenticateRequest(
  request: NextRequest
): { keyInfo: ApiKeyInfo } | { error: ReturnType<typeof errorResponse> } {
  const authResult = authenticateApiKey(request);
  if (!authResult.valid) {
    return { error: authResult.response };
  }

  const rateLimitError = checkRateLimitOrError(request, authResult.keyInfo);
  if (rateLimitError) {
    return { error: rateLimitError };
  }

  return { keyInfo: authResult.keyInfo };
}

// ─── Development Keys ───────────────────────────────────────────────────────

// Pre-register development keys
if (process.env.NODE_ENV === 'development') {
  registerApiKey('dev-key-change-in-production', 'Development Key', 1000);
}

// ─── Utility: Add Rate Limit Headers ────────────────────────────────────────

/**
 * Add rate limit headers to response (preserves the concrete Response type)
 */
export function addRateLimitHeaders<T extends Response>(
  response: T,
  remaining: number,
  resetAt: Date
): T {
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', resetAt.toISOString());
  return response;
}
