import { GET as getSitemapIndex } from '../sitemap-index/route';

/**
 * Root sitemap.xml handler.
 * Proxies requests to the chunked sitemap-index so search engine crawlers can auto-discover all routes.
 */
export async function GET() {
  return getSitemapIndex();
}
