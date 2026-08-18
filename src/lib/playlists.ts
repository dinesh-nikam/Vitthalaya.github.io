/**
 * Digital Pandharpur — Playlists (Audio Platform)
 *
 * Ownership-checked playlist CRUD plus pure reorder/move logic. The pure
 * helpers (reorderItems, moveItemById, nextSortOrder) have no I/O and are
 * unit-tested directly; the DB helpers are thin wrappers that always verify
 * the acting user owns the playlist.
 */

import { db } from '../db/client';

// ─── Pure helpers (no I/O, unit-tested) ─────────────────────────────────────

/** Move the item at `fromIndex` to `toIndex` (stable, splice semantics). */
export function reorderItems<T extends { id: string }>(
  items: T[],
  fromIndex: number,
  toIndex: number
): T[] {
  if (fromIndex === toIndex) return items;
  if (fromIndex < 0 || fromIndex >= items.length) return items;
  if (toIndex < 0 || toIndex > items.length) return items;

  const copy = [...items];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
}

/** Move the item with `itemId` to `toIndex`; returns the input unchanged if not found. */
export function moveItemById<T extends { id: string }>(
  items: T[],
  itemId: string,
  toIndex: number
): T[] {
  const fromIndex = items.findIndex((item) => item.id === itemId);
  if (fromIndex === -1) return items;
  return reorderItems(items, fromIndex, toIndex);
}

/** Next sortOrder for appending: one above the current maximum. */
export function nextSortOrder(items: Array<{ sortOrder: number }>): number {
  if (items.length === 0) return 0;
  return Math.max(...items.map((item) => item.sortOrder)) + 1;
}

/** A PlaylistItem may reference a composition OR a recording, never both. */
export function assertSingleTarget(
  compositionId: string | null | undefined,
  uploadedFileId: string | null | undefined
): void {
  if (compositionId && uploadedFileId) {
    throw new Error('Playlist item must reference a composition OR a recording, not both.');
  }
  if (!compositionId && !uploadedFileId) {
    throw new Error('Playlist item must reference a composition or a recording.');
  }
}

// ─── DB helpers (ownership-checked) ─────────────────────────────────────────

export interface CreatePlaylistInput {
  userId: string;
  name: string;
  description?: string | null;
  isPublic?: boolean;
  kind?: 'USER' | 'AI_GENERATED';
}

export async function createPlaylist(input: CreatePlaylistInput) {
  return db.playlist.create({
    data: {
      userId: input.userId,
      name: input.name.trim(),
      description: input.description ?? null,
      isPublic: input.isPublic ?? false,
      kind: input.kind ?? 'USER',
    },
  });
}

/**
 * Fetch a playlist for a user. Returns null when the playlist does not exist
 * or is owned by someone else (no existence leak).
 */
export async function getPlaylistForUser(playlistId: string, userId: string) {
  return db.playlist.findFirst({
    where: { id: playlistId, userId },
    include: {
      items: {
        include: {
          composition: { select: { id: true, titleMarathi: true, titleTranslit: true, slug: true } },
          uploadedFile: { select: { id: true, originalName: true, extractedMetadata: true } },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
}

export async function renamePlaylist(playlistId: string, userId: string, name: string) {
  const nameTrimmed = name.trim();
  if (!nameTrimmed) throw new Error('Playlist name cannot be empty.');
  const updated = await db.playlist.updateMany({
    where: { id: playlistId, userId },
    data: { name: nameTrimmed },
  });
  if (updated.count === 0) throw new Error('Playlist not found or not owned by you.');
  return updated;
}

export async function deletePlaylist(playlistId: string, userId: string): Promise<void> {
  const deleted = await db.playlist.deleteMany({
    where: { id: playlistId, userId },
  });
  if (deleted.count === 0) throw new Error('Playlist not found or not owned by you.');
}

export interface AddItemInput {
  playlistId: string;
  userId: string;
  compositionId?: string | null;
  uploadedFileId?: string | null;
}

export async function addItemToPlaylist(input: AddItemInput) {
  assertSingleTarget(input.compositionId, input.uploadedFileId);

  const playlist = await db.playlist.findFirst({
    where: { id: input.playlistId, userId: input.userId },
    select: { id: true },
  });
  if (!playlist) throw new Error('Playlist not found or not owned by you.');

  // Deduplicate: same target already in the playlist is a no-op.
  const existing = await db.playlistItem.findFirst({
    where: {
      playlistId: input.playlistId,
      compositionId: input.compositionId ?? null,
      uploadedFileId: input.uploadedFileId ?? null,
    },
    select: { id: true },
  });
  if (existing) return existing;

  const last = await db.playlistItem.findFirst({
    where: { playlistId: input.playlistId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  return db.playlistItem.create({
    data: {
      playlistId: input.playlistId,
      compositionId: input.compositionId ?? null,
      uploadedFileId: input.uploadedFileId ?? null,
      sortOrder: last ? last.sortOrder + 1 : 0,
    },
  });
}

export async function removeItemFromPlaylist(
  playlistId: string,
  itemId: string,
  userId: string
): Promise<void> {
  const item = await db.playlistItem.findFirst({
    where: { id: itemId, playlist: { id: playlistId, userId } },
    select: { id: true },
  });
  if (!item) throw new Error('Playlist item not found or not owned by you.');
  await db.playlistItem.delete({ where: { id: item.id } });
}

/**
 * Reorder items to match `orderedItemIds`. Verifies the playlist is owned by
 * the user and that the id set exactly matches the playlist's current items
 * before persisting (atomic, no partial reorder).
 */
export async function reorderPlaylistItems(
  playlistId: string,
  userId: string,
  orderedItemIds: string[]
): Promise<void> {
  const items = await db.playlistItem.findMany({
    where: { playlistId },
    select: { id: true },
  });

  const currentIds = new Set(items.map((item) => item.id));
  if (
    orderedItemIds.length !== currentIds.size ||
    orderedItemIds.some((id) => !currentIds.has(id))
  ) {
    throw new Error('Reorder must include exactly the playlist items, once each.');
  }

  // Ownership is verified last — an attacker who guesses a playlist id still
  // cannot reorder it, and a non-owned playlist throws before any write.
  const owned = await db.playlist.findFirst({
    where: { id: playlistId, userId },
    select: { id: true },
  });
  if (!owned) throw new Error('Playlist not found or not owned by you.');

  await db.$transaction(
    orderedItemIds.map((id, index) =>
      db.playlistItem.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );
}
