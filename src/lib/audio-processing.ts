/**
 * Digital Pandharpur — Audio Processing Queue
 *
 * Background jobs that turn audio into transcribed, moderation-ready drafts,
 * drained by the worker daemon (src/cli/worker-runner.ts) off the request path.
 *
 * Two job kinds:
 *   - kind=youtube:    yt-dlp audio download → Whisper transcription
 *                      (YouTube uploads without captions)
 *   - kind=audio_file: Whisper transcription of an already-stored audio file
 *                      (browser recordings from /record)
 *
 * Mirrors the existing SearchSyncJob pattern in src/lib/workers.ts:
 * statuses pending → processing → completed | failed, retried up to
 * maxAttempts, with a PostgreSQL SKIP LOCKED dequeue and a SQLite fallback.
 */

import { db } from '../db/client';
import { storage } from './storage';
import { AudioExtractor } from './extractors/audio-extractor';
import { YouTubeExtractor } from './extractors/youtube-extractor';
import { submitToModeration } from './moderation-workflow';
import { runEnhancementPipeline } from '../audio';
import { runCompositionMatching } from '../canonical/composition-matcher';

export interface EnqueueAudioProcessingInput {
  uploadId: string;
  videoId: string;
  url: string;
}

export interface EnqueueAudioFileTranscriptionInput {
  uploadId: string;
  storagePath: string;
}

/**
 * Enqueue a background job to transcribe a YouTube video's audio.
 * Idempotent per upload: if a pending/failed job already exists for the same
 * upload, no duplicate is created.
 */
export async function enqueueAudioProcessingJob(
  input: EnqueueAudioProcessingInput
): Promise<{ id: string }> {
  const existing = await db.audioProcessingJob.findFirst({
    where: {
      uploadId: input.uploadId,
      kind: 'youtube',
      status: { in: ['pending', 'failed'] },
    },
    select: { id: true },
  });

  if (existing) {
    return { id: existing.id };
  }

  return db.audioProcessingJob.create({
    data: {
      uploadId: input.uploadId,
      kind: 'youtube',
      videoId: input.videoId,
      url: input.url,
      status: 'pending',
      maxAttempts: 3,
    },
    select: { id: true },
  });
}

/**
 * Enqueue a background job to transcribe a stored audio file (browser
 * recording). Idempotent per upload, same as the YouTube variant.
 */
export async function enqueueAudioFileTranscriptionJob(
  input: EnqueueAudioFileTranscriptionInput
): Promise<{ id: string }> {
  const existing = await db.audioProcessingJob.findFirst({
    where: {
      uploadId: input.uploadId,
      kind: 'audio_file',
      status: { in: ['pending', 'failed'] },
    },
    select: { id: true },
  });

  if (existing) {
    return { id: existing.id };
  }

  return db.audioProcessingJob.create({
    data: {
      uploadId: input.uploadId,
      kind: 'audio_file',
      storagePath: input.storagePath,
      status: 'pending',
      maxAttempts: 3,
    },
    select: { id: true },
  });
}

/**
 * Drain pending/failed audio processing jobs. Returns the number of jobs
 * processed (success or terminal failure), matching the other worker
 * functions in src/lib/workers.ts.
 */
export async function processAudioProcessingJobs(): Promise<number> {
  let processedCount = 0;

  while (true) {
    let job: any = null;

    try {
      // PostgreSQL atomic locking dequeue using SKIP LOCKED
      const rows = await db.$queryRawUnsafe(`
        UPDATE "audio_processing_jobs"
        SET status = 'processing', attempts = attempts + 1, updated_at = NOW() AT TIME ZONE 'UTC'
        WHERE id = (
          SELECT id FROM "audio_processing_jobs"
          WHERE status IN ('pending', 'failed') AND attempts < max_attempts
          ORDER BY created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        RETURNING id, kind, upload_id as "uploadId", video_id as "videoId", url,
                  storage_path as "storagePath", status, attempts, max_attempts as "maxAttempts"
      `) as any[];

      if (rows && rows.length > 0) {
        job = rows[0];
      }
    } catch {
      // Fallback simple locking for local development with SQLite/other DBs
      const pendingJob = await db.audioProcessingJob.findFirst({
        where: {
          status: { in: ['pending', 'failed'] },
          attempts: { lt: 3 },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (pendingJob) {
        job = await db.audioProcessingJob.update({
          where: { id: pendingJob.id },
          data: {
            status: 'processing',
            attempts: { increment: 1 },
          },
        });
      }
    }

    if (!job) {
      break;
    }

    try {
      const upload = await db.uploadedFile.findUnique({
        where: { id: job.uploadId },
      });

      if (!upload) {
        throw new Error(`UploadedFile not found: ${job.uploadId}`);
      }

      if (job.kind === 'audio_file') {
        await processAudioFileJob(job, upload);
      } else {
        await processYouTubeJob(job, upload);
      }

      await db.audioProcessingJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          errorMessage: null,
        },
      });

      processedCount++;
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[AudioProcessingWorker] Error processing job ${job.id}:`, err);

      await db.audioProcessingJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          errorMessage: errorMsg,
        },
      });
    }
  }

  return processedCount;
}

// ─── Job handlers ───────────────────────────────────────────────────────────

async function processAudioFileJob(job: any, upload: any): Promise<void> {
  if (!job.storagePath) {
    throw new Error('Audio file job is missing storagePath.');
  }

  // Read the original recording back from storage (never modified in place).
  const buffer = await storage.read(job.storagePath);

  // T2: enhancement pipeline — validate → analyze → enhance → (isolate) → VAD.
  // The original buffer is untouched; an enhanced 16kHz WAV is produced only
  // when ffmpeg is actually available, and every skipped stage is recorded
  // honestly in the version metadata (nothing is faked).
  const pipeline = await runEnhancementPipeline({
    buffer,
    originalName: upload.originalName,
    mimeType: upload.mimeType,
    sizeBytes: upload.sizeBytes,
    isolateVocals: false,
  });

  if (!pipeline.ok) {
    throw new Error(pipeline.validation.error ?? 'Audio validation failed.');
  }

  let enhancementSummary: Record<string, unknown> = {
    pipelineVersion: pipeline.metadata.pipelineVersion,
    profileId: pipeline.metadata.profileId,
    applied: false,
    skipped: pipeline.skipped,
  };

  let transcriptionSource = buffer;
  let transcriptionFilename = upload.originalName;

  // Persist the enhanced asset as a new UploadedFileVersion when produced.
  if (pipeline.enhanced) {
    const enhancedStoragePath = await storage.save(
      pipeline.enhanced.fileName,
      pipeline.enhanced.buffer,
      'audio/wav'
    );

    const existingVersions = await db.uploadedFileVersion.findMany({
      where: { fileId: upload.id },
      select: { versionNumber: true },
    });
    const nextVersion =
      existingVersions.length > 0
        ? Math.max(...existingVersions.map((v: any) => v.versionNumber)) + 1
        : 1;

    await db.uploadedFileVersion.create({
      data: {
        fileId: upload.id,
        versionNumber: nextVersion,
        label: 'enhanced',
        storagePath: enhancedStoragePath,
        sizeBytes: pipeline.enhanced.sizeBytes,
        metadata: JSON.stringify(pipeline.metadata),
      },
    });

    enhancementSummary = {
      pipelineVersion: pipeline.metadata.pipelineVersion,
      profileId: pipeline.metadata.profileId,
      filtersUsed: pipeline.metadata.filtersUsed,
      applied: true,
      versionNumber: nextVersion,
      storagePath: enhancedStoragePath,
      analysis: pipeline.metadata.analysis,
      segments: pipeline.metadata.segments,
      skipped: pipeline.skipped,
    };

    transcriptionSource = pipeline.enhanced.buffer;
    transcriptionFilename = pipeline.enhanced.fileName;
  }

  const extractor = new AudioExtractor();
  const result = await extractor.extract(transcriptionSource, transcriptionFilename, {
    language: ['mr', 'hi', 'en'],
  });

  if (!result.text) {
    // Honest failure — no speech transcribed. The upload stays flagged so the
    // user can re-record or upload another version; nothing fake is stored.
    await db.uploadedFile.update({
      where: { id: upload.id },
      data: {
        processingStatus: 'transcription_failed',
        processingSteps: JSON.stringify(['uploaded', 'audio_transcription_failed']),
        extractionConfidence: 0,
      },
    }).catch(() => {});
    throw new Error('No speech could be transcribed from the recording.');
  }

  const metadata = {
    transcriptionMethod: 'whisper',
    audioUrl: storage.getUrl(job.storagePath),
    transcribedAt: new Date().toISOString(),
    sourceType: 'recording',
    enhancement: enhancementSummary,
  };

  await db.uploadedFile.update({
    where: { id: upload.id },
    data: {
      extractedText: result.text,
      extractionConfidence: result.confidence,
      processingStatus: 'completed',
      processingSteps: JSON.stringify(['uploaded', 'audio_transcribed']),
      extractedMetadata: JSON.stringify(metadata),
    },
  });

  // Submit to moderation as a recording draft (idempotent per upload so a
  // retried job never creates duplicate queue items). The upload route no
  // longer submits recordings inline — this is the single publishing path.
  const existingQueue = await db.moderationQueue.findFirst({
    where: { uploadedFileId: upload.id, sourceType: 'recording' },
    select: { id: true },
  });

  if (!existingQueue) {
    const title = upload.originalName.replace(/\.[^.]+$/, '') || 'Recorded composition';
    const queueId = await submitToModeration('recording', upload.id, title, result.text);
    await db.moderationQueue.update({
      where: { id: queueId },
      data: { uploadedFileId: upload.id },
    });
  }

  // T2: composition identification — search the catalog and persist top-N
  // candidates (never silently confirming anything; the user confirms later).
  // Non-fatal: transcription already succeeded, matching is supplementary.
  // Prefer the user's typed title (stored on the upload at /record) over the
  // filename as the match hint.
  let userTitle: string | null = null;
  if (upload.detectedMetadata) {
    try {
      const parsed = JSON.parse(upload.detectedMetadata);
      if (typeof parsed.userTitle === 'string' && parsed.userTitle.trim()) {
        userTitle = parsed.userTitle.trim();
      }
    } catch {
      // best-effort
    }
  }
  const titleHint = userTitle ?? upload.originalName.replace(/\.[^.]+$/, '');
  let matchingSummary: Record<string, unknown> = { attempted: true };
  try {
    const matching = await runCompositionMatching(upload.id, result.text, titleHint);
    matchingSummary = {
      attempted: true,
      candidates: matching.candidates.map((c) => ({
        compositionId: c.compositionId,
        title: c.title,
        score: c.score,
        method: c.method,
        meetsThreshold: c.meetsThreshold,
      })),
      bestMeetsThreshold: matching.bestMeetsThreshold,
      matched: matching.matched,
      skipped: matching.skipped ?? null,
    };
  } catch (err: any) {
    matchingSummary = {
      attempted: true,
      skipped: `Matching error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Merge the matching summary into extractedMetadata (kept separate from the
  // earlier update so matching failures never roll back the transcript).
  const stored = await db.uploadedFile.findUnique({
    where: { id: upload.id },
    select: { extractedMetadata: true },
  });
  let mergedMetadata: Record<string, unknown> = {};
  if (stored?.extractedMetadata) {
    try {
      mergedMetadata = JSON.parse(stored.extractedMetadata);
    } catch {
      // start fresh
    }
  }
  mergedMetadata.compositionMatching = matchingSummary;
  if (userTitle) {
    mergedMetadata.userTitle = userTitle;
  }
  await db.uploadedFile.update({
    where: { id: upload.id },
    data: { extractedMetadata: JSON.stringify(mergedMetadata) },
  });
}

async function processYouTubeJob(job: any, upload: any): Promise<void> {
  if (!job.videoId) {
    throw new Error('YouTube job is missing videoId.');
  }

  const extractor = new YouTubeExtractor();
  const fallback = await extractor.transcribeWithAudioFallback(job.videoId, ['mr', 'hi', 'en']);

  if (!fallback) {
    // No usable speech was transcribed (or yt-dlp/Whisper unavailable) —
    // keep the upload flagged so it is not lost, and let the job retry.
    await db.uploadedFile.update({
      where: { id: upload.id },
      data: {
        processingStatus: 'needs_audio_processing',
        processingSteps: JSON.stringify(['url-received', 'extracted', 'audio_transcription_failed']),
      },
    }).catch(() => {});
    throw new Error('No speech could be transcribed from the downloaded audio.');
  }

  const transcript = fallback.text;
  const confidence = transcript.length > 100 ? 0.85 : 0.4;

  // Merge transcription results into the existing extracted metadata
  // (which already holds videoId, channel, thumbnails from the route).
  let extractedMetadata: Record<string, unknown> = {};
  if (upload.extractedMetadata) {
    try {
      extractedMetadata = JSON.parse(upload.extractedMetadata);
    } catch {
      // Non-critical — start fresh
    }
  }
  extractedMetadata = {
    ...extractedMetadata,
    needsAudioProcessing: false,
    transcriptionMethod: fallback.method,
    audioUrl: fallback.audioUrl,
    transcribedAt: new Date().toISOString(),
  };

  await db.uploadedFile.update({
    where: { id: upload.id },
    data: {
      extractedText: transcript,
      extractionConfidence: confidence,
      processingStatus: 'completed',
      processingSteps: JSON.stringify(['url-received', 'extracted', 'audio_transcribed']),
      extractedMetadata: JSON.stringify(extractedMetadata),
    },
  });

  // Submit to moderation as a YouTube draft (idempotent per upload).
  const existingQueue = await db.moderationQueue.findFirst({
    where: { uploadedFileId: upload.id, sourceType: 'youtube' },
    select: { id: true },
  });

  if (!existingQueue) {
    const queueId = await submitToModeration(
      'youtube',
      upload.id,
      `YouTube Video - ${job.videoId}`,
      transcript
    );
    await db.moderationQueue.update({
      where: { id: queueId },
      data: { uploadedFileId: upload.id },
    });
  }
}
