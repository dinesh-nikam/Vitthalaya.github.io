/**
 * Reading Lists — service layer wrapping UserCollection CRUD.
 *
 * Reading lists are user-curated, shareable collections of compositions.
 * Powers the reading-lists API and UI pages.
 */

import { db } from '../../db/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateReadingListInput {
  userId: string;
  name: string;
  description?: string;
  isPublic?: boolean;
  compositionIds?: string[];
}

export interface ReadingListSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isPublic: boolean;
  compositionCount: number;
  createdAt: Date;
  creator: { id: string; name: string | null; imageUrl: string | null } | null;
}

export interface ReadingListDetail extends ReadingListSummary {
  compositions: Array<{
    id: string;
    composition: {
      id: string;
      titleMarathi: string;
      type: string;
      slug: string;
    };
    notes: string | null;
    sortOrder: number;
  }>;
}

// ── CRUD Operations ───────────────────────────────────────────────────────────

/**
 * Create a new reading list.
 */
export async function createReadingList(
  input: CreateReadingListInput,
): Promise<ReadingListSummary> {
  const slug = input.name
    .toLowerCase()
    .replace(/[^\u0900-\u097F\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);

  const list = await db.userCollection.create({
    data: {
      userId: input.userId,
      name: input.name,
      slug,
      description: input.description,
      isPublic: input.isPublic ?? false,
      compositions: input.compositionIds
        ? {
            create: input.compositionIds.map((cid, idx) => ({
              compositionId: cid,
              sortOrder: idx,
            })),
          }
        : undefined,
    },
    include: {
      _count: { select: { compositions: true } },
      creator: { select: { id: true, name: true, imageUrl: true } },
    },
  });

  return {
    id: list.id,
    name: list.name,
    slug: list.slug,
    description: list.description,
    isPublic: list.isPublic,
    compositionCount: list._count.compositions,
    createdAt: list.createdAt,
    creator: list.creator
      ? { id: list.creator.id, name: list.creator.name, imageUrl: list.creator.imageUrl }
      : null,
  };
}

/**
 * Get a reading list by slug with full composition details.
 */
export async function getReadingListBySlug(slug: string): Promise<ReadingListDetail | null> {
  const list = await db.userCollection.findUnique({
    where: { slug },
    include: {
      compositions: {
        orderBy: { sortOrder: 'asc' },
        include: {
          composition: {
            select: { id: true, titleMarathi: true, type: true, slug: true },
          },
        },
      },
      creator: { select: { id: true, name: true, imageUrl: true } },
      _count: { select: { compositions: true } },
    },
  });

  if (!list) return null;

  return {
    id: list.id,
    name: list.name,
    slug: list.slug,
    description: list.description,
    isPublic: list.isPublic,
    compositionCount: list._count.compositions,
    createdAt: list.createdAt,
    creator: list.creator
      ? { id: list.creator.id, name: list.creator.name, imageUrl: list.creator.imageUrl }
      : null,
    compositions: list.compositions.map((cc) => ({
      id: cc.id,
      composition: cc.composition,
      notes: cc.notes,
      sortOrder: cc.sortOrder,
    })),
  };
}

/**
 * Get public reading lists with pagination.
 */
export async function getPublicReadingLists(options: {
  take?: number;
  skip?: number;
}): Promise<{ lists: ReadingListSummary[]; total: number }> {
  const take = options.take ?? 20;
  const skip = options.skip ?? 0;

  const [lists, total] = await Promise.all([
    db.userCollection.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        creator: { select: { id: true, name: true, imageUrl: true } },
        _count: { select: { compositions: true } },
      },
    }),
    db.userCollection.count({ where: { isPublic: true } }),
  ]);

  return {
    lists: lists.map((l) => ({
      id: l.id,
      name: l.name,
      slug: l.slug,
      description: l.description,
      isPublic: l.isPublic,
      compositionCount: l._count.compositions,
      createdAt: l.createdAt,
      creator: l.creator
        ? { id: l.creator.id, name: l.creator.name, imageUrl: l.creator.imageUrl }
        : null,
    })),
    total,
  };
}

/**
 * Get reading lists for a specific user.
 */
export async function getUserReadingLists(userId: string): Promise<ReadingListSummary[]> {
  const lists = await db.userCollection.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { compositions: true } },
      creator: { select: { id: true, name: true, imageUrl: true } },
    },
  });

  return lists.map((l) => ({
    id: l.id,
    name: l.name,
    slug: l.slug,
    description: l.description,
    isPublic: l.isPublic,
    compositionCount: l._count.compositions,
    createdAt: l.createdAt,
    creator: l.creator
      ? { id: l.creator.id, name: l.creator.name, imageUrl: l.creator.imageUrl }
      : null,
  }));
}

/**
 * Add compositions to a reading list.
 */
export async function addToList(
  listId: string,
  compositionIds: string[],
): Promise<void> {
  const maxOrder = await db.collectionComposition.aggregate({
    where: { collectionId: listId },
    _max: { sortOrder: true },
  });

  let nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  await db.collectionComposition.createMany({
    data: compositionIds.map((cid) => ({
      collectionId: listId,
      compositionId: cid,
      sortOrder: nextOrder++,
    })),
    skipDuplicates: true,
  });
}

/**
 * Remove a composition from a reading list.
 */
export async function removeFromList(
  listId: string,
  compositionId: string,
): Promise<void> {
  await db.collectionComposition.deleteMany({
    where: { collectionId: listId, compositionId },
  });
}

/**
 * Delete a reading list.
 */
export async function deleteReadingList(listId: string): Promise<void> {
  await db.userCollection.delete({ where: { id: listId } });
}
