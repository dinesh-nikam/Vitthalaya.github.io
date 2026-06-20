import { NextRequest } from 'next/server';
import { db } from '@/src/db/client';
import { redis } from '@/src/lib/redis';
import {
  SITEMAP_URLS_PER_FILE,
  COMPOSITION_CHANGEFREQ,
  COMPOSITION_PRIORITY,
  buildUrlSet,
} from '@/src/lib/seo';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://digitalpandharpur.com';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ page: string }> },
) {
  const { page } = await params;
  const pageNum = parseInt(page, 10);

  if (isNaN(pageNum) || pageNum < 1) {
    return new Response('Invalid page number', { status: 400 });
  }

  const cacheKey = `sitemap:compositions:${pageNum}`;
  try {
    const cachedXml = await redis.get(cacheKey);
    if (cachedXml) {
      console.log(`✓ Sitemap page ${pageNum} served from cache.`);
      return new Response(cachedXml, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
        },
      });
    }
  } catch (err) {
    console.error('Redis cache retrieval failed:', err);
  }

  const offset = (pageNum - 1) * SITEMAP_URLS_PER_FILE;

  // Fetch one chunk of compositions ordered by ID for consistent pagination
  const compositions = await db.composition.findMany({
    skip: offset,
    take: SITEMAP_URLS_PER_FILE,
    orderBy: { id: 'asc' },
    select: {
      slug: true,
      updatedAt: true,
    },
  });

  if (compositions.length === 0) {
    return new Response('Sitemap page not found', { status: 404 });
  }

  const urlSet = buildUrlSet(
    compositions.map((c: any) => ({
      loc: `${SITE_URL}/abhang/${c.slug}`,
      lastmod: c.updatedAt.toISOString(),
      changefreq: COMPOSITION_CHANGEFREQ,
      priority: COMPOSITION_PRIORITY,
    })),
  );

  // Cache in Redis for 12 hours (43200 seconds)
  try {
    await redis.set(cacheKey, urlSet, { ex: 43200 });
  } catch (err) {
    console.error('Redis cache storage failed:', err);
  }

  return new Response(urlSet, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'X-Cache': 'MISS',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
