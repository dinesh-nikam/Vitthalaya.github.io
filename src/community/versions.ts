/**
 * Digital Pandharpur — Composition Version Engine
 *
 * Manages immutable snapshots (CompositionVersion) of composition state.
 * Versions are created when:
 *   - A correction suggestion is approved (primary path)
 *   - An editor makes a direct editorial change
 *   - An initial version is seeded for existing compositions
 */

import { db } from '@/src/db/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateVersionInput {
  compositionId: string;
  changeReason: 'initial' | 'correction' | 'editorial' | 'revert';
  createdByUserId?: string;
  correctionId?: string;
}

// ─── Create Version ──────────────────────────────────────────────────────────

/**
 * Snapshot the current state of a composition as a new version.
 * Used when an editorial change is made directly (not via correction).
 */
export async function createCompositionVersion(input: CreateVersionInput) {
  const composition = await db.composition.findUnique({
    where: { id: input.compositionId },
    select: {
      id: true,
      titleMarathi: true,
      titleTranslit: true,
      fullText: true,
      meaning: true,
    },
  });

  if (!composition) {
    throw new Error(`Composition ${input.compositionId} not found`);
  }

  const latest = await db.compositionVersion.findFirst({
    where: { compositionId: input.compositionId },
    orderBy: { versionNumber: 'desc' },
    select: { versionNumber: true },
  });

  const versionNumber = (latest?.versionNumber ?? 0) + 1;

  return db.compositionVersion.create({
    data: {
      compositionId: input.compositionId,
      versionNumber,
      titleMarathi: composition.titleMarathi,
      titleTranslit: composition.titleTranslit,
      fullText: composition.fullText,
      meaning: composition.meaning,
      changeReason: input.changeReason,
      createdByUserId: input.createdByUserId ?? null,
      correctionId: input.correctionId ?? null,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      correction: {
        select: { id: true, fieldPath: true, newValue: true, reason: true },
      },
    },
  });
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * List all versions of a composition, newest first.
 */
export async function listCompositionVersions(
  compositionId: string,
  options?: { limit?: number; offset?: number }
) {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const [items, total] = await Promise.all([
    db.compositionVersion.findMany({
      where: { compositionId },
      orderBy: { versionNumber: 'desc' },
      take: limit,
      skip: offset,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        correction: {
          select: { id: true, fieldPath: true, oldValue: true, newValue: true, reason: true },
        },
      },
    }),
    db.compositionVersion.count({ where: { compositionId } }),
  ]);

  return { items, total, limit, offset };
}

/**
 * Get a specific version by composition ID and version number.
 */
export async function getCompositionVersion(compositionId: string, versionNumber: number) {
  return db.compositionVersion.findUnique({
    where: {
      compositionId_versionNumber: { compositionId, versionNumber },
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      correction: {
        select: { id: true, fieldPath: true, oldValue: true, newValue: true, reason: true },
      },
    },
  });
}

/**
 * Diff two versions of a composition.
 * Returns the fields that changed between them.
 */
export async function diffVersions(
  compositionId: string,
  fromVersion: number,
  toVersion: number
) {
  const [from, to] = await Promise.all([
    getCompositionVersion(compositionId, fromVersion),
    getCompositionVersion(compositionId, toVersion),
  ]);

  if (!from || !to) {
    throw new Error(
      `Version not found: ${fromVersion} or ${toVersion} for composition ${compositionId}`
    );
  }

  const changes: Record<string, { old: string | null; new: string | null }> = {};
  const fields: string[] = [
    'titleMarathi',
    'titleTranslit',
    'fullText',
    'meaning',
  ];

  for (const field of fields) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oldVal = (from as any)[field] ?? null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newVal = (to as any)[field] ?? null;
    if (oldVal !== newVal) {
      changes[field] = { old: oldVal as string | null, new: newVal as string | null };
    }
  }

  return {
    compositionId,
    fromVersion: from.versionNumber,
    toVersion: to.versionNumber,
    changes,
    hasChanges: Object.keys(changes).length > 0,
  };
}

/**
 * Seed initial version (version 1) for compositions that don't have one.
 * Useful for backfilling existing compositions after the feature is deployed.
 */
export async function seedInitialVersion(compositionId: string) {
  const existing = await db.compositionVersion.findFirst({
    where: { compositionId },
    select: { id: true },
  });

  if (existing) {
    return { skipped: true, reason: 'Already has a version' };
  }

  return createCompositionVersion({
    compositionId,
    changeReason: 'initial',
  });
}
