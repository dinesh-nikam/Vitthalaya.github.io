/**
 * Digital Pandharpur - Global Middleware
 * Applies security headers, CSRF protection, CORS, and request IDs to all responses
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { applySecurityHeaders } from '@/src/lib/security-headers';

// 301 redirect map — old URLs → new URLs
// Add entries as new routes are created during migration
const REDIRECTS: Record<string, string> = {
  '/sant': '/saints',
  '/category': '/explore',
  '/leaderboard': '/community',
};

// CORS configuration
const CORS_CONFIG = {
  origin: '*',
  methods: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  allowedHeaders: 'Content-Type, Authorization, X-API-Key, X-Request-Id',
  maxAge: '86400',
};

// API route matcher
function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

// Handle CORS preflight requests
function handleCorsOptions(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': CORS_CONFIG.origin,
      'Access-Control-Allow-Methods': CORS_CONFIG.methods,
      'Access-Control-Allow-Headers': CORS_CONFIG.allowedHeaders,
      'Access-Control-Max-Age': CORS_CONFIG.maxAge,
    },
  });
}

// Add CORS headers to API responses
function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', CORS_CONFIG.origin);
  response.headers.set('Access-Control-Allow-Methods', CORS_CONFIG.methods);
  response.headers.set('Access-Control-Allow-Headers', CORS_CONFIG.allowedHeaders);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS preflight for API routes
  if (isApiRoute(pathname) && request.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  // Apply 301 redirects for migrated routes
  const redirectTarget = REDIRECTS[pathname];
  if (redirectTarget) {
    const url = request.nextUrl.clone();
    url.pathname = redirectTarget;
    return NextResponse.redirect(url, { status: 301 });
  }

  const response = NextResponse.next();

  // Apply security headers
  applySecurityHeaders(response);

  // Add CORS headers for API routes
  if (isApiRoute(pathname)) {
    addCorsHeaders(response);
  }

  // Generate or propagate request ID for distributed tracing
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  response.headers.set('X-Request-Id', requestId);

  // CSRF protection - same origin check for mutations
  const method = request.method.toUpperCase();
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

  if (isMutation) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host && process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            { error: 'CSRF validation failed. Cross-origin request rejected.' },
            { status: 403 }
          );
        }
      } catch {
        // Invalid origin URL - block in production
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            { error: 'CSRF validation failed. Invalid origin.' },
            { status: 403 }
          );
        }
      }
    }
  }

  return response;
}

// Apply to all routes
export const config = {
  matcher: '/:path*',
};