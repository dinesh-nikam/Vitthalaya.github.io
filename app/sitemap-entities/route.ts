import { NextRequest } from 'next/server';
import { db } from '@/src/db/client';
import { redis } from '@/src/lib/redis';
import {
  ENTITY_CHANGEFREQ,
  ENTITY_PRIORITY,
  STATIC_CHANGEFREQ,
  STATIC_PRIORITY,
  buildUrlSet,
} from '@/src/lib/seo';
import { getTopCanonicalQueries } from '@/src/lib/canonical-queries';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://digitalpandharpur.com';

/**
 * Dynamic entity sitemap router.
 * Serves saints, categories, festivals, static, canonical-search from a single route.
 * Query param `?type=saints|categories|festivals|static|canonical-search` selects the set.
 * Uses Redis caching to reduce database load.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'static';

  const cacheKey = `sitemap:entities:${type}`;
  try {
    const cachedXml = await redis.get(cacheKey);
    if (cachedXml) {
      console.log(`✓ Entity sitemap type=${type} served from cache.`);
      return xmlResponse(cachedXml, 'HIT');
    }
  } catch (err) {
    console.error('Redis cache retrieval failed:', err);
  }

  let xml: string;
  switch (type) {
    case 'saints':
      xml = await generateSaintsXml();
      break;
    case 'categories':
      xml = await generateCategoriesXml();
      break;
    case 'festivals':
      xml = await generateFestivalsXml();
      break;
    case 'static':
      xml = await generateStaticXml();
      break;
    case 'canonical-search':
      xml = await generateCanonicalSearchXml();
      break;
    default:
      return new Response(
        'Unknown sitemap type. Use: saints, categories, festivals, static, canonical-search',
        { status: 400 },
      );
  }

  // Cache in Redis for 12 hours (43200 seconds)
  try {
    await redis.set(cacheKey, xml, { ex: 43200 });
  } catch (err) {
    console.error('Redis cache storage failed:', err);
  }

  return xmlResponse(xml, 'MISS');
}

async function generateSaintsXml(): Promise<string> {
  const saints = await db.saint.findMany({
    select: { slug: true, updatedAt: true },
    orderBy: { slug: 'asc' },
  }) as Array<{ slug: string; updatedAt: Date }>;

  return buildUrlSet(
    saints.map((s) => ({
      loc: `${SITE_URL}/sant/${s.slug}`,
      lastmod: s.updatedAt.toISOString(),
      changefreq: ENTITY_CHANGEFREQ,
      priority: ENTITY_PRIORITY,
    })),
  );
}

async function generateCategoriesXml(): Promise<string> {
  const categories = await db.category.findMany({
    select: { slug: true, nameMarathi: true },
    orderBy: { slug: 'asc' },
  }) as Array<{ slug: string; nameMarathi: string }>;

  const now = new Date().toISOString();
  return buildUrlSet(
    categories.map((c) => ({
      loc: `${SITE_URL}/category/${c.slug}`,
      lastmod: now,
      changefreq: ENTITY_CHANGEFREQ,
      priority: ENTITY_PRIORITY,
    })),
  );
}

async function generateFestivalsXml(): Promise<string> {
  const festivals = await db.festival.findMany({
    select: { nameTranslit: true },
    orderBy: { nameTranslit: 'asc' },
  }) as Array<{ nameTranslit: string }>;

  const now = new Date().toISOString();
  return buildUrlSet(
    festivals.map((f) => ({
      loc: `${SITE_URL}/festival/${f.nameTranslit.toLowerCase().replace(/\s+/g, '-')}`,
      lastmod: now,
      changefreq: ENTITY_CHANGEFREQ,
      priority: ENTITY_PRIORITY,
    })),
  );
}

async function generateCanonicalSearchXml(): Promise<string> {
  const now = new Date().toISOString();
  const queries = await getTopCanonicalQueries(10000);

  return buildUrlSet(
    queries.map((q) => ({
      loc: `${SITE_URL}/search/${encodeURIComponent(q.slug)}`,
      lastmod: now,
      changefreq: ENTITY_CHANGEFREQ,
      priority: 0.5,
    })),
  );
}

async function generateStaticXml(): Promise<string> {
  const now = new Date().toISOString();
  const staticPages = [
    { loc: `${SITE_URL}/`, changefreq: STATIC_CHANGEFREQ, priority: 1.0 },
    { loc: `${SITE_URL}/search`, changefreq: STATIC_CHANGEFREQ, priority: 0.5 },
  ];

  return buildUrlSet(
    staticPages.map((p) => ({
      ...p,
      lastmod: now,
    })),
  );
}

function xmlResponse(xml: string, cacheHeaderVal = 'MISS'): Response {
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'X-Cache': cacheHeaderVal,
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}