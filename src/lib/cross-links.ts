/**
 * Internal linking engine — generates entity-graph-driven cross-links
 * for programmatic SEO link equity distribution.
 *
 * Every page type returns curated internal links with Marathi anchors.
 */

import { db } from '@/src/db/client';

// ─── Types ────────────────────────────────────────────────────

export interface InternalLink {
  href: string;
  label: string;         // Marathi anchor text
  translit?: string;     // Transliterated fallback
  type: 'composition' | 'saint' | 'category' | 'festival' | 'region' | 'temple';
}

export interface CrossLinks {
  sameSaint: InternalLink[];
  sameCategory: InternalLink[];
  relatedSaints: InternalLink[];
  graphLinks: InternalLink[];
}

// ─── Composition Cross-Links ──────────────────────────────────

/**
 * Fetch up to 6 same-saint compositions for internal linking.
 */
export async function getSameSaintLinks(
  saintId: string | null,
  excludeSlug: string,
  limit = 4,
): Promise<InternalLink[]> {
  if (!saintId) return [];

  const compositions = await db.composition.findMany({
    where: { saintId, slug: { not: excludeSlug } },
    take: limit,
    orderBy: { updatedAt: 'desc' },
    select: { titleMarathi: true, slug: true },
  });

  return compositions.map((c) => ({
    href: `/abhang/${c.slug}`,
    label: c.titleMarathi,
    type: 'composition' as const,
  }));
}

/**
 * Fetch same-category compositions.
 */
export async function getSameCategoryLinks(
  categorySlug: string | null,
  excludeSlug: string,
  limit = 4,
): Promise<InternalLink[]> {
  if (!categorySlug) return [];

  // Find compositions in the same category via the join table
  const category = await db.category.findUnique({
    where: { slug: categorySlug },
    select: {
      compositions: {
        take: limit,
        orderBy: { composition: { updatedAt: 'desc' } },
        select: { composition: { select: { titleMarathi: true, slug: true } } },
        where: { composition: { slug: { not: excludeSlug } } },
      },
    },
  });

  if (!category) return [];

  return category.compositions.map((cc) => ({
    href: `/abhang/${cc.composition.slug}`,
    label: cc.composition.titleMarathi,
    type: 'composition' as const,
  }));
}

/**
 * Fetch related saints from the saint_relationships table.
 */
export async function getRelatedSaintLinks(saintId: string | null): Promise<InternalLink[]> {
  if (!saintId) return [];

  const relations = await db.saintRelation.findMany({
    where: { saintId },
    include: {
      related: {
        select: { nameMarathi: true, slug: true },
      },
    },
    take: 6,
  });

  return relations.map((r) => ({
    href: `/sant/${r.related.slug}`,
    label: r.related.nameMarathi,
    type: 'saint' as const,
  }));
}

/**
 * Fetch cross-entity links from the knowledge graph (EntityGraphEdge).
 * Explores edges from composition to saints, categories, deities, festivals.
 */
export async function getGraphLinks(
  sourceType: string,
  sourceId: string,
  limit = 6,
): Promise<InternalLink[]> {
  const edges = await db.entityGraphEdge.findMany({
    where: {
      sourceType,
      sourceId,
      relationship: { in: ['composed_by', 'belongs_to', 'related_to', 'mentions'] }
    },
    orderBy: {
      weight: 'desc'
    },
    take: limit,
    select: {
      targetType: true,
      targetId: true,
      relationship: true
    }
  });

  if (edges.length === 0) return [];

  const results: InternalLink[] = [];

  for (const edge of edges) {
    if (edge.targetType === 'saint') {
      const saint = await db.saint.findUnique({
        where: { id: edge.targetId },
        select: { nameMarathi: true, slug: true },
      });
      if (saint) {
        results.push({ href: `/sant/${saint.slug}`, label: saint.nameMarathi, type: 'saint' });
      }
    } else if (edge.targetType === 'category') {
      const cat = await db.category.findUnique({
        where: { id: edge.targetId },
        select: { nameMarathi: true, slug: true },
      });
      if (cat) {
        results.push({
          href: `/category/${cat.slug}`,
          label: cat.nameMarathi,
          type: 'category',
        });
      }
    } else if (edge.targetType === 'festival') {
      const fest = await db.festival.findUnique({
        where: { id: edge.targetId },
        select: { nameMarathi: true, nameTranslit: true },
      });
      if (fest) {
        results.push({
          href: `/festival/${fest.nameTranslit.toLowerCase().replace(/\s+/g, '-')}`,
          label: fest.nameMarathi,
          type: 'festival',
        });
      }
    }
  }

  return results;
}

// ─── Utility ──────────────────────────────────────────────────

/**
 * Shuffle array for variety (deterministic by seed — avoid stale link profiles).
 */
export function shuffleLinks<T>(links: T[], max: number): T[] {
  return links.sort(() => Math.random() - 0.5).slice(0, max);
}
