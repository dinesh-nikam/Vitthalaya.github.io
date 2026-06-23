/**
 * Security Headers Middleware for Digital Pandharpur
 * Adds CSP, HSTS, X-Frame-Options, and other security headers.
 */

import type { NextResponse } from 'next/server';

/**
 * Security headers to apply to all responses
 */
const SECURITY_HEADERS: Record<string, string> = {
  // Content Security Policy - restrict script sources
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net", // unsafe-inline needed for Next.js inline scripts
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
    // Allow Google Fonts stylesheet + gstatic font files, plus Google APIs used server-side
    "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://generativelanguage.googleapis.com https://vision.googleapis.com https://www.googleapis.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),


  // HTTP Strict Transport Security - enforce HTTPS
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // XSS Protection (legacy browsers)
  'X-XSS-Protection': '1; mode=block',

  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions Policy - disable unnecessary browser features
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
  ].join(', '),
};

/**
 * Apply security headers to a NextResponse
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }
  return response;
}

/**
 * Check if the request is secure (HTTPS) in production
 */
export function isSecureRequest(headers: Headers): boolean {
  const forwardedProto = headers.get('x-forwarded-proto');
  const host = headers.get('host') || '';

  // If behind proxy with x-forwarded-proto
  if (forwardedProto) {
    return forwardedProto === 'https';
  }

  // Default check
  return process.env.NODE_ENV === 'production' && (!host.startsWith('localhost') && !host.startsWith('127.0.0.1'));
}