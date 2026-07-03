/**
 * Search Failover for Digital Pandharpur
 *
 * Wraps Meilisearch search with automatic failover to PostgreSQL
 * when Meilisearch is unavailable. Uses circuit breaker to avoid
 * repeated calls to a failing service.
 */

import type { SearchDocument } from '@/src/lib/search-client';
import { circuitBreaker } from '@/src/lib/circuit-breaker';
import { db } from '@/src/db/client';

/**
 * Search with automatic Meilisearch → PostgreSQL failover.
 *
 * Tries Meilisearch first via circuit breaker. If it fails or circuit is open,
 * falls back to a direct database query using Prisma `contains` search.
 *
 * @param query - Search query string
 * @param options - { limit: number } defaults to 20
 * @returns SearchDocument[] matching the query
 */
export async function searchWithFallback(
  query: string,
  options: { limit?: number; indexName?: string } = {}
): Promise<SearchDocument[]> {
  const { limit = 20, indexName = 'compositions' } = options;

  // Try Meilisearch through circuit breaker
  try {
    const results = await circuitBreaker.execute(async () => {
      // Dynamic import to avoid build issues when Meilisearch is not configured
      const { searchCompositions } = await import('@/src/lib/search-client');
      return searchCompositions(query, undefined, { limit });
    });
    return results;
  } catch (err) {
    console.warn('[Search] Meilisearch unavailable, falling back to database:', (err as Error).message);
  }

  // Fallback: direct PostgreSQL search via Prisma
  try {
    const compositions = await db.composition.findMany({
      where: {
        OR: [
          { titleMarathi: { contains: query } },
          { titleTranslit: { contains: query } },
          { fullText: { contains: query } },
        ],
      },
      include: {
        saint: {
          select: { nameTranslit: true, nameMarathi: true },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return compositions.map((comp) => ({
      id: comp.id,
      titleMarathi: comp.titleMarathi,
      titleTranslit: comp.titleTranslit,
      fullText: comp.fullText || '',
      type: comp.type,
      slug: comp.slug,
      saintName: comp.saint?.nameMarathi || null,
      saintTranslit: comp.saint?.nameTranslit || null,
      deityName: null,
      hasAudio: false,
      popularityScore: 0,
    }));
  } catch (dbErr) {
    console.error('[Search] Database fallback also failed:', dbErr);
    return [];
  }
}
