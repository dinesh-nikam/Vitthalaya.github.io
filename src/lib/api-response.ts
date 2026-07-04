/**
 * Shared API Response Types & Utilities
 *
 * Standardizes response formats, error handling, and pagination
 * across all API routes in the Digital Pandharpur project.
 */

import { NextResponse } from 'next/server';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponseSuccess<T> {
  data: T;
  pagination: PaginationParams;
}

export interface ApiResponseList<T> {
  data: T[];
  pagination: PaginationParams;
}

export interface ApiResponseError {
  error: string;
  code?: string;
  details?: Record<string, string>;
}

export interface ApiResponseMessage {
  message: string;
}

export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseError;

// ─── CORS Headers ───────────────────────────────────────────────────────────

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400',
};

export const CACHE_HEADERS = {
  short: 'public, max-age=60',
  medium: 'public, max-age=300',
  long: 'public, max-age=600',
  immutable: 'public, max-age=31536000, immutable',
} as const;

// ─── Response Builders ──────────────────────────────────────────────────────

/**
 * Create a success response with data
 */
export function successResponse<T>(
  data: T,
  pagination: PaginationParams,
  options?: { cache?: string; headers?: Record<string, string> }
): NextResponse {
  return NextResponse.json(
    { data, pagination },
    {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': options?.cache || CACHE_HEADERS.medium,
        ...options?.headers,
      },
    }
  );
}

/**
 * Create a list response with data array
 */
export function listResponse<T>(
  data: T[],
  pagination: PaginationParams,
  options?: { cache?: string; headers?: Record<string, string> }
): NextResponse {
  return NextResponse.json(
    { data, pagination },
    {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': options?.cache || CACHE_HEADERS.medium,
        ...options?.headers,
      },
    }
  );
}

/**
 * Create an error response
 */
export function errorResponse(
  message: string,
  status: number = 500,
  options?: { code?: string; details?: Record<string, string> }
): NextResponse {
  const body: ApiResponseError = {
    error: message,
    ...(options?.code && { code: options.code }),
    ...(options?.details && { details: options.details }),
  };

  return NextResponse.json(body, {
    status,
    headers: CORS_HEADERS,
  });
}

/**
 * Create a message response (e.g., for mutations)
 */
export function messageResponse(
  message: string,
  status: number = 200
): NextResponse {
  return NextResponse.json({ message }, {
    status,
    headers: CORS_HEADERS,
  });
}

/**
 * Create a created response (201)
 */
export function createdResponse<T>(data: T): NextResponse {
  return NextResponse.json(data, {
    status: 201,
    headers: CORS_HEADERS,
  });
}

// ─── Common Errors ──────────────────────────────────────────────────────────

export const ApiErrors = {
  UNAUTHORIZED: (message = 'Unauthorized. Please sign in.') =>
    errorResponse(message, 401, { code: 'UNAUTHORIZED' }),

  FORBIDDEN: (message = 'Forbidden. Access denied.') =>
    errorResponse(message, 403, { code: 'FORBIDDEN' }),

  NOT_FOUND: (message = 'Resource not found.') =>
    errorResponse(message, 404, { code: 'NOT_FOUND' }),

  BAD_REQUEST: (message = 'Invalid request parameters.') =>
    errorResponse(message, 400, { code: 'BAD_REQUEST' }),

  VALIDATION_ERROR: (details: Record<string, string>) =>
    errorResponse('Validation failed', 400, { code: 'VALIDATION_ERROR', details }),

  RATE_LIMITED: (message = 'Rate limited. Try again later.') =>
    errorResponse(message, 429, { code: 'RATE_LIMITED' }),

  INTERNAL_ERROR: (message = 'Internal server error') =>
    errorResponse(message, 500, { code: 'INTERNAL_ERROR' }),
} as const;

// ─── Pagination Helpers ─────────────────────────────────────────────────────

/**
 * Parse pagination from search params with defaults and limits
 */
export function parsePagination(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Create pagination object from counts
 */
export function buildPagination(
  page: number,
  limit: number,
  total: number
): PaginationParams {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

// ─── Type-Safe Prisma Helpers ───────────────────────────────────────────────

/**
 * Type-safe where clause builder
 */
export function buildWhereClause<T extends Record<string, unknown>>(
  base: T,
  ...conditions: Array<[boolean, Record<string, unknown>]>
): T {
  const where = { ...base };
  for (const [condition, clause] of conditions) {
    if (condition) {
      Object.assign(where, clause);
    }
  }
  return where;
}

/**
 * Type-safe select builder
 */
export function buildSelect<T extends Record<string, unknown>>(select: T): T {
  return select;
}

// ─── Input Validation ───────────────────────────────────────────────────────

/**
 * Validate required string fields
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  fields: string[]
): { valid: true; errors: never } | { valid: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = body[field];
    if (!value || typeof value !== 'string') {
      errors[field] = `${field} is required (string)`;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: undefined as never };
}

/**
 * Parse and validate numeric search param
 */
export function parseNumberParam(
  searchParams: URLSearchParams,
  key: string,
  options: { min?: number; max?: number; default: number }
): number {
  const raw = searchParams.get(key);
  if (!raw) return options.default;

  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) return options.default;

  let result = parsed;
  if (options.min !== undefined) result = Math.max(options.min, result);
  if (options.max !== undefined) result = Math.min(options.max, result);

  return result;
}
