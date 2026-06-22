/**
 * Audio Playlist Builder — builds continuous playback playlists
 * from compositions, grouped by saint or type.
 */

import { db } from '../../db/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlaylistTrack {
  id: string;
  titleMarathi: string;
  titleTranslit: string;
  saintName: string;
  audioUrl: string;
  lyrics?: { time: number; text: string }[];
  compositionSlug?: string;
}

export type PlaylistStrategy = 'saint' | 'type' | 'random' | 'sequential';

export interface BuildPlaylistOptions {
  strategy: PlaylistStrategy;
  saintSlug?: string;
  compositionType?: string;
  compositionIds?: string[];
  limit?: number;
}

// ── Playlist Builder ──────────────────────────────────────────────────────────

/**
 * Build a playlist from compositions, grouped by strategy.
 */
export async function buildAudioPlaylist(
  options: BuildPlaylistOptions,
): Promise<PlaylistTrack[]> {
  const limit = options.limit ?? 20;

  switch (options.strategy) {
    case 'saint':
      return buildSaintPlaylist(options.saintSlug, limit);
    case 'type':
      return buildTypePlaylist(options.compositionType, limit);
    case 'sequential':
      return buildSequentialPlaylist(options.compositionIds, limit);
    case 'random':
    default:
      return buildRandomPlaylist(limit);
  }
}

/**
 * Build a playlist from compositions of a specific saint.
 */
async function buildSaintPlaylist(
  saintSlug?: string,
  limit: number = 20,
): Promise<PlaylistTrack[]> {
  if (!saintSlug) return buildRandomPlaylist(limit);

  const compositions = await db.composition.findMany({
    where: {
      saint: { slug: saintSlug },
      reviewed: true,
      audio: { some: {} }, // Only compositions with audio
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      titleMarathi: true,
      titleTranslit: true,
      slug: true,
      saint: { select: { nameMarathi: true } },
      audio: { select: { audioUrl: true, duration: true }, take: 1 },
    },
  });

  return compositions.map((c) => trackFromComposition(c));
}

/**
 * Build a playlist from compositions of a specific type.
 */
async function buildTypePlaylist(
  type?: string,
  limit: number = 20,
): Promise<PlaylistTrack[]> {
  const where: Record<string, unknown> = {
    reviewed: true,
    audio: { some: {} },
  };
  if (type) where.type = type;

  const compositions = await db.composition.findMany({
    where: where as any,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      titleMarathi: true,
      titleTranslit: true,
      slug: true,
      saint: { select: { nameMarathi: true } },
      audio: { select: { audioUrl: true, duration: true }, take: 1 },
    },
  });

  return compositions.map((c) => trackFromComposition(c));
}

/**
 * Build a playlist from specific composition IDs.
 */
async function buildSequentialPlaylist(
  ids?: string[],
  limit: number = 20,
): Promise<PlaylistTrack[]> {
  if (!ids || ids.length === 0) return buildRandomPlaylist(limit);

  const compositions = await db.composition.findMany({
    where: {
      id: { in: ids.slice(0, limit) },
      reviewed: true,
    },
    select: {
      id: true,
      titleMarathi: true,
      titleTranslit: true,
      slug: true,
      saint: { select: { nameMarathi: true } },
      audio: { select: { audioUrl: true, duration: true }, take: 1 },
    },
  });

  return compositions.map((c) => trackFromComposition(c));
}

/**
 * Build a random playlist across all compositions with audio.
 */
async function buildRandomPlaylist(limit: number = 20): Promise<PlaylistTrack[]> {
  const count = await db.composition.count({
    where: { reviewed: true, audio: { some: {} } },
  });

  if (count === 0) return [];

  // Random offset for variety
  const skip = Math.max(0, Math.floor(Math.random() * count) - limit);

  const compositions = await db.composition.findMany({
    where: { reviewed: true, audio: { some: {} } },
    orderBy: { id: 'asc' },
    skip,
    take: limit,
    select: {
      id: true,
      titleMarathi: true,
      titleTranslit: true,
      slug: true,
      saint: { select: { nameMarathi: true } },
      audio: { select: { audioUrl: true, duration: true }, take: 1 },
    },
  });

  return compositions.map((c) => trackFromComposition(c));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function trackFromComposition(c: {
  id: string;
  titleMarathi: string;
  titleTranslit: string | null;
  slug: string;
  saint: { nameMarathi: string } | null;
  audio: Array<{ audioUrl: string; duration: number | null }>;
}): PlaylistTrack {
  return {
    id: c.id,
    titleMarathi: c.titleMarathi,
    titleTranslit: c.titleTranslit ?? c.titleMarathi,
    saintName: c.saint?.nameMarathi ?? 'Unknown',
    audioUrl: c.audio[0]?.audioUrl ?? '',
    compositionSlug: c.slug,
  };
}

/**
 * Client-side: dispatch a custom event to add tracks to the floating player.
 * The FloatingPlayer component listens for 'playlist-add' events.
 */
export function dispatchPlaylist(tracks: PlaylistTrack[], startIndex: number = 0): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('playlist-add', {
      detail: { tracks, startIndex },
    }),
  );
}

/**
 * Client-side: dispatch event to clear playlist and play new tracks.
 */
export function dispatchPlayNow(tracks: PlaylistTrack[], startIndex: number = 0): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('playlist-replace', {
      detail: { tracks, startIndex },
    }),
  );
}
