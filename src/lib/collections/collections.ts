/**
 * Community Collection Service — manages user-curated composition collections,
 * revenue sharing, and featured collections.
 *
 * Revenue sharing model:
 *   Community Curator: 5-10% of net
 *   Platform: 60-70%
 *   Print Partner: 20-30%
 */

import { db } from '../../db/client';
import type { CompositionType } from '../../book-generation/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateCollectionInput {
  name: string;
  slug: string;
  description?: string;
  userId: string;
  compositionIds: string[];
  isPublic?: boolean;
}

export interface CollectionStats {
  totalCompositions: number;
  uniqueSaints: number;
  uniqueTypes: string[];
  estimatedPages: number;
}

// ── Create Collection ─────────────────────────────────────────────────────────

export async function createCollection(input: CreateCollectionInput) {
  const collection = await db.userCollection.create({
    data: {
      name: input.name,
      slug: input.slug,
      description: input.description,
      userId: input.userId,
      isPublic: input.isPublic ?? false,
      compositions: {
        create: input.compositionIds.map((cid, i) => ({
          compositionId: cid,
          sortOrder: i,
        })),
      },
    },
    include: {
      compositions: { include: { composition: true } },
      user: { select: { id: true, name: true, image: true } },
    },
  });

  return collection;
}

// ── Get Collection Stats ──────────────────────────────────────────────────────

export async function getCollectionStats(
  collectionId: string,
): Promise<CollectionStats> {
  const collection = await db.userCollection.findUnique({
    where: { id: collectionId },
    include: {
      compositions: {
        include: {
          composition: {
            select: { type: true, saintId: true, saint: { select: { nameMarathi: true } } },
          },
        },
      },
    },
  });

  if (!collection) throw new Error('Collection not found');

  const saints = new Set(collection.compositions.map((c) => c.composition.saintId).filter(Boolean));
  const types = [...new Set(collection.compositions.map((c) => c.composition.type))] as string[];

  return {
    totalCompositions: collection.compositions.length,
    uniqueSaints: saints.size,
    uniqueTypes: types,
    estimatedPages: Math.round(collection.compositions.length * 1.5),
  };
}

// ── Revenue Share Calculation ─────────────────────────────────────────────────

export const REVENUE_SHARES = {
  curator: 0.08,      // 8% to collection creator
  platform: 0.65,     // 65% platform
  printPartner: 0.27, // 27% print partner
};

export function calculateRevenueShare(
  salePrice: number,
): {
  curatorShare: number;
  platformShare: number;
  printPartnerShare: number;
} {
  return {
    curatorShare: Math.round(salePrice * REVENUE_SHARES.curator * 100) / 100,
    platformShare: Math.round(salePrice * REVENUE_SHARES.platform * 100) / 100,
    printPartnerShare: Math.round(salePrice * REVENUE_SHARES.printPartner * 100) / 100,
  };
}

// ── Feature / Demote Collections ──────────────────────────────────────────────

export async function featureCollection(collectionId: string): Promise<void> {
  await db.userCollection.update({
    where: { id: collectionId },
    data: { isFeatured: true },
  });
}

export async function demoteCollection(collectionId: string): Promise<void> {
  await db.userCollection.update({
    where: { id: collectionId },
    data: { isFeatured: false },
  });
}

// ── Public Collections ────────────────────────────────────────────────────────

export async function getPublicCollections(limit = 30, offset = 0) {
  return db.userCollection.findMany({
    where: { isPublic: true },
    orderBy: [{ isFeatured: 'desc' }, { likes: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    skip: offset,
    include: {
      user: { select: { id: true, name: true, image: true } },
      _count: { select: { compositions: true } },
      compositions: { take: 3, include: { composition: { select: { titleMarathi: true } } } },
    },
  });
}

export async function getCollectionBySlug(slug: string) {
  return db.userCollection.findUnique({
    where: { slug },
    include: {
      user: { select: { id: true, name: true, image: true } },
      compositions: {
        include: { composition: { select: { id: true, titleMarathi: true, type: true, saint: { select: { nameMarathi: true } } } } },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
}
