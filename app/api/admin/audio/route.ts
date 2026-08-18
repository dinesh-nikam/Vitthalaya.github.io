/**
 * Digital Pandharpur — Admin Audio Dashboard API
 *
 * GET /api/admin/audio
 *
 * Returns everything the audio dashboard needs in one call:
 *   - recording queue (UploadedFile format=audio, with rights + moderation)
 *   - processing queue (AudioProcessingJob pending/processing/failed)
 *   - failed uploads + retry state
 *   - low-confidence transcripts
 *   - rights records grouped by status
 *   - composition match counts
 *   - model version registry + pipeline versions actually in use
 *   - audio quality snapshot (from enhanced-version metadata)
 *   - transcript corrections (pending/approved/rejected) with confidence + error type
 *   - discovery analytics: compositions per source family, OCR review queue,
 *     and canonical variant-record counts (linked OCR-vs-canonical pairs)
 */

import { NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { requireAdmin } from '@/src/lib/require-admin';

export const dynamic = 'force-dynamic';

const LOW_CONFIDENCE_THRESHOLD = 0.5;
const FAILED_STATUSES = ['failed', 'transcription_failed', 'needs_audio_processing'];

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const [
      recordingsTotal,
      recordingsCompleted,
      recordingsTranscribing,
      recordingsFailed,
      recordingModerationPending,
      jobsPending,
      jobsProcessing,
      jobsCompleted,
      jobsFailed,
      lowConfidenceCount,
      rightsTotal,
      rightsByStatus,
      rightsWithConsent,
      rightsWithPermission,
      matchCounts,
      modelVersions,
      recordings,
      processingQueue,
      failedUploads,
      lowConfidence,
      rightsRecords,
      enhancedVersions,
      correctionsByStatus,
      corrections,
      compositionSources,
      reviewQueueTotal,
      reviewQueueOcr,
      versionTotal,
      variantOcr,
      variantsByReason,
    ] = await Promise.all([
      db.uploadedFile.count({ where: { format: 'audio' } }),
      db.uploadedFile.count({ where: { format: 'audio', processingStatus: 'completed' } }),
      db.uploadedFile.count({ where: { format: 'audio', processingStatus: 'transcribing' } }),
      db.uploadedFile.count({
        where: { format: 'audio', processingStatus: { in: FAILED_STATUSES } },
      }),
      db.moderationQueue.count({ where: { sourceType: 'recording', status: 'pending' } }),
      db.audioProcessingJob.count({ where: { status: 'pending' } }),
      db.audioProcessingJob.count({ where: { status: 'processing' } }),
      db.audioProcessingJob.count({ where: { status: 'completed' } }),
      db.audioProcessingJob.count({ where: { status: 'failed' } }),
      db.uploadedFile.count({
        where: {
          processingStatus: 'completed',
          extractedText: { not: null },
          extractionConfidence: { not: null, lt: LOW_CONFIDENCE_THRESHOLD },
        },
      }),
      db.rightsRecord.count(),
      db.rightsRecord.groupBy({ by: ['rightsStatus'], _count: { _all: true } }),
      db.rightsRecord.count({ where: { consentGranted: true } }),
      db.rightsRecord.count({ where: { publicationPermission: true } }),
      db.compositionMatch.groupBy({ by: ['status'], _count: { _all: true } }),
      db.modelVersion.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
      db.uploadedFile.findMany({
        where: { format: 'audio' },
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: {
          id: true,
          originalName: true,
          processingStatus: true,
          processingSteps: true,
          extractionConfidence: true,
          extractedText: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
          rightsRecord: { select: { rightsStatus: true, publicationPermission: true, consentGranted: true } },
          moderationQueue: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, status: true, sourceType: true },
          },
        },
      }),
      db.audioProcessingJob.findMany({
        where: { status: { in: ['pending', 'processing', 'failed'] } },
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: {
          id: true,
          kind: true,
          status: true,
          attempts: true,
          maxAttempts: true,
          errorMessage: true,
          createdAt: true,
          upload: { select: { originalName: true, processingStatus: true } },
        },
      }),
      db.uploadedFile.findMany({
        where: { processingStatus: { in: FAILED_STATUSES } },
        orderBy: { updatedAt: 'desc' },
        take: 25,
        select: {
          id: true,
          originalName: true,
          format: true,
          processingStatus: true,
          extractionConfidence: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
      db.uploadedFile.findMany({
        where: {
          processingStatus: 'completed',
          extractedText: { not: null },
          extractionConfidence: { not: null, lt: LOW_CONFIDENCE_THRESHOLD },
        },
        orderBy: { extractionConfidence: 'asc' },
        take: 25,
        select: {
          id: true,
          originalName: true,
          extractionConfidence: true,
          extractedText: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
      db.rightsRecord.findMany({
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: {
          id: true,
          rightsStatus: true,
          consentGranted: true,
          publicationPermission: true,
          attribution: true,
          license: true,
          createdAt: true,
          upload: { select: { originalName: true } },
          user: { select: { name: true, email: true } },
        },
      }),
      db.uploadedFileVersion.findMany({
        where: { label: 'enhanced' },
        orderBy: { createdAt: 'desc' },
        take: 300,
        select: { metadata: true },
      }),
      db.transcriptCorrection.groupBy({ by: ['status'], _count: { _all: true } }),
      db.transcriptCorrection.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          status: true,
          confidence: true,
          errorType: true,
          modelVersion: true,
          originalAsr: true,
          correctedText: true,
          canonicalText: true,
          diffJson: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          upload: {
            select: {
              id: true,
              originalName: true,
              processingStatus: true,
              extractionConfidence: true,
              moderationQueue: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { id: true, status: true, sourceType: true },
              },
              user: { select: { name: true, email: true } },
            },
          },
          author: { select: { name: true, email: true } },
          verifier: { select: { name: true, email: true } },
        },
      }),
      db.composition.groupBy({
        by: ['source'],
        _count: { _all: true },
        orderBy: { _count: { source: 'desc' } },
        take: 300,
      }),
      db.composition.count({ where: { reviewed: false } }),
      db.composition.count({
        where: {
          reviewed: false,
          OR: [{ source: { contains: 'Internet Archive' } }, { source: { contains: 'archive.org' } }],
        },
      }),
      db.compositionVersion.count(),
      db.compositionVersion.count({ where: { changeReason: { contains: 'OCR variant' } } }),
      db.compositionVersion.groupBy({
        by: ['changeReason'],
        _count: { _all: true },
        orderBy: { _count: { changeReason: 'desc' } },
        take: 10,
      }),
    ]);

    // Model version visibility: registry rows + which pipeline versions the
    // enhanced assets actually used + a quality snapshot from their analysis.
    const pipelineVersions = new Set<string>();
    let analyzedCount = 0;
    let loudnessSum = 0;
    for (const version of enhancedVersions) {
      if (!version.metadata) continue;
      try {
        const meta = JSON.parse(version.metadata);
        if (typeof meta.pipelineVersion === 'string') {
          pipelineVersions.add(meta.pipelineVersion);
        }
        const analysis = meta.analysis;
        if (analysis && typeof analysis.loudnessMeanDb === 'number') {
          analyzedCount++;
          loudnessSum += analysis.loudnessMeanDb;
        }
      } catch {
        // skip malformed metadata
      }
    }

    const rightsMap: Record<string, number> = {};
    for (const row of rightsByStatus) {
      rightsMap[row.rightsStatus] = row._count._all;
    }

    const matchMap: Record<string, number> = {};
    for (const row of matchCounts) {
      matchMap[row.status] = row._count._all;
    }

    const correctionMap: Record<string, number> = {};
    for (const row of correctionsByStatus) {
      correctionMap[row.status] = row._count._all;
    }

    // Discovery analytics: compositions per source family (the raw `source`
    // attribution strings carry per-page detail, so bucket them into the three
    // real acquisition families), the OCR review queue (unreviewed rows from
    // archive.org scans), and canonical variant records (linked OCR-vs-canonical
    // pairs stored as CompositionVersion rows).
    const sourceFamilies: Record<string, number> = { internetArchive: 0, wikisource: 0, other: 0 };
    for (const row of compositionSources) {
      const s = row.source ?? '';
      let fam = 'other';
      if (/archive\.org|Internet Archive/i.test(s)) fam = 'internetArchive';
      else if (/wikisource/i.test(s)) fam = 'wikisource';
      sourceFamilies[fam] += row._count._all;
    }
    const topSources = compositionSources
      .slice(0, 12)
      .filter((r) => r.source)
      .map((r) => ({ source: r.source as string, count: r._count._all }));

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      stats: {
        recordings: {
          total: recordingsTotal,
          completed: recordingsCompleted,
          transcribing: recordingsTranscribing,
          failed: recordingsFailed,
          needsReview: recordingModerationPending,
        },
        jobs: {
          pending: jobsPending,
          processing: jobsProcessing,
          completed: jobsCompleted,
          failed: jobsFailed,
        },
        lowConfidence: lowConfidenceCount,
        rights: {
          total: rightsTotal,
          withConsent: rightsWithConsent,
          withPublicationPermission: rightsWithPermission,
          byStatus: rightsMap,
        },
        matches: matchMap,
        modelVersions: modelVersions.length,
        corrections: {
          total: correctionsByStatus.reduce((sum, row) => sum + row._count._all, 0),
          pending: correctionMap['pending'] ?? 0,
          approved: correctionMap['approved'] ?? 0,
          rejected: correctionMap['rejected'] ?? 0,
        },
      },
      recordings,
      processingQueue,
      failedUploads,
      lowConfidence,
      rightsRecords,
      modelVersions,
      corrections,
      pipelineVersions: [...pipelineVersions].sort(),
      audioQuality:
        analyzedCount > 0
          ? {
              analyzedCount,
              avgLoudnessMeanDb: loudnessSum / analyzedCount,
            }
          : null,
      discovery: {
        compositionsBySource: sourceFamilies,
        topSources,
        reviewQueue: {
          total: reviewQueueTotal,
          ocr: reviewQueueOcr,
        },
        variants: {
          total: versionTotal,
          ocrVariant: variantOcr,
          byReason: variantsByReason.map((r) => ({ reason: r.changeReason, count: r._count._all })),
        },
      },
      lowConfidenceThreshold: LOW_CONFIDENCE_THRESHOLD,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Admin Audio API] error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
