/**
 * Public API v1 — Wari Pilgrimage Stops
 *
 * GET /api/v1/wari/stops — Ordered pilgrimage route stops with cursor pagination.
 * Requires API key via X-API-Key header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { authenticateRequest, addRateLimitHeaders } from '@/src/lib/api-auth';
import {
  ApiErrors,
  errorResponse,
  CORS_HEADERS,
  CACHE_HEADERS,
} from '@/src/lib/api-response';
import {
  listWariStopsQuerySchema,
  decodeWariStopCursor,
  encodeWariStopCursor,
} from './schema';

export async function GET(request: NextRequest) {
  // 1. Authenticate API key & rate limit check
  const auth = authenticateRequest(request);
  if ('error' in auth) {
    return auth.error;
  }

  // 2. Validate query parameters
  const { searchParams } = new URL(request.url);
  const rawParams = Object.fromEntries(searchParams.entries());
  const parsed = listWariStopsQuerySchema.safeParse(rawParams);

  if (!parsed.success) {
    return ApiErrors.VALIDATION_ERROR(
      Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join('.') || 'query', i.message])
      )
    );
  }

  const { sort, minDistance, maxDistance, limit, cursor } = parsed.data;

  // 3. Distance filter constraints
  const where: any = {};
  if (minDistance !== undefined || maxDistance !== undefined) {
    where.distanceKm = {
      ...(minDistance !== undefined && { gte: minDistance }),
      ...(maxDistance !== undefined && { lte: maxDistance }),
    };
  }

  // 4. Cursor decoding
  if (cursor) {
    const decoded = decodeWariStopCursor(cursor);
    if (!decoded) {
      return errorResponse('Malformed cursor token.', 400, {
        code: 'INVALID_CURSOR',
      });
    }

    if (sort === 'asc') {
      where.OR = [
        { sortOrder: { gt: decoded.sortOrder } },
        { sortOrder: decoded.sortOrder, id: { gt: decoded.id } },
      ];
    } else {
      where.OR = [
        { sortOrder: { lt: decoded.sortOrder } },
        { sortOrder: decoded.sortOrder, id: { lt: decoded.id } },
      ];
    }
  }

  try {
    const stops = await db.wariStop.findMany({
      where,
      orderBy: [{ sortOrder: sort }, { id: sort }],
      take: limit + 1,
      select: {
        id: true,
        nameMarathi: true,
        nameTranslit: true,
        slug: true,
        distanceKm: true,
        description: true,
        icon: true,
        sortOrder: true,
        createdAt: true,
      },
    });

    const hasNext = stops.length > limit;
    const items = hasNext ? stops.slice(0, limit) : stops;
    const lastItem = items[items.length - 1];

    const nextCursor =
      hasNext && lastItem
        ? encodeWariStopCursor(lastItem.sortOrder, lastItem.id)
        : null;

    const currentUrl = new URL(request.url);
    const nextUrl = nextCursor
      ? (() => {
          const u = new URL(request.url);
          u.searchParams.set('cursor', nextCursor);
          return u.toString();
        })()
      : null;

    const response = NextResponse.json(
      {
        data: items,
        meta: {
          limit,
          has_next: hasNext,
          next_cursor: nextCursor,
          total_returned: items.length,
        },
        links: {
          self: currentUrl.toString(),
          next: nextUrl,
        },
      },
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Cache-Control': CACHE_HEADERS.long,
        },
      }
    );

    return addRateLimitHeaders(
      response,
      auth.keyInfo.rateLimit,
      new Date(Date.now() + 60000)
    );
  } catch (err) {
    console.error('[API/v1/wari/stops] Error:', err);
    return errorResponse('Internal server error', 500, { code: 'INTERNAL_ERROR' });
  }
}
