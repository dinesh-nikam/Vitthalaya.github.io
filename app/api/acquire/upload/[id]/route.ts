/**
 * Digital Pandharpur — Upload Status API (owner-gated)
 *
 * GET /api/acquire/upload/[id]
 *
 * Returns the live processing state of an upload so the /record page can show
 * honest progress (transcribing → completed | transcription_failed) without
 * faking anything. Access is limited to the upload owner (or moderators), and
 * non-existent/foreign uploads return 404 so existence is not leaked.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';
import {
  getCompositionMatches,
  MATCH_CONFIRM_THRESHOLD,
} from '@/src/canonical/composition-matcher';
import { getLatestCorrection } from '@/src/canonical/canonical-corrector';
import { ApiErrors } from '@/src/lib/api-response';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;

  if (!userId) {
    return ApiErrors.UNAUTHORIZED('Unauthorized.');
  }

  const upload = await db.uploadedFile.findUnique({
    where: { id: (await params).id },
    select: {
      id: true,
      userId: true,
      originalName: true,
      format: true,
      processingStatus: true,
      processingSteps: true,
      extractedText: true,
      extractionConfidence: true,
      extractedMetadata: true,
    },
  });

  // 404 (not 403) for both missing and foreign uploads — no existence leak.
  if (!upload || (upload.userId !== userId && role !== 'ADMIN' && role !== 'MODERATOR')) {
    return ApiErrors.NOT_FOUND('Not found.');
  }

  const [job, moderation, rightsRecord, matches, correction] = await Promise.all([
    db.audioProcessingJob.findFirst({
      where: { uploadId: upload.id, status: { in: ['pending', 'processing', 'failed'] } },
      orderBy: { createdAt: 'desc' },
      select: { status: true, attempts: true, maxAttempts: true, errorMessage: true },
    }),
    db.moderationQueue.findFirst({
      where: { uploadedFileId: upload.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, draftTitle: true },
    }),
    db.rightsRecord.findUnique({
      where: { uploadedFileId: upload.id },
      select: { rightsStatus: true, consentGranted: true, publicationPermission: true },
    }),
    getCompositionMatches(upload.id),
    getLatestCorrection(upload.id),
  ]);

  let audioUrl: string | null = null;
  let enhancement: Record<string, unknown> | null = null;
  if (upload.extractedMetadata) {
    try {
      const metadata = JSON.parse(upload.extractedMetadata);
      if (typeof metadata.audioUrl === 'string') audioUrl = metadata.audioUrl;
      if (metadata.enhancement && typeof metadata.enhancement === 'object') {
        enhancement = metadata.enhancement as Record<string, unknown>;
      }
    } catch {
      // Non-critical — metadata is best-effort
    }
  }

  const canPublish =
    rightsRecord?.publicationPermission === true && rightsRecord.consentGranted === true;

  return NextResponse.json({
    uploadId: upload.id,
    originalName: upload.originalName,
    format: upload.format,
    processingStatus: upload.processingStatus,
    processingSteps: upload.processingSteps,
    extractedText: upload.extractedText,
    extractionConfidence: upload.extractionConfidence,
    audioUrl,
    job: job
      ? {
          status: job.status,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts,
          errorMessage: job.errorMessage,
        }
      : null,
    moderation: moderation
      ? { queueId: moderation.id, status: moderation.status, draftTitle: moderation.draftTitle }
      : null,
    rights: rightsRecord
      ? {
          rightsStatus: rightsRecord.rightsStatus,
          canPublish,
        }
      : null,
    enhancement,
    matches: matches.map((match) => ({
      compositionId: match.compositionId,
      title: match.composition.titleTranslit || match.composition.titleMarathi,
      titleMarathi: match.composition.titleMarathi,
      slug: match.composition.slug,
      type: match.composition.type,
      saintName: match.composition.saint?.nameMarathi ?? null,
      saintTranslit: match.composition.saint?.nameTranslit ?? null,
      score: match.score,
      method: match.method,
      status: match.status,
      userConfirmed: match.userConfirmed,
      matchedText: match.matchedText,
      meetsThreshold: match.score >= MATCH_CONFIRM_THRESHOLD,
    })),
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
  });
}
