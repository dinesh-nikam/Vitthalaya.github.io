/**
 * Public API v1 — Single Saint with Compositions
 *
 * GET /api/v1/saints/:slug — Saint detail + recent compositions.
 * Requires API key via X-API-Key header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/src/db/client';
import { authenticateRequest, addRateLimitHeaders } from '@/src/lib/api-auth';
import {
  errorResponse,
  CORS_HEADERS,
  CACHE_HEADERS,
  ApiErrors,
} from '@/src/lib/api-response';

const paramsSchema = z.object({
  slug: z.string().trim().min(1, 'Slug is required'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  // 1. Authenticate API key and enforce rate limits
  const auth = authenticateRequest(request);
  if ('error' in auth) {
    return auth.error;
  }

  // 2. Validate route parameters
  const rawParams = await params;
  const parsed = paramsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return ApiErrors.VALIDATION_ERROR(
      Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join('.') || 'slug', i.message])
      )
    );
  }

  const slug = decodeURIComponent(parsed.data.slug);

  try {
    const saint = await db.saint.findUnique({
      where: { slug },
      select: {
        id: true,
        nameMarathi: true,
        nameTranslit: true,
        slug: true,
        biography: true,
        birthPlace: true,
        deathPlace: true,
        birthDate: true,
        photoUrl: true,
        compositions: {
          where: { reviewed: true },
          select: {
            id: true,
            titleMarathi: true,
            titleTranslit: true,
            type: true,
            slug: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        _count: { select: { compositions: true } },
      },
    });

    if (!saint) {
      return ApiErrors.NOT_FOUND('Saint not found');
    }

    const response = NextResponse.json(
      {
        data: {
          ...saint,
          compositionCount: saint._count.compositions,
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
    console.error('[API/v1/saints/:slug] Error:', err);
    return errorResponse('Internal server error', 500, { code: 'INTERNAL_ERROR' });
  }
}
