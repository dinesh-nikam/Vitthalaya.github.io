/**
 * Digital Pandharpur — Verification & Trust Score Engine
 *
 * Calculates and maintains trust scores for compositions based on:
 *   - Number of independent sources (sourceCount)
 *   - Temple/manuscript verification (templeVerification)
 *   - Scholar review confirmation (scholarReview)
 *   - Community confirmation count (communityConfirmations)
 *   - Age of content in days (ageDays)
 *
 * Trust score formula (0.0 – 1.0):
 *   base = 0.1
 *   + sourceCount * 0.15 (capped at 0.45)
 *   + templeVerification * 0.15
 *   + scholarReview * 0.15
 *   + min(communityConfirmations * 0.02, 0.10)
 *   + min(ageDays / 365 * 0.05, 0.05)
 *
 * A score above 0.7 is considered "verified".
 * A score above 0.4 is considered "plausible".
 */

import { db } from '@/src/db/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VerificationFactors {
  sourceCount: number;
  templeVerification: boolean;
  scholarReview: boolean;
  communityConfirmations: number;
  ageDays: number;
}

// ─── Trust Score Calculation ─────────────────────────────────────────────────

/**
 * Calculate the trust score from raw factors.
 * Returns a value between 0.0 and 1.0.
 */
export function calculateTrustScore(factors: VerificationFactors): number {
  const base = 0.1;
  const sourceWeight = Math.min(factors.sourceCount * 0.15, 0.45);
  const templeWeight = factors.templeVerification ? 0.15 : 0;
  const scholarWeight = factors.scholarReview ? 0.15 : 0;
  const communityWeight = Math.min(factors.communityConfirmations * 0.02, 0.10);
  const ageWeight = Math.min((factors.ageDays / 365) * 0.05, 0.05);

  return Math.min(base + sourceWeight + templeWeight + scholarWeight + communityWeight + ageWeight, 1.0);
}

// ─── Fetch / Calculate / Upsert Verification Record ─────────────────────────

/**
 * Calculate verification factors for a composition from available data.
 */
async function calculateVerificationFactors(compositionId: string): Promise<VerificationFactors> {
  const composition = await db.composition.findUnique({
    where: { id: compositionId },
    select: {
      id: true,
      createdAt: true,
      source: true,
      _count: {
        select: {
          sourceMappings: true,
        },
      },
    },
  });

  if (!composition) {
    throw new Error(`Composition ${compositionId} not found`);
  }

  // Count approved corrections as community confirmations
  const correctionCount = await db.correctionSuggestion.count({
    where: {
      compositionId,
      status: 'approved',
    },
  });

  // Calculate age in days
  const ageMs = Date.now() - composition.createdAt.getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

  return {
    sourceCount: composition._count.sourceMappings + (composition.source ? 1 : 0),
    templeVerification: false, // Phase 1: no temple verification data yet
    scholarReview: false, // Phase 1: no scholar review system yet
    communityConfirmations: correctionCount,
    ageDays,
  };
}

/**
 * Get or create the verification record for a composition.
 */
export async function getVerificationRecord(compositionId: string) {
  let record = await db.verificationRecord.findUnique({
    where: { compositionId },
  });

  if (!record) {
    const factors = await calculateVerificationFactors(compositionId);
    const trustScore = calculateTrustScore(factors);

    record = await db.verificationRecord.create({
      data: {
        compositionId,
        trustScore,
        sourceCount: factors.sourceCount,
        templeVerification: factors.templeVerification,
        scholarReview: factors.scholarReview,
        communityConfirmations: factors.communityConfirmations,
        ageDays: factors.ageDays,
        calculatedAt: new Date(),
      },
    });
  }

  return record;
}

/**
 * Recalculate and update the verification record for a composition.
 * Called when a correction is approved or new source data is added.
 */
export async function updateVerificationFromCorrection(
  tx: any,
  compositionId: string
): Promise<void> {
  // Count approved corrections
  const correctionCount = await tx.correctionSuggestion.count({
    where: { compositionId, status: 'approved' },
  });

  // Get composition age
  const composition = await tx.composition.findUnique({
    where: { id: compositionId },
    select: { createdAt: true, source: true },
  });

  if (!composition) return;

  const ageMs = Date.now() - composition.createdAt.getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

  // Count source mappings
  const sourceMappingCount = await tx.canonicalSourceMapping.count({
    where: { compositionId },
  });

  const factors: VerificationFactors = {
    sourceCount: sourceMappingCount + (composition.source ? 1 : 0),
    templeVerification: false,
    scholarReview: false,
    communityConfirmations: correctionCount,
    ageDays,
  };

  const trustScore = calculateTrustScore(factors);

  // Upsert verification record
  await tx.verificationRecord.upsert({
    where: { compositionId },
    create: {
      compositionId,
      trustScore,
      sourceCount: factors.sourceCount,
      templeVerification: false,
      scholarReview: false,
      communityConfirmations: correctionCount,
      ageDays,
      calculatedAt: new Date(),
    },
    update: {
      trustScore,
      sourceCount: factors.sourceCount,
      communityConfirmations: correctionCount,
      ageDays,
      calculatedAt: new Date(),
    },
  });
}

/**
 * Force recalculate verification for a composition (called by admin tools).
 */
export async function recalculateVerification(compositionId: string) {
  const factors = await calculateVerificationFactors(compositionId);
  const trustScore = calculateTrustScore(factors);

  return db.verificationRecord.upsert({
    where: { compositionId },
    create: {
      compositionId,
      trustScore,
      sourceCount: factors.sourceCount,
      templeVerification: factors.templeVerification,
      scholarReview: factors.scholarReview,
      communityConfirmations: factors.communityConfirmations,
      ageDays: factors.ageDays,
      calculatedAt: new Date(),
    },
    update: {
      trustScore,
      sourceCount: factors.sourceCount,
      communityConfirmations: factors.communityConfirmations,
      ageDays: factors.ageDays,
      calculatedAt: new Date(),
    },
  });
}

/**
 * Get verification stats across all compositions.
 */
export async function getVerificationStats() {
  const records = await db.verificationRecord.findMany({
    select: { trustScore: true },
  });

  if (records.length === 0) {
    return {
      total: 0,
      averageTrustScore: 0,
      verified: 0,
      plausible: 0,
      low: 0,
    };
  }

  const average = records.reduce((sum, r) => sum + r.trustScore, 0) / records.length;
  const verified = records.filter((r) => r.trustScore >= 0.7).length;
  const plausible = records.filter((r) => r.trustScore >= 0.4 && r.trustScore < 0.7).length;
  const low = records.filter((r) => r.trustScore < 0.4).length;

  return {
    total: records.length,
    averageTrustScore: Math.round(average * 100) / 100,
    verified,
    plausible,
    low,
  };
}
