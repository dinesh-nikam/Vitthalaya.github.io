import { NextRequest, NextResponse } from 'next/server';
import { searchHybrid } from '@/src/lib/opensearch-client';
import { redis } from '@/src/lib/redis';
import { createHash } from 'crypto';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const type = searchParams.get('type')?.trim() || '';
    const saintId = searchParams.get('saintId')?.trim() || '';
    const deityId = searchParams.get('deityId')?.trim() || '';
    const mode = (searchParams.get('mode')?.trim() || 'hybrid') as 'keyword' | 'semantic' | 'hybrid';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!query) {
      return NextResponse.json({ error: 'Search query parameter "q" is required.' }, { status: 400 });
    }

    // Generate unique cache key based on hashed query parameters
    const hashInput = JSON.stringify({ query, type, saintId, deityId, mode, page, limit });
    const hash = createHash('sha256').update(hashInput).digest('hex');
    const cacheKey = `dp:search:q:${hash}`;

    // Try to resolve from cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return NextResponse.json({ ...parsed, cached: true }, {
          headers: {
            'X-Cache': 'HIT',
          },
        });
      }
    } catch (cacheErr) {
      console.warn('Failed to read search cache from Redis:', cacheErr);
    }

    // Execute hybrid search (limit page + offset offset if needed)
    // For simplicity, we search limit * page items and slice the requested page
    const rawResults = await searchHybrid(query, { type, saintId, deityId }, page * limit, mode);
    
    const startIndex = (page - 1) * limit;
    const paginatedResults = rawResults.slice(startIndex, startIndex + limit);
    const total = rawResults.length;

    const responseBody = {
      results: paginatedResults.map((doc) => ({
        id: doc.id,
        titleMarathi: doc.titleMarathi,
        titleTranslit: doc.titleTranslit,
        slug: doc.slug,
        type: doc.type,
        snippet: doc.fullText.substring(0, 160) + '...',
        saint: doc.saintName ? {
          nameMarathi: doc.saintName,
          slug: doc.saintTranslit ? doc.saintTranslit.toLowerCase().replace(/\s+/g, '-') : '',
        } : null,
        deity: doc.deityName,
        score: doc.score,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache results for 1 hour (3600 seconds)
    try {
      await redis.set(cacheKey, JSON.stringify(responseBody), { ex: 3600 });
    } catch (cacheErr) {
      console.warn('Failed to write search results to Redis cache:', cacheErr);
    }

    return NextResponse.json({ ...responseBody, cached: false }, {
      headers: {
        'X-Cache': 'MISS',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Unhandled search API error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
