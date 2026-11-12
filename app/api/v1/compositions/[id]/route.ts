/**
 * Public API v1 — Single Composition
 *
 * GET /api/v1/compositions/:id — Full composition detail with text.
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
  id: z.string().trim().min(1, 'Identifier is required'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
        parsed.error.issues.map((i) => [i.path.join('.') || 'id', i.message])
      )
    );
  }

  const { id } = parsed.data;

  try {
    const composition = await db.composition.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        reviewed: true,
      },
      select: {
        id: true,
        titleMarathi: true,
        titleTranslit: true,
        type: true,
        slug: true,
        fullText: true,
        meaning: true,
        saint: { select: { id: true, nameMarathi: true, slug: true } },
        deity: { select: { id: true, nameMarathi: true, nameTranslit: true } },
        audioLinks: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!composition) {
      return ApiErrors.NOT_FOUND('Composition not found');
    }

    const response = NextResponse.json(
      { data: composition },
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
    console.error('[API/v1/compositions/:id] Error:', err);
    return errorResponse('Internal server error', 500, { code: 'INTERNAL_ERROR' });
  }
}
