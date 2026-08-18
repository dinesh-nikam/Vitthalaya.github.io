/**
 * Digital Pandharpur — Manual Transcript Correction API (owner-gated)
 *
 * POST /api/acquire/upload/[id]/correction
 *
 * Lets the upload owner submit a hand-edited transcript. The original ASR is
 * preserved verbatim (never overwritten); the user's edit becomes the
 * correctedText, and an honest word-level diff is recomputed against the
 * original ASR via alignManualEdit before saving through the shared
 * saveTranscriptCorrection (one pending correction per upload).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';
import {
  alignManualEdit,
  saveTranscriptCorrection,
  getLatestCorrection,
} from '@/src/canonical/canonical-corrector';
import {
  checkUserRateLimit,
  rateLimitExceededResponse,
  addRateLimitHeaders,
} from '@/src/lib/api-auth';
import { ApiErrors } from '@/src/lib/api-response';

// Per-user corrections per minute — manual edits are human-paced, so a
// generous window; in-memory like the v1 API-key limiter (Redis in prod).
const CORRECTION_RATE_LIMIT_PER_MINUTE = 30;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;

  if (!userId) {
    return ApiErrors.UNAUTHORIZED('Unauthorized.');
  }

  // Per-user rate limit — checked before the DB lookup so an abusive client
  // can't hammer the query path.
  const rateLimit = checkUserRateLimit(userId, CORRECTION_RATE_LIMIT_PER_MINUTE, 'correction');
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.resetAt);
  }
  const withRateHeaders = (res: NextResponse) =>
    addRateLimitHeaders(res, rateLimit.remaining, rateLimit.resetAt);

  const upload = await db.uploadedFile.findUnique({
    where: { id: (await params).id },
    select: {
      id: true,
      userId: true,
      extractedText: true,
      extractedMetadata: true,
    },
  });

  // 404 (not 403) for both missing and foreign uploads — no existence leak.
  if (!upload || (upload.userId !== userId && role !== 'ADMIN' && role !== 'MODERATOR')) {
    return withRateHeaders(ApiErrors.NOT_FOUND('Not found.'));
  }

  let body: { correctedText?: unknown };
  try {
    body = await request.json();
  } catch {
    return withRateHeaders(ApiErrors.BAD_REQUEST('Invalid JSON body.'));
  }

  const correctedText =
    typeof body.correctedText === 'string' ? body.correctedText.trim() : '';
  if (correctedText.length === 0) {
    return withRateHeaders(
      ApiErrors.BAD_REQUEST('correctedText is required and must not be empty.')
    );
  }

  const originalAsr = upload.extractedText ?? '';
  if (originalAsr.trim().length === 0) {
    return withRateHeaders(
      ApiErrors.BAD_REQUEST('No original transcript available to correct.')
    );
  }

  // Recompute an honest diff against the original ASR — the user's edit is
  // kept verbatim, nothing is silently re-corrected or reordered.
  const manual = alignManualEdit(originalAsr, correctedText);

  let canonicalText = '';
  const latest = await getLatestCorrection(upload.id);
  if (latest?.canonicalText) {
    canonicalText = latest.canonicalText;
  }

  let transcriptionMethod: string | null = null;
  if (upload.extractedMetadata) {
    try {
      const meta = JSON.parse(upload.extractedMetadata);
      if (typeof meta.transcriptionMethod === 'string') {
        transcriptionMethod = meta.transcriptionMethod;
      }
    } catch {
      // best-effort
    }
  }

  const saved = await saveTranscriptCorrection({
    uploadedFileId: upload.id,
    authorId: userId,
    originalAsr: manual.originalAsr,
    correctedText: manual.correctedText,
    canonicalText,
    diffJson: manual.diffJson,
    confidence: manual.confidence,
    errorType: manual.errorType,
    modelVersion: transcriptionMethod ? `${transcriptionMethod}+manual-edit` : 'manual-edit',
    notes: 'Manual correction submitted by the upload owner.',
  });

  const correction = await getLatestCorrection(upload.id);

  return withRateHeaders(NextResponse.json({
    success: true,
    correctionId: saved.id,
    changed: manual.changed,
    confidence: manual.confidence,
    errorType: manual.errorType,
    linesTotal: manual.linesTotal,
    linesCorrected: manual.linesCorrected,
    wordsChanged: manual.wordsChanged,
    correction: correction
      ? {
          id: correction.id,
          originalAsr: correction.originalAsr,
          correctedText: correction.correctedText,
          canonicalText: correction.canonicalText,
          confidence: correction.confidence,
          errorType: correction.errorType,
          status: correction.status,
          createdAt: correction.createdAt,
          diffJson: (() => {
            try {
              return correction.diffJson ? JSON.parse(correction.diffJson) : null;
            } catch {
              return null;
            }
          })(),
        }
      : null,
  }));
}
