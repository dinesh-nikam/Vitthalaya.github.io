/**
 * Digital Pandharpur — Composition Match Confirmation API (owner-gated)
 *
 * POST /api/acquire/match
 *   { uploadId, compositionId, action: 'confirm' | 'reject' }
 *
 * The matcher only ever *suggests* candidates (score ≥ threshold); this is
 * the explicit user action that confirms or rejects one. Access is limited
 * to the upload owner (or moderators/admins).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';
import {
  confirmCompositionMatch,
  rejectCompositionMatch,
  getCompositionMatches,
} from '@/src/canonical/composition-matcher';
import { runCanonicalCorrection } from '@/src/canonical/canonical-corrector';
import { ApiErrors } from '@/src/lib/api-response';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;

  if (!userId) {
    return ApiErrors.UNAUTHORIZED('Unauthorized.');
  }

  let body: { uploadId?: string; compositionId?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return ApiErrors.BAD_REQUEST('Invalid JSON body.');
  }

  const { uploadId, compositionId, action } = body;
  if (!uploadId || !compositionId) {
    return ApiErrors.BAD_REQUEST('uploadId and compositionId are required.');
  }
  if (action !== 'confirm' && action !== 'reject') {
    return ApiErrors.BAD_REQUEST('action must be "confirm" or "reject".');
  }

  const upload = await db.uploadedFile.findUnique({
    where: { id: uploadId },
    select: { id: true, userId: true },
  });

  // 404 (not 403) for foreign/missing uploads — no existence leak.
  if (!upload || (upload.userId !== userId && role !== 'ADMIN' && role !== 'MODERATOR')) {
    return ApiErrors.NOT_FOUND('Not found.');
  }

  let correction: Record<string, unknown> | null = null;

  if (action === 'confirm') {
    await confirmCompositionMatch(uploadId, compositionId);

    // Now that the identity is confirmed, align the ASR against the canonical
    // text (conservatively — original ASR stays verbatim, only confident lines
    // are corrected) and store a pending TranscriptCorrection.
    try {
      const [uploadRow, compositionRow] = await Promise.all([
        db.uploadedFile.findUnique({
          where: { id: uploadId },
          select: { extractedText: true, extractedMetadata: true },
        }),
        db.composition.findUnique({
          where: { id: compositionId },
          select: { id: true },
        }),
      ]);

      if (uploadRow?.extractedText && compositionRow) {
        let transcriptionMethod: string | null = null;
        if (uploadRow.extractedMetadata) {
          try {
            const meta = JSON.parse(uploadRow.extractedMetadata);
            if (typeof meta.transcriptionMethod === 'string') {
              transcriptionMethod = meta.transcriptionMethod;
            }
          } catch {
            // best-effort
          }
        }

        const result = await runCanonicalCorrection({
          uploadedFileId: uploadId,
          transcript: uploadRow.extractedText,
          authorId: userId,
          modelVersion: transcriptionMethod ?? 'whisper-1',
        });

        correction = {
          correctionId: result.correctionId,
          changed: result.changed,
          reason: result.reason ?? null,
          confidence: result.confidence,
          errorType: result.errorType,
          correctedText: result.correctedText,
          originalAsr: result.originalAsr,
          linesCorrected: result.linesCorrected,
          wordsChanged: result.wordsChanged,
        };
      }
    } catch (err) {
      // Correction is supplementary — never fail the confirmation because of it.
      console.warn('[Match API] Correction generation failed:', err);
    }
  } else {
    await rejectCompositionMatch(uploadId, compositionId);
  }

  const matches = await getCompositionMatches(uploadId);

  return NextResponse.json({
    success: true,
    action,
    correction,
    matches: matches.map((match) => ({
      compositionId: match.compositionId,
      title: match.composition.titleTranslit || match.composition.titleMarathi,
      titleMarathi: match.composition.titleMarathi,
      slug: match.composition.slug,
      score: match.score,
      method: match.method,
      status: match.status,
      userConfirmed: match.userConfirmed,
      matchedText: match.matchedText,
    })),
  });
}
