/**
 * Digital Pandharpur — Personal Audio Library (My Recordings)
 *
 * Ownership-checked helpers over UploadedFile (format=audio) plus the new
 * AudioFavorite / PlaybackHistory models. Every helper verifies the acting
 * user owns the recording; foreign or missing rows are indistinguishable
 * (404 semantics handled by the caller).
 */

import { db } from '../db/client';
import { storage } from './storage';

export interface RecordingListItem {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  processingStatus: string;
  createdAt: Date;
  updatedAt: Date;
  /** Public URL of the best playable version (enhanced when available). */
  audioUrl: string | null;
  /** All playable versions: original + enhanced (never the original source). */
  versions: Array<{
    id: string;
    label: string;
    url: string;
    sizeBytes: number;
  }>;
  transcript: string | null;
  extractionConfidence: number | null;
  transcriptionMethod: string | null;
  bookmarked: boolean;
  lastPlayedAt: Date | null;
  durationSeconds: number | null;
  enhancement: Record<string, unknown> | null;
}

const AUDIO_VERSION_LABELS = ['original', 'enhanced'];

/**
 * List the user's audio recordings, newest first, with playable URLs,
 * transcript, bookmark state, and last-played timestamp.
 */
export async function listRecordings(
  userId: string,
  opts?: { skip?: number; take?: number }
): Promise<RecordingListItem[]> {
  const rows = await db.uploadedFile.findMany({
    where: { userId, format: 'audio' },
    orderBy: { createdAt: 'desc' },
    skip: opts?.skip ?? 0,
    take: opts?.take ?? 100,
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      processingStatus: true,
      extractedText: true,
      extractionConfidence: true,
      extractedMetadata: true,
      createdAt: true,
      updatedAt: true,
      versions: {
        select: { id: true, label: true, storagePath: true, sizeBytes: true },
        orderBy: { versionNumber: 'asc' },
      },
      audioFavorites: { where: { userId }, select: { id: true } },
      playbackHistory: {
        orderBy: { playedAt: 'desc' },
        take: 1,
        select: { playedAt: true, durationSeconds: true },
      },
    },
  });

  return rows.map((row) => {
    let metadata: Record<string, unknown> = {};
    if (row.extractedMetadata) {
      try {
        metadata = JSON.parse(row.extractedMetadata) as Record<string, unknown>;
      } catch {
        // best-effort
      }
    }

    const versions = row.versions
      .filter((v) => AUDIO_VERSION_LABELS.includes(v.label))
      .map((v) => ({
        id: v.id,
        label: v.label,
        url: storage.getUrl(v.storagePath),
        sizeBytes: v.sizeBytes,
      }));

    // Enhanced version wins when present; otherwise original.
    const playable = versions.find((v) => v.label === 'enhanced') ?? versions[0] ?? null;

    return {
      id: row.id,
      originalName: row.originalName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      processingStatus: row.processingStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      audioUrl: playable?.url ?? (typeof metadata.audioUrl === 'string' ? metadata.audioUrl : null),
      versions,
      transcript: row.extractedText,
      extractionConfidence: row.extractionConfidence,
      transcriptionMethod:
        typeof metadata.transcriptionMethod === 'string' ? metadata.transcriptionMethod : null,
      bookmarked: row.audioFavorites.length > 0,
      lastPlayedAt: row.playbackHistory[0]?.playedAt ?? null,
      durationSeconds: row.playbackHistory[0]?.durationSeconds ?? null,
      enhancement:
        metadata.enhancement && typeof metadata.enhancement === 'object'
          ? (metadata.enhancement as Record<string, unknown>)
          : null,
    };
  });
}

/** Fetch a single owned recording (null when missing or foreign). */
export async function getRecording(recordingId: string, userId: string) {
  const list = await db.uploadedFile.findMany({
    where: { id: recordingId, userId, format: 'audio' },
    take: 1,
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      processingStatus: true,
      extractedText: true,
      extractionConfidence: true,
      extractedMetadata: true,
      createdAt: true,
      updatedAt: true,
      versions: {
        select: { id: true, label: true, storagePath: true, sizeBytes: true },
        orderBy: { versionNumber: 'asc' },
      },
      audioFavorites: { where: { userId }, select: { id: true } },
      playbackHistory: {
        orderBy: { playedAt: 'desc' },
        take: 1,
        select: { playedAt: true, durationSeconds: true },
      },
    },
  });
  if (list.length === 0) return null;
  const [row] = list;
  return (await mapRecordingRow(row)) as RecordingListItem;
}

async function mapRecordingRow(
  row: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    processingStatus: string;
    extractedText: string | null;
    extractionConfidence: number | null;
    extractedMetadata: unknown;
    createdAt: Date;
    updatedAt: Date;
    versions: Array<{ id: string; label: string; storagePath: string; sizeBytes: number }>;
    audioFavorites: Array<{ id: string }>;
    playbackHistory: Array<{ playedAt: Date; durationSeconds: number | null }>;
  }
): Promise<RecordingListItem> {
  let metadata: Record<string, unknown> = {};
  if (row.extractedMetadata) {
    try {
      metadata = JSON.parse(row.extractedMetadata as string) as Record<string, unknown>;
    } catch {
      // best-effort
    }
  }
  const versions = row.versions
    .filter((v) => AUDIO_VERSION_LABELS.includes(v.label))
    .map((v) => ({
      id: v.id,
      label: v.label,
      url: storage.getUrl(v.storagePath),
      sizeBytes: v.sizeBytes,
    }));
  const playable = versions.find((v) => v.label === 'enhanced') ?? versions[0] ?? null;
  return {
    id: row.id,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    processingStatus: row.processingStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    audioUrl: playable?.url ?? (typeof metadata.audioUrl === 'string' ? metadata.audioUrl : null),
    versions,
    transcript: row.extractedText,
    extractionConfidence: row.extractionConfidence,
    transcriptionMethod:
      typeof metadata.transcriptionMethod === 'string' ? metadata.transcriptionMethod : null,
    bookmarked: row.audioFavorites.length > 0,
    lastPlayedAt: row.playbackHistory[0]?.playedAt ?? null,
    durationSeconds: row.playbackHistory[0]?.durationSeconds ?? null,
    enhancement:
      metadata.enhancement && typeof metadata.enhancement === 'object'
        ? (metadata.enhancement as Record<string, unknown>)
        : null,
  };
}

/** Rename a recording (owner-only). Returns the updated name or null. */
export async function renameRecording(recordingId: string, userId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Recording name cannot be empty.');
  const updated = await db.uploadedFile.updateMany({
    where: { id: recordingId, userId, format: 'audio' },
    data: { originalName: trimmed.slice(0, 200) },
  });
  if (updated.count === 0) return null;
  return trimmed.slice(0, 200);
}

/** Toggle bookmark (AudioFavorite) on a recording. Returns the new state. */
export async function toggleRecordingBookmark(recordingId: string, userId: string) {
  const recording = await db.uploadedFile.findFirst({
    where: { id: recordingId, userId, format: 'audio' },
    select: { id: true },
  });
  if (!recording) return null;

  const existing = await db.audioFavorite.findUnique({
    where: { userId_uploadedFileId: { userId, uploadedFileId: recordingId } },
    select: { id: true },
  });

  if (existing) {
    await db.audioFavorite.delete({ where: { id: existing.id } });
    return { bookmarked: false };
  }
  await db.audioFavorite.create({ data: { userId, uploadedFileId: recordingId } });
  return { bookmarked: true };
}

/**
 * Delete a recording AND everything derived from it: all UploadedFileVersion
 * rows + their storage files (original + enhanced audio), the transcript,
 * bookmarks, playback history, playlist items, and moderation queue entries.
 * Storage deletes are best-effort — a failed file delete must not block the
 * DB removal (orphaned bytes are preferable to a stuck row).
 */
export async function deleteRecording(recordingId: string, userId: string): Promise<boolean> {
  const recording = await db.uploadedFile.findFirst({
    where: { id: recordingId, userId, format: 'audio' },
    select: { id: true, storagePath: true, versions: { select: { storagePath: true } } },
  });
  if (!recording) return false;

  // Best-effort storage cleanup — never blocks the DB transaction.
  const paths = [recording.storagePath, ...recording.versions.map((v) => v.storagePath)];
  await Promise.allSettled(paths.map((p) => (p ? storage.delete(p) : Promise.resolve())));

  await db.$transaction([
    db.audioFavorite.deleteMany({ where: { uploadedFileId: recordingId } }),
    db.playbackHistory.deleteMany({ where: { uploadedFileId: recordingId } }),
    db.playlistItem.deleteMany({ where: { uploadedFileId: recordingId } }),
    db.moderationQueue.deleteMany({ where: { uploadedFileId: recordingId } }),
    db.uploadedFileVersion.deleteMany({ where: { fileId: recordingId } }),
    db.uploadedFile.delete({ where: { id: recordingId } }),
  ]);
  return true;
}

/** Record a playback event (Media Session / player integration). */
export async function recordPlayback(input: {
  userId: string;
  uploadedFileId?: string | null;
  compositionId?: string | null;
  durationSeconds?: number | null;
  completed?: boolean;
}) {
  return db.playbackHistory.create({
    data: {
      userId: input.userId,
      uploadedFileId: input.uploadedFileId ?? null,
      compositionId: input.compositionId ?? null,
      durationSeconds: input.durationSeconds ?? null,
      completed: input.completed ?? false,
    },
  });
}
