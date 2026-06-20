/**
 * Digital Pandharpur — Community Correction Suggestion Engine
 *
 * Core CRUD + review workflow for user-submitted corrections to compositions.
 * State machine: draft → submitted → in_review → approved / rejected
 *
 * On approval, atomically:
 *   1. Updates the composition field
 *   2. Creates a CompositionVersion snapshot
 *   3. Updates the VerificationRecord
 *   4. Awards reputation points to the submitter
 */

import { db } from '@/src/db/client';
import type { Prisma } from '@prisma/client';
import { createCompositionVersion } from './versions';
import { updateVerificationFromCorrection } from './verification';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SubmitCorrectionInput {
  compositionId: string;
  userId: string;
  fieldPath: string;
  newValue: string;
  reason?: string;
  diffJson?: unknown;
}

export interface ReviewCorrectionInput {
  correctionId: string;
  reviewerId: string;
  action: 'approve' | 'reject';
  reviewerNotes?: string;
}

export interface CorrectionListOptions {
  status?: string;
  compositionId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

// ─── Field validation ────────────────────────────────────────────────────────

const VALID_FIELDS = new Set([
  'titleMarathi',
  'titleTranslit',
  'fullText',
  'meaning',
  'region',
  'source',
]);

function validateFieldPath(fieldPath: string): string | null {
  if (!VALID_FIELDS.has(fieldPath)) {
    return `Invalid field: "${fieldPath}". Valid fields: ${[...VALID_FIELDS].join(', ')}`;
  }
  return null;
}

// ─── Create / Submit ─────────────────────────────────────────────────────────

/**
 * Create a new correction suggestion in draft status.
 */
export async function createCorrection(input: SubmitCorrectionInput) {
  const fieldError = validateFieldPath(input.fieldPath);
  if (fieldError) {
    throw new Error(fieldError);
  }

  // Verify composition exists
  const composition = await db.composition.findUnique({
    where: { id: input.compositionId },
    select: { id: true, [input.fieldPath]: true },
  });

  if (!composition) {
    throw new Error(`Composition ${input.compositionId} not found`);
  }

  const oldValue = String((composition as Record<string, unknown>)[input.fieldPath] ?? '');

  return db.correctionSuggestion.create({
    data: {
      compositionId: input.compositionId,
      userId: input.userId,
      fieldPath: input.fieldPath,
      oldValue,
      newValue: input.newValue,
      reason: input.reason,
      diffJson: input.diffJson as Prisma.InputJsonValue ?? undefined,
      status: 'draft',
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      composition: { select: { id: true, titleMarathi: true, slug: true } },
    },
  });
}

/**
 * Submit a draft correction for review (draft → submitted).
 */
export async function submitCorrection(correctionId: string, userId: string) {
  const correction = await db.correctionSuggestion.findUnique({
    where: { id: correctionId },
  });

  if (!correction) {
    throw new Error(`Correction ${correctionId} not found`);
  }

  if (correction.userId !== userId) {
    throw new Error('Only the author can submit this correction');
  }

  if (correction.status !== 'draft') {
    throw new Error(`Cannot submit correction in status "${correction.status}". Must be "draft".`);
  }

  return db.correctionSuggestion.update({
    where: { id: correctionId },
    data: { status: 'submitted' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      composition: { select: { id: true, titleMarathi: true, slug: true } },
    },
  });
}

/**
 * Withdraw a submitted correction back to draft (submitted → draft).
 */
export async function withdrawCorrection(correctionId: string, userId: string) {
  const correction = await db.correctionSuggestion.findUnique({
    where: { id: correctionId },
  });

  if (!correction) throw new Error(`Correction ${correctionId} not found`);
  if (correction.userId !== userId) throw new Error('Only the author can withdraw this correction');
  if (correction.status !== 'submitted') {
    throw new Error(`Cannot withdraw correction in status "${correction.status}".`);
  }

  return db.correctionSuggestion.update({
    where: { id: correctionId },
    data: { status: 'draft' },
  });
}

// ─── Review workflow ─────────────────────────────────────────────────────────

/**
 * Transition a correction to in_review status.
 * Called when an editor/scholar begins reviewing.
 */
export async function startReview(correctionId: string, reviewerId: string) {
  const correction = await db.correctionSuggestion.findUnique({
    where: { id: correctionId },
  });

  if (!correction) throw new Error(`Correction ${correctionId} not found`);

  if (correction.status !== 'submitted') {
    throw new Error(
      `Cannot review correction in status "${correction.status}". Must be "submitted".`
    );
  }

  return db.correctionSuggestion.update({
    where: { id: correctionId },
    data: {
      status: 'in_review',
      reviewerId,
    },
  });
}

/**
 * Approve or reject a correction suggestion.
 *
 * On approval, atomically:
 *   1. Updates the composition field
 *   2. Creates a CompositionVersion snapshot
 *   3. Updates the VerificationRecord
 *   4. Awards reputation points
 */
export async function reviewCorrection(input: ReviewCorrectionInput) {
  const { correctionId, reviewerId, action, reviewerNotes } = input;

  // Fetch correction with composition
  const correction = await db.correctionSuggestion.findUnique({
    where: { id: correctionId },
    include: {
      composition: true,
    },
  });

  if (!correction) throw new Error(`Correction ${correctionId} not found`);

  if (correction.status !== 'in_review' && correction.status !== 'submitted') {
    throw new Error(
      `Cannot ${action} correction in status "${correction.status}". Must be "submitted" or "in_review".`
    );
  }

  // Use a transaction for atomicity
  const result = await db.$transaction(async (tx) => {
    // Update the correction record
    const updated = await tx.correctionSuggestion.update({
      where: { id: correctionId },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewerId,
        reviewerNotes: reviewerNotes ?? null,
        reviewedAt: new Date(),
      },
    });

    if (action === 'approve') {
      // 1. Update the composition field
      const updateData: Record<string, unknown> = {};
      updateData[correction.fieldPath] = correction.newValue;

      await tx.composition.update({
        where: { id: correction.compositionId },
        data: updateData as any,
      });

      // 2. Create a CompositionVersion snapshot
      const version = await tx.compositionVersion.create({
        data: {
          compositionId: correction.compositionId,
          versionNumber: await getNextVersionNumber(tx, correction.compositionId),
          titleMarathi: correction.composition.titleMarathi,
          titleTranslit: correction.composition.titleTranslit,
          fullText: correction.composition.fullText,
          meaning: correction.composition.meaning,
          changeReason: 'correction',
          createdByUserId: correction.userId,
          correctionId: correction.id,
        },
      });

      // 3. Update verification record
      await updateVerificationFromCorrection(tx, correction.compositionId);

      // 5. Award reputation points (10 per approved correction)
      await tx.user.update({
        where: { id: correction.userId },
        data: { reputationScore: { increment: 10 } },
      });
    }

    return updated;
  });

  return result;
}

/**
 * Batch-approve multiple corrections.
 */
export async function batchApproveCorrections(
  correctionIds: string[],
  reviewerId: string
): Promise<{ approved: number; errors: string[] }> {
  let approved = 0;
  const errors: string[] = [];

  for (const id of correctionIds) {
    try {
      await reviewCorrection({
        correctionId: id,
        reviewerId,
        action: 'approve',
      });
      approved++;
    } catch (err) {
      errors.push(`${id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { approved, errors };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * List correction suggestions with optional filtering.
 */
export async function listCorrections(options: CorrectionListOptions) {
  const { status, compositionId, userId, limit = 50, offset = 0 } = options;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (compositionId) where.compositionId = compositionId;
  if (userId) where.userId = userId;

  const [items, total] = await Promise.all([
    db.correctionSuggestion.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true, email: true } },
        composition: { select: { id: true, titleMarathi: true, slug: true, type: true } },
        version: { select: { id: true, versionNumber: true, createdAt: true } },
      },
    }),
    db.correctionSuggestion.count({ where: where as any }),
  ]);

  return { items, total, limit, offset };
}

/**
 * Get a single correction by ID.
 */
export async function getCorrection(id: string) {
  return db.correctionSuggestion.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, reputationScore: true } },
      reviewer: { select: { id: true, name: true, email: true } },
      composition: {
        select: { id: true, titleMarathi: true, titleTranslit: true, slug: true, type: true },
      },
      version: { select: { id: true, versionNumber: true, createdAt: true } },
    },
  });
}

/**
 * Get correction stats (counts by status).
 */
export async function getCorrectionStats() {
  const counts = await db.correctionSuggestion.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const stats: Record<string, number> = {};
  for (const row of counts) {
    stats[row.status] = row._count.id;
  }

  return stats;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Get the next version number for a composition.
 */
async function getNextVersionNumber(tx: any, compositionId: string): Promise<number> {
  const latest = await tx.compositionVersion.findFirst({
    where: { compositionId },
    orderBy: { versionNumber: 'desc' },
    select: { versionNumber: true },
  });

  return (latest?.versionNumber ?? 0) + 1;
}
