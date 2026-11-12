/**
 * Digital Pandharpur — Audio Admin Service
 *
 * Provides aggregated telemetry for the audio platform admin dashboard,
 * including recording processing states, background jobs, rights status distribution,
 * model evaluation metrics, transcript corrections, and discovery analytics.
 */

import { db } from '@/src/db/client';

export const LOW_CONFIDENCE_THRESHOLD = 0.5;
export const FAILED_STATUSES = ['failed', 'transcription_failed', 'needs_audio_processing'];

export interface AudioAdminDashboardResult {
  success: boolean;
  generatedAt: string;
  stats: {
    recordings: {
      total: number;
      completed: number;
      transcribing: number;
      failed: number;
      needsReview: number;
    };
    jobs: {
      pending: number;
      processing: number;
      completed: number;
      failed: number;
    };
    lowConfidence: number;
    rights: {
      total: number;
      withConsent: number;
      withPublicationPermission: number;
      byStatus: Record<string, number>;
    };
    matches: Record<string, number>;
    modelVersions: number;
    corrections: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
    };
  };
  recordings: unknown[];
  processingQueue: unknown[];
  failedUploads: unknown[];
  lowConfidence: unknown[];
  rightsRecords: unknown[];
  modelVersions: unknown[];
  corrections: unknown[];
  pipelineVersions: string[];
  audioQuality: {
    analyzedCount: number;
    avgLoudnessMeanDb: number;
  } | null;
  discovery: {
    compositionsBySource: Record<string, number>;
    topSources: { source: string; count: number }[];
    reviewQueue: {
      total: number;
      ocr: number;
    };
    variants: {
      total: number;
      ocrVariant: number;
      byReason: { reason: string; count: number }[];
    };
  };
  lowConfidenceThreshold: number;
}

export class AudioAdminService {
  /**
   * Fetch and compile the complete administrative audio dashboard snapshot.
   */
  async getDashboardData(): Promise<AudioAdminDashboardResult> {
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
          rightsRecord: {
            select: { rightsStatus: true, publicationPermission: true, consentGranted: true },
          },
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
        // Skip malformed metadata gracefully
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

    const sourceFamilies: Record<string, number> = { internetArchive: 0, wikisource: 0, other: 0 };
    for (const row of compositionSources) {
      const s = row.source ?? '';
      let fam = 'other';
      if (/archive\.org|Internet Archive/i.test(s)) {
        fam = 'internetArchive';
      } else if (/wikisource/i.test(s)) {
        fam = 'wikisource';
      }
      sourceFamilies[fam] += row._count._all;
    }

    const topSources = compositionSources
      .filter((r): r is typeof r & { source: string } => Boolean(r.source))
      .sort((a, b) => b._count._all - a._count._all || a.source.localeCompare(b.source))
      .slice(0, 12)
      .map((r) => ({ source: r.source, count: r._count._all }));

    return {
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
          byReason: variantsByReason
            .filter((r): r is typeof r & { changeReason: string } => Boolean(r.changeReason))
            .sort((a, b) => b._count._all - a._count._all || a.changeReason.localeCompare(b.changeReason))
            .map((r) => ({
              reason: r.changeReason,
              count: r._count._all,
            })),
        },
      },
      lowConfidenceThreshold: LOW_CONFIDENCE_THRESHOLD,
    };
  }
}

export const audioAdminService = new AudioAdminService();
