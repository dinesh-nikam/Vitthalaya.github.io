/**
 * Public API v1 — Compositions
 *
 * GET /api/v1/compositions — List compositions with pagination and filters.
 *
 * This is a read-only API for third-party developers.
 * Requires API key via X-API-Key header.
 */

import { NextRequest } from 'next/server';
import { db } from '@/src/db/client';
import { Prisma } from '@prisma/client';
import {
  listResponse,
  errorResponse,
  parsePagination,
  buildPagination,
  CACHE_HEADERS,
} from '@/src/lib/api-response';
import { authenticateRequest, addRateLimitHeaders } from '@/src/lib/api-auth';

// ─── GET /api/v1/compositions ──────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Authenticate API key and check rate limits
  const auth = authenticateRequest(request);
  if ('error' in auth) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);
  const type = searchParams.get('type');
  const saint = searchParams.get('saint');
  const deity = searchParams.get('deity');
  const q = searchParams.get('q');

  // Build type-safe where clause
  const where: Prisma.CompositionWhereInput = {
    reviewed: true,
    ...(type && { type }),
    ...(saint && { saint: { slug: saint } }),
    ...(deity && {
      deity: { nameTranslit: { contains: deity, mode: 'insensitive' } },
    }),
    ...(q && {
      OR: [
        { titleMarathi: { contains: q, mode: 'insensitive' } },
        { titleTranslit: { contains: q, mode: 'insensitive' } },
      ],
    }),
  };

  try {
    const [compositions, total] = await Promise.all([
      db.composition.findMany({
        where,
        select: {
          id: true,
          titleMarathi: true,
          titleTranslit: true,
          type: true,
          slug: true,
          saint: { select: { nameMarathi: true, slug: true } },
          deity: { select: { nameMarathi: true, nameTranslit: true } },
          meaning: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.composition.count({ where }),
    ]);

    const pagination = buildPagination(page, limit, total);
    const response = listResponse(compositions, pagination, {
      cache: CACHE_HEADERS.medium,
    });

    return addRateLimitHeaders(response, auth.keyInfo.rateLimit, new Date(Date.now() + 60000));
  } catch (err) {
    console.error('[API/v1/compositions] Error:', err);
    return errorResponse('Failed to fetch compositions', 500);
  }
}
