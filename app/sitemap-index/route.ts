import { db } from '@/src/db/client';
import { SITEMAP_URLS_PER_FILE, buildSitemapIndex } from '@/src/lib/seo';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://digitalpandharpur.com';

export async function GET() {
  const now = new Date().toISOString();

  // Count total compositions to determine chunks
  const totalCompositions = await db.composition.count();
  const compositionChunks = Math.max(Math.ceil(totalCompositions / SITEMAP_URLS_PER_FILE), 1);

  // Count entities
  const [totalSaints, totalCategories, totalFestivals] = await Promise.all([
    db.saint.count(),
    db.category.count(),
    db.festival.count(),
  ]);

  const entries: { loc: string; lastmod?: string }[] = [];

  // Composition sitemaps (chunked)
  for (let i = 1; i <= compositionChunks; i++) {
    entries.push({
      loc: `${SITE_URL}/sitemap-compositions/${i}`,
      lastmod: now,
    });
  }

  // Entity sitemaps
  if (totalSaints > 0) {
    entries.push({ loc: `${SITE_URL}/sitemap-entities?type=saints`, lastmod: now });
  }
  if (totalCategories > 0) {
    entries.push({ loc: `${SITE_URL}/sitemap-entities?type=categories`, lastmod: now });
  }
  if (totalFestivals > 0) {
    entries.push({ loc: `${SITE_URL}/sitemap-entities?type=festivals`, lastmod: now });
  }
  entries.push({ loc: `${SITE_URL}/sitemap-entities?type=static`, lastmod: now });
  entries.push({ loc: `${SITE_URL}/sitemap-entities?type=canonical-search`, lastmod: now });

  const xml = buildSitemapIndex(entries);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
