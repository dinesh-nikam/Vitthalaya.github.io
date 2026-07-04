/**
 * Public API v1 — Saints
 *
 * GET /api/v1/saints — List all saints with pagination.
 *
 * This is a read-only API for third-party developers.
 * Requires API key via X-API-Key header.
 */

import { NextRequest } from 'next/server';
import { db } from '@/src/db/client';
import {
  listResponse,
  errorResponse,
  parsePagination,
  buildPagination,
  CACHE_HEADERS,
} from '@/src/lib/api-response';
import { authenticateRequest, addRateLimitHeaders } from '@/src/lib/api-auth';

// ─── GET /api/v1/saints ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Authenticate API key and check rate limits
  const auth = authenticateRequest(request);
  if ('error' in auth) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);

  try {
    const [saints, total] = await Promise.all([
      db.saint.findMany({
        select: {
          id: true,
          nameMarathi: true,
          nameTranslit: true,
          slug: true,
          birthPlace: true,
          photoUrl: true,
          _count: { select: { compositions: true } },
        },
        orderBy: { nameMarathi: 'asc' },
        skip,
        take: limit,
      }),
      db.saint.count(),
    ]);

    // Transform to API format
    const data = saints.map((s) => ({
      id: s.id,
      nameMarathi: s.nameMarathi,
      nameTranslit: s.nameTranslit,
      slug: s.slug,
      birthPlace: s.birthPlace,
      photoUrl: s.photoUrl,
      compositionCount: s._count.compositions,
    }));

    const pagination = buildPagination(page, limit, total);
    const response = listResponse(data, pagination, {
      cache: CACHE_HEADERS.long,
    });

    return addRateLimitHeaders(response, auth.keyInfo.rateLimit, new Date(Date.now() + 60000));
  } catch (err) {
    console.error('[API/v1/saints] Error:', err);
    return errorResponse('Failed to fetch saints', 500);
  }
}
