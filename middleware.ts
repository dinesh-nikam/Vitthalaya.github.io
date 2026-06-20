/**
 * Digital Pandharpur - Global Middleware
 * Applies security headers and CSRF protection to all responses
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { applySecurityHeaders } from '@/src/lib/security-headers';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Apply security headers
  applySecurityHeaders(response);

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
          response.headers.set('X-CSRF-Rejected', 'true');
        }
      } catch {
        // Invalid origin URL - block in production
        if (process.env.NODE_ENV === 'production') {
          response.headers.set('X-CSRF-Rejected', 'true');
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