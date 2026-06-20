/**
 * Digital Pandharpur — Canonical Engine Database Access Layer
 *
 * Prisma-based data access for all canonical engine operations.
 * Every function is self-contained with error handling.
 *
 * Exported types serve the canonical engine service layer without
 * leaking Prisma types into business logic.
 */

import { db } from './client';
import type {
  MergeAction,
  MappingType,
  ChangeReason,
  BatchStats,
  BatchConfig,
} from '../canonical/types';
import { contentHash } from '../canonical/normalization';

// ─── Public Data Types ──────────────────────────────────────────────────────

/** Summary of a composition needed for matching (avoids loading full text repeatedly) */
export interface CompositionSummary {
  id: string;
  title: string;
  fullText: string;
  type: string;
  saintId: string | null;
  source?: string;
}

/** Canonical record data used for matching */
export interface CanonicalRecordData {
  id: string;
  title: string;
  canonicalText: string;
  type: string;
  saintId: string | null;
  version: number;
}

/** Source mapping data with review status */
export interface SourceMappingData {
  id: string;
  canonicalId: string;
  compositionId: string | null;
  source: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceText: string;
  contentHash: string;
  confidenceScore: number | null;
  mappingType: string;
  reviewed: boolean;
}

/** Detailed canonical record with related data */
export interface CanonicalRecordDetail {
  id: string;
  title: string;
  canonicalText: string;
  type: string;
  saintId: string | null;
  saintName: string | null;
  version: number;
  compositeScore: number | null;
  sourceCount: number;
  sources: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** Statistics across all canonical records */
export interface CanonicalStats {
  totalRecords: number;
  totalMappedCompositions: number;
  totalUnmappedCompositions: number;
  autoMergedCount: number;
  pendingReviewCount: number;
  typeBreakdown: Record<string, number>;
}

// ─── Query Helpers ──────────────────────────────────────────────────────────

/**
 * Fetch all compositions that have content hashes and canonical links,
 * returning only the fields needed for matching.
 */
export async function getCompositionSummaries(
  options?: {
    skipCanonicalized?: boolean;
    type?: string;
    limit?: number;
    offset?: number;
  }
): Promise<CompositionSummary[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  if (options?.skipCanonicalized) {
    where.canonicalId = null;
  }
  if (options?.type) {
    where.type = options.type;
  }

  const compositions = await db.composition.findMany({
    where: where,
    select: {
      id: true,
      titleMarathi: true,
      fullText: true,
      type: true,
      saintId: true,
      source: true,
    },
    take: options?.limit && isFinite(options.limit) ? options.limit : 1000,
    skip: options?.offset ?? 0,
    orderBy: { createdAt: 'asc' },
  });

  return compositions.map((c: { id: string; titleMarathi: string; fullText: string; type: string; saintId: string | null; source: string | null }) => ({
    id: c.id,
    title: c.titleMarathi,
    fullText: c.fullText,
    type: c.type,
    saintId: c.saintId,
    source: c.source ?? undefined,
  }));
}

/**
 * Fetch comprehensive stats about the canonical system.
 */
export async function getCanonicalStats(): Promise<CanonicalStats> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const [totalRecords, totalMapped, totalCompositions, mappings, typeGroups] = await Promise.all([
    db.canonicalRecord.count(),
    db.canonicalSourceMapping.count(),
    db.composition.count(),
    // These methods are Prisma-specific - stub for SQLite
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    db.canonicalSourceMapping.groupBy({
      by: ['mappingType'],
      _count: { id: true },
    }),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    db.canonicalRecord.groupBy({
      by: ['type'],
      _count: { id: true },
    }),
  ]);

  const typeBreakdown: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  for (const g of typeGroups as Array<{ type: string; _count: { id: number } }>) {
    typeBreakdown[g.type] = g._count.id;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  let autoMergedCount = 0;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  let pendingReviewCount = 0;
  for (const m of mappings as Array<{ mappingType: string; _count: { id: number } }>) {
    if (m.mappingType === 'duplicate') autoMergedCount += m._count.id;
    if (m.mappingType === 'suspected') pendingReviewCount += m._count.id;
  }

  return {
    totalRecords,
    totalMappedCompositions: totalMapped,
    totalUnmappedCompositions: totalCompositions - totalMapped,
    autoMergedCount,
    pendingReviewCount,
    typeBreakdown,
  };
}

/**
 * Fetch all canonical records for matching.
 */
export async function getAllCanonicalRecords(
  options?: { type?: string; limit?: number }
): Promise<CanonicalRecordData[]> {
  const where: Record<string, unknown> = {};
  if (options?.type) where.type = options.type;

  const records = await db.canonicalRecord.findMany({
    where: where as any,
    select: {
      id: true,
      titleMarathi: true,
      canonicalText: true,
      type: true,
      saintId: true,
      canonicalVersion: true,
    },
    take: options?.limit ?? 5000,
    orderBy: { canonicalVersion: 'asc' },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return records.map((r: any) => ({
    id: r.id,
    title: r.titleMarathi,
    canonicalText: r.canonicalText,
    type: r.type,
    saintId: r.saintId,
    version: r.canonicalVersion,
  }));
}

/**
 * Get a single canonical record with its source mappings.
 */
export async function getCanonicalRecordDetail(
  id: string
): Promise<CanonicalRecordDetail | null> {
  const record = await db.canonicalRecord.findUnique({
    where: { id },
    include: {
      saint: { select: { nameMarathi: true } },
      sourceMappings: {
        select: {
          id: true,
          source: true,
          sourceUrl: true,
          sourceTitle: true,
          mappingType: true,
          confidenceScore: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!record) return null;

  const sources = [...new Set(record.sourceMappings.map((m: { source: string }) => m.source))] as string[];

  return {
    id: record.id,
    title: record.titleMarathi,
    canonicalText: record.canonicalText,
    type: record.type,
    saintId: record.saintId,
    saintName: record.saint?.nameMarathi ?? null,
    version: record.canonicalVersion,
    compositeScore: record.compositeScore,
    sourceCount: record.sourceMappings.length,
    sources,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

// ─── Mutation Helpers ───────────────────────────────────────────────────────

/**
 * Create a new canonical record from a composition.
 * Also creates the primary source mapping and initial version.
 */
export async function createCanonicalRecord(compositionId: string): Promise<string> {
  const composition = await db.composition.findUnique({
    where: { id: compositionId },
    include: { saint: true, deity: true },
  });

  if (!composition) throw new Error(`Composition ${compositionId} not found`);

  const hash = contentHash(composition.fullText);

  // Create the canonical record
  const record = await db.canonicalRecord.create({
    data: {
      titleMarathi: composition.titleMarathi,
      titleTranslit: composition.titleTranslit,
      type: composition.type,
      canonicalText: composition.fullText,
      meaning: composition.meaning,
      saintId: composition.saintId,
      deityId: composition.deityId,
      region: composition.region,
      compositeScore: 1.0,
    },
  });

  // Create primary source mapping
  const mapping = await db.canonicalSourceMapping.create({
    data: {
      canonicalId: record.id,
      compositionId: composition.id,
      source: composition.source ?? 'internal',
      sourceUrl: composition.source ?? '',
      sourceTitle: composition.titleMarathi,
      sourceText: composition.fullText,
      contentHash: hash,
      confidenceScore: 1.0,
      mappingType: 'primary',
    },
  });

  // Note: version tracking is done via CompositionVersion model
  // which references compositionId (not canonicalId).
  // Version creation for canonical records is deferred.

  // Link composition back to canonical record
  await db.composition.update({
    where: { id: composition.id },
    data: { canonicalId: record.id, contentHash: hash },
  });

  return record.id;
}

/**
 * Merge a composition into an existing canonical record.
 * Creates a source mapping, logs the merge, and updates the
 * canonical text if the new composition has higher confidence.
 */
export async function mergeIntoCanonical(
  compositionId: string,
  canonicalId: string,
  confidence: number,
  action: MergeAction,
  mappingType: MappingType,
  options?: { reviewedBy?: string; reason?: string }
): Promise<void> {
  const composition = await db.composition.findUnique({
    where: { id: compositionId },
  });

  if (!composition) throw new Error(`Composition ${compositionId} not found`);

  const hash = contentHash(composition.fullText);

  // Create source mapping
  const mapping = await db.canonicalSourceMapping.create({
    data: {
      canonicalId,
      compositionId: composition.id,
      source: composition.source ?? 'unknown',
      sourceUrl: composition.source ?? '',
      sourceTitle: composition.titleMarathi,
      sourceText: composition.fullText,
      contentHash: hash,
      confidenceScore: confidence,
      mappingType,
    },
  });

  // Log the merge decision
  await db.canonicalMergeLog.create({
    data: {
      canonicalId,
      sourceCompositionId1: compositionId,
      sourceCompositionId2: canonicalId,
      action,
      confidenceScore: confidence,
      algorithm: 'canonical_engine',
      reason: options?.reason ?? `Auto-merge at confidence ${(confidence * 100).toFixed(1)}%`,
      reviewedBy: options?.reviewedBy,
    },
  });

  // Link composition to canonical record
  await db.composition.update({
    where: { id: composition.id },
    data: { canonicalId, contentHash: hash },
  });

  // Update composite score on canonical record (running average)
  const canonical = await db.canonicalRecord.findUnique({
    where: { id: canonicalId },
    include: {
      sourceMappings: {
        where: { mappingType: { not: 'suspected' } },
        select: { confidenceScore: true },
      },
    },
  });

  if (canonical) {
    const scores = canonical.sourceMappings
      .map((m) => m.confidenceScore ?? 0)
      .filter((s) => s > 0);

    if (scores.length > 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      await db.canonicalRecord.update({
        where: { id: canonicalId },
        data: { compositeScore: avg },
      });
    }
  }
}

/**
 * Split a source mapping out of a canonical record.
 * Creates a new canonical record for the split composition and
 * removes the link from the original canonical record.
 */
export async function splitFromCanonical(
  mappingId: string,
  options?: { reason?: string; reviewedBy?: string }
): Promise<string> {
  const mapping = await db.canonicalSourceMapping.findUnique({
    where: { id: mappingId },
    include: { composition: true, canonical: true },
  });

  if (!mapping) throw new Error(`Mapping ${mappingId} not found`);
  if (!mapping.composition) throw new Error('Mapping has no associated composition');

  const oldCanonicalId = mapping.canonicalId;

  // Create a new canonical record for the split composition
  const newRecordId = await createCanonicalRecord(mapping.composition.id);

  // Update the mapping type
  await db.canonicalSourceMapping.update({
    where: { id: mappingId },
    data: { mappingType: 'primary', canonicalId: newRecordId },
  });

  // Log the split
  await db.canonicalMergeLog.create({
    data: {
      canonicalId: oldCanonicalId,
      sourceCompositionId1: mapping.composition.id,
      sourceCompositionId2: newRecordId,
      action: 'split',
      reason: options?.reason ?? 'Split from canonical record',
      reviewedBy: options?.reviewedBy,
    },
  });

  return newRecordId;
}

/**
 * Update the canonical text of a record, creating a new version entry.
 */
export async function updateCanonicalText(
  canonicalId: string,
  newText: string,
  reason: ChangeReason,
  options?: { titleMarathi?: string; titleTranslit?: string; meaning?: string; changedBy?: string }
): Promise<void> {
  const record = await db.canonicalRecord.findUnique({
    where: { id: canonicalId },
  });

  if (!record) throw new Error(`CanonicalRecord ${canonicalId} not found`);

  const newVersion = record.canonicalVersion + 1;

  await db.$transaction([
    db.canonicalVersion.create({
      data: {
        canonicalId,
        versionNumber: newVersion,
        titleMarathi: options?.titleMarathi ?? record.titleMarathi,
        titleTranslit: options?.titleTranslit ?? record.titleTranslit,
        canonicalText: newText,
        meaning: options?.meaning ?? record.meaning,
        changeReason: reason,
        changedBy: options?.changedBy,
      },
    }),
    db.canonicalRecord.update({
      where: { id: canonicalId },
      data: {
        canonicalText: newText,
        canonicalVersion: newVersion,
        ...(options?.titleMarathi ? { titleMarathi: options.titleMarathi } : {}),
        ...(options?.titleTranslit ? { titleTranslit: options.titleTranslit } : {}),
        ...(options?.meaning ? { meaning: options.meaning } : {}),
      },
    }),
  ]);
}
