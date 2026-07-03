/**
 * Digital Pandharpur - Global Middleware
 * Applies security headers, CSRF protection, and request IDs to all responses
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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