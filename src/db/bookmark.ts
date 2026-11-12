'use server';

import { db } from '@/src/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';

export interface Bookmark {
  slug: string;
  title: string;
  savedAt: string;
}

export async function getBookmarks(): Promise<Bookmark[]> {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) return [];

  const interactions = await db.userInteraction.findMany({
    where: {
      userId: (session?.user as any)?.id,
      interaction: 'bookmark',
    },
    include: {
      composition: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return interactions.map((interaction) => ({
    slug: interaction.composition.slug,
    title: interaction.composition.titleMarathi,
    savedAt: interaction.createdAt.toISOString(),
  }));
}

export async function getBookmarkSlugs(): Promise<string[]> {
  const bookmarks = await getBookmarks();
  return bookmarks.map((b) => b.slug);
}

export async function isBookmarked(slug: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) return false;

  const interaction = await db.userInteraction.findFirst({
    where: {
      userId: (session?.user as any)?.id,
      interaction: 'bookmark',
      composition: {
        slug: slug,
      },
    },
  });

  return !!interaction;
}


export async function addBookmark(item: { slug: string; title: string }): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) return;

  const composition = await db.composition.findUnique({
    where: { slug: item.slug },
  });
  if (!composition) return;

  const existing = await db.userInteraction.findFirst({
    where: {
      userId: (session?.user as any)?.id,
      compositionId: composition.id,
      interaction: 'bookmark',
    },
  });

  if (!existing) {
    await db.userInteraction.create({
      data: {
        userId: (session?.user as any)?.id,
        compositionId: composition.id,
        interaction: 'bookmark',
      },
    });
  }
}

export async function removeBookmark(slug: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) return;

  const composition = await db.composition.findUnique({
    where: { slug },
  });
  if (!composition) return;

  await db.userInteraction.deleteMany({
    where: {
      userId: (session?.user as any)?.id,
      compositionId: composition.id,
      interaction: 'bookmark',
    },
  });
}

export async function toggleBookmark(slug: string, _title: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) {
    throw new Error('You must be logged in to bookmark compositions.');
  }

  // Find the composition by slug
  const composition = await db.composition.findUnique({
    where: { slug },
  });

  if (!composition) {
    throw new Error('Composition not found.');
  }

  const existing = await db.userInteraction.findFirst({
    where: {
      userId: (session?.user as any)?.id,
      compositionId: composition.id,
      interaction: 'bookmark',
    },
  });

  if (existing) {
    await db.userInteraction.delete({
      where: { id: existing.id },
    });
    return false;
  } else {
    await db.userInteraction.create({
      data: {
        userId: (session?.user as any)?.id,
        compositionId: composition.id,
        interaction: 'bookmark',
      },
    });
    return true;
  }
}

export async function clearBookmarks(): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) return;

  await db.userInteraction.deleteMany({
    where: {
      userId: (session?.user as any)?.id,
      interaction: 'bookmark',
    },
  });
}

export async function getBookmarkCount(): Promise<number> {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) return 0;

  return db.userInteraction.count({
    where: {
      userId: (session?.user as any)?.id,
      interaction: 'bookmark',
    },
  });
}