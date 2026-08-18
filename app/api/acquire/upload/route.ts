/**
 * Digital Pandharpur — Universal Upload API
 *
 * Accepts ALL formats: images, PDFs, documents, ebooks, audio, video, YouTube URLs.
 * Routes to the correct extractor, runs OCR for images/scanned PDFs,
 * detects metadata via AI, and submits to moderation queue.
 *
 * POST /api/acquire/upload
 *   FormData: { file: Blob, url?: string, title?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';
import { storage } from '@/src/lib/storage';
import { validateUpload, getFormatLabel } from '@/src/lib/file-validator';
import { extractContent, isYouTubeUrl, extractYouTubeVideoId, AudioExtractor } from '@/src/lib/extractors';
import { preprocessForOcr } from '@/src/lib/ocr/image-pipeline';
import { runOcrConsensus } from '@/src/lib/ocr/consensus';
import { submitToModeration } from '@/src/lib/moderation-workflow';
import { enqueueAudioProcessingJob, enqueueAudioFileTranscriptionJob } from '@/src/lib/audio-processing';
import { decideRights, type RightsInput } from '@/src/lib/rights';
import { classifyContent } from '@/src/ai-enrichment/classifier';
import {
  checkUserRateLimit,
  rateLimitExceededResponse,
  addRateLimitHeaders,
} from '@/src/lib/api-auth';
import { ApiErrors, errorResponse } from '@/src/lib/api-response';

// ─── Config ──────────────────────────────────────────────────────────────────

const YOUTUBE_MIME_TYPE = 'youtube/url';

// Per-user uploads per minute — uploads are heavy (multipart bodies, storage
// writes, possible transcription enqueues), so the window is deliberately
// small. In-memory like the v1 API-key limiter; Redis in production.
const UPLOAD_RATE_LIMIT_PER_MINUTE = 10;

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return ApiErrors.UNAUTHORIZED('Unauthorized. Please sign in to contribute.');
    }
    const userId = (session.user as any).id;

    // 1b. Per-user rate limit — checked BEFORE body parsing so a flood of
    // oversized multipart requests is rejected cheaply.
    const rateLimit = checkUserRateLimit(userId, UPLOAD_RATE_LIMIT_PER_MINUTE, 'upload');
    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit.resetAt);
    }
    const withRateHeaders = (res: NextResponse) =>
      addRateLimitHeaders(res, rateLimit.remaining, rateLimit.resetAt);

    // 2. Parse input
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const url = formData.get('url')?.toString().trim() || '';
    let customTitle = formData.get('title')?.toString().trim() || '';
    // Set by the in-browser voice recorder (see components/audio-recorder.tsx)
    // to distinguish a live recording from an arbitrary audio file upload —
    // both reuse this same pipeline, but recordings get sourceType 'recording'
    // for clearer moderation/audit trails.
    const isRecording = formData.get('isRecording')?.toString() === 'true';

    if (!file && !url) {
      return withRateHeaders(
        ApiErrors.BAD_REQUEST('Please provide a file or a YouTube URL.')
      );
    }

    // 3. Handle YouTube URL
    if (url && isYouTubeUrl(url)) {
      return withRateHeaders(await handleYouTubeUrl(url, customTitle, userId));
    }

    // 4. Handle file upload
    if (!file) {
      return withRateHeaders(
        ApiErrors.BAD_REQUEST('No file provided. Attach a file or provide a YouTube URL.')
      );
    }

    // Rights/consent declarations come from the /record page (voice
    // recordings only). They are stored on the RightsRecord and gate whether
    // the recording may ever be submitted for publication.
    const rightsInput: RightsInput = {
      declaredStatus: formData.get('rightsStatus')?.toString() ?? null,
      consentGranted: formData.get('consentGranted')?.toString() === 'true',
      publicationPermission: formData.get('publicationPermission')?.toString() === 'true',
      attribution: formData.get('attribution')?.toString() ?? null,
      source: 'record',
    };

    return withRateHeaders(await handleFileUpload(file, customTitle, userId, isRecording, rightsInput));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Upload API] Error:', err);
    return errorResponse(msg, 500, { code: 'INTERNAL_ERROR' });
  }
}

// ─── File Upload Handler ─────────────────────────────────────────────────────

async function handleFileUpload(
  file: File,
  customTitle: string,
  userId: string,
  isRecording = false,
  rightsInput: RightsInput = {}
): Promise<NextResponse> {
  const buffer = Buffer.from(await file.arrayBuffer());

  // 4a. Validate file
  const validation = validateUpload(file.type, file.size, file.name);
  if (!validation.valid) {
    const status = validation.format === 'unknown' ? 415 : 413;
    return errorResponse(validation.error ?? 'File validation failed.', status, {
      code: validation.format === 'unknown' ? 'UNSUPPORTED_MEDIA_TYPE' : 'PAYLOAD_TOO_LARGE',
    });
  }

  let uploadRecord: any = null;

  try {
    // 4b. Save original file to storage
    const storagePath = await storage.save(file.name, buffer, file.type);

    // Create initial upload record
    uploadRecord = await db.uploadedFile.create({
      data: {
        userId,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        format: validation.format,
        storagePath,
        storageProvider: process.env.STORAGE_PROVIDER ?? 'local',
        processingStatus: 'extracting',
        processingSteps: JSON.stringify(['uploaded']),
      },
    });

    // Save original version
    await db.uploadedFileVersion.create({
      data: {
        fileId: uploadRecord.id,
        versionNumber: 1,
        label: 'original',
        storagePath,
        sizeBytes: buffer.length,
      },
    });

    // Voice recordings carry an explicit rights/consent declaration (spec
    // §17/§18). Stored once here; never auto-publishes anything.
    let rightsRecord: { rightsStatus: string; canPublish: boolean; reasons: string[] } | null = null;
    if (isRecording) {
      const decision = decideRights(rightsInput);
      await db.rightsRecord.create({
        data: {
          uploadedFileId: uploadRecord.id,
          userId,
          rightsStatus: decision.rightsStatus,
          consentGranted: decision.consentGranted,
          publicationPermission: decision.publicationPermission,
          attribution: rightsInput.attribution ?? null,
          source: rightsInput.source ?? 'record',
          license: null,
          notes: decision.reasons.length > 0 ? decision.reasons.join(' | ') : null,
        },
      });
      rightsRecord = decision;
    }

    // 4c. Route based on format
    let extractedText = '';
    let extractionConfidence = 0;
    let detectedTitle = customTitle;

    if (validation.format === 'image') {
      // Image → preprocess → OCR consensus
      const extracted = await processImage(buffer, uploadRecord.id);
      extractedText = extracted.text;
      extractionConfidence = extracted.confidence;
      detectedTitle = detectedTitle || extracted.title;
    } else if (validation.format === 'pdf') {
      // PDF → try text extraction, fallback to per-page OCR
      const extracted = await processPdf(buffer, file.name, uploadRecord.id);
      extractedText = extracted.text;
      extractionConfidence = extracted.confidence;
      detectedTitle = detectedTitle || extracted.title;
    } else if (validation.format === 'audio' || isRecording) {
      // Voice recordings and audio files go straight to the speech-to-text
      // pipeline (AudioExtractor). `isRecording` is checked explicitly so a
      // recording always routes here even if its format classification is
      // ever ambiguous — webm/opus blobs never touch the video path.
      if (isRecording) {
        // Recordings do NOT block the request on a multi-minute Whisper call:
        // enqueue a background job and return immediately. The worker
        // (processAudioProcessingJobs, kind=audio_file) transcribes, persists
        // the transcript, and submits to moderation. The /record page polls
        // GET /api/acquire/upload/[id] for honest status.
        await enqueueAudioFileTranscriptionJob({
          uploadId: uploadRecord.id,
          storagePath,
        });

        await db.uploadedFile.update({
          where: { id: uploadRecord.id },
          data: {
            processingStatus: 'transcribing',
            processingSteps: JSON.stringify(['uploaded', 'transcription_queued']),
            // Keep the user's typed title — it is the strongest composition
            // match signal for the worker (used by CompositionMatcher).
            detectedMetadata: customTitle.trim()
              ? JSON.stringify({ userTitle: customTitle.trim() })
              : undefined,
          },
        });

        return NextResponse.json({
          success: true,
          uploadId: uploadRecord.id,
          needsTranscription: true,
          format: validation.format,
          message: 'रेकॉर्डिंग जतन झाली. ट्रान्सक्रिप्शन पार्श्वभूमीवर सुरू आहे — स्थिती खाली दिसेल.',
          rights: rightsRecord,
        });
      }

      const audioResult = await processAudio(buffer, file.name, uploadRecord.id);
      extractedText = audioResult.text;
      extractionConfidence = audioResult.confidence;
      detectedTitle = detectedTitle || audioResult.title;
    } else {
      // Document, ebook, video → format extractor
      const result = await extractContent(buffer, file.name, file.type);

      if (result.error) {
        // If extraction failed but it's a video file, try audio processing
        // (audio files are handled by the branch above, never here)
        if (validation.format === 'video' && !result.text) {
          const audioResult = await processAudio(buffer, file.name, uploadRecord.id);
          extractedText = audioResult.text;
          extractionConfidence = audioResult.confidence;
          detectedTitle = detectedTitle || audioResult.title;
        } else {
          throw new Error(result.error);
        }
      } else {
        extractedText = result.text;
        extractionConfidence = result.confidence;
        detectedTitle = detectedTitle || result.title;
      }
    }

    // 4d. Clean and normalize extracted text
    extractedText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();

    // 4e. Update upload record with extracted text
    await db.uploadedFile.update({
      where: { id: uploadRecord.id },
      data: {
        extractedText,
        extractionConfidence,
        processingStatus: extractedText ? 'completed' : 'failed',
        processingSteps: JSON.stringify(['uploaded', 'extracted']),
      },
    });

    if (!extractedText) {
      return NextResponse.json({
        success: true,
        uploadId: uploadRecord.id,
        extractedText: '',
        detection: null,
        message: isRecording
          ? 'Recording saved, but no speech could be transcribed. You can still keep the audio and add lyrics manually.'
          : 'File uploaded but no text could be extracted.',
        format: validation.format,
      });
    }

    // 4f. Submit to moderation queue as a draft — nothing is published until
    // an admin/moderator approves it (see submitPeerVote/promoteAndPublish).
    const moderationSourceType = isRecording ? 'recording' : 'ocr';
    const queueId = await submitToModeration(
      moderationSourceType,
      uploadRecord.id,
      detectedTitle || file.name,
      extractedText
    );

    // Link moderation queue to upload record
    await db.moderationQueue.update({
      where: { id: queueId },
      data: { uploadedFileId: uploadRecord.id },
    });

    // Non-blocking AI classification for editor suggestions
    classifyContent(extractedText, detectedTitle || file.name)
      .then(async (classResult) => {
        if (classResult.success && classResult.result) {
          await db.uploadedFile.update({
            where: { id: uploadRecord.id },
            data: { detectedMetadata: JSON.stringify(classResult.result) },
          }).catch((e) => console.warn('[Upload] Failed to persist classification:', e));
        }
      })
      .catch((e) => console.warn('[Upload] Classification error:', e));

    const fileUrl = storage.getUrl(storagePath);

    return NextResponse.json({
      success: true,
      uploadId: uploadRecord.id,
      fileUrl,
      extractedText,
      title: detectedTitle || extractedText.slice(0, 100),
      queueId,
      format: validation.format,
      formatLabel: getFormatLabel(validation.format),
      confidence: extractionConfidence,
      textLength: extractedText.length,
    });
  } catch (err) {
    // Mark upload as failed
    const msg = err instanceof Error ? err.message : String(err);
    if (uploadRecord?.id) {
      await db.uploadedFile.update({
        where: { id: uploadRecord.id },
        data: {
          processingStatus: 'failed',
          processingSteps: JSON.stringify(['uploaded', 'failed']),
          extractedText: msg,
        },
      }).catch(() => {});
    }

    throw err;
  }
}

// ─── YouTube URL Handler ─────────────────────────────────────────────────────

async function handleYouTubeUrl(
  url: string,
  customTitle: string,
  userId: string
): Promise<NextResponse> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    return ApiErrors.BAD_REQUEST('Invalid YouTube URL. Could not extract video ID.');
  }

  // Create upload record
  const uploadRecord = await db.uploadedFile.create({
    data: {
      userId,
      originalName: `YouTube-${videoId}`,
      mimeType: YOUTUBE_MIME_TYPE,
      sizeBytes: 0,
      format: 'video',
      storagePath: '',
      storageProvider: 'youtube',
      sourceUrl: url,
      processingStatus: 'extracting',
      processingSteps: JSON.stringify(['url-received']),
    },
  });

  try {
    // Extract via YouTube extractor
    const buffer = Buffer.from(url, 'utf-8');
    const result = await extractContent(buffer, `youtube-${videoId}.youtube`, YOUTUBE_MIME_TYPE);

    const extractedText = result.text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    const detectedTitle = customTitle || result.title || `YouTube Video - ${videoId}`;

    await db.uploadedFile.update({
      where: { id: uploadRecord.id },
      data: {
        extractedText,
        extractionConfidence: result.confidence,
        processingStatus: extractedText ? 'completed' : 'needs_audio_processing',
        extractedMetadata: JSON.stringify(result.metadata),
        processingSteps: JSON.stringify(['url-received', 'extracted']),
      },
    });

    if (!extractedText) {
      // No captions/subtitles available. Do NOT block this request on a
      // multi-minute yt-dlp download + Whisper transcription — enqueue a
      // background job instead. The worker daemon (src/cli/worker-runner.ts,
      // processAudioProcessingJobs) will transcribe the audio, persist the
      // transcript, and submit it to the moderation queue as a YouTube draft.
      await enqueueAudioProcessingJob({
        uploadId: uploadRecord.id,
        videoId,
        url,
      });

      await db.uploadedFile.update({
        where: { id: uploadRecord.id },
        data: {
          processingStatus: 'needs_audio_processing',
          processingSteps: JSON.stringify(['url-received', 'extracted', 'audio_processing_queued']),
        },
      });

      return NextResponse.json({
        success: true,
        uploadId: uploadRecord.id,
        videoId,
        extractedText: '',
        detection: null,
        needsAudioProcessing: true,
        message: 'YouTube metadata fetched but no captions were found. Audio transcription has been queued and will complete in the background.',
        metadata: result.metadata,
      });
    }

    // Submit to moderation — stored purely as a draft until an admin
    // approves it (promoteAndPublish creates the real Composition then).
    const queueId = await submitToModeration(
      'youtube',
      uploadRecord.id,
      detectedTitle,
      extractedText
    );

    await db.moderationQueue.update({
      where: { id: queueId },
      data: { uploadedFileId: uploadRecord.id },
    });

    // Non-blocking AI classification
    classifyContent(extractedText, detectedTitle)
      .then(async (classResult) => {
        if (classResult.success && classResult.result) {
          await db.uploadedFile.update({
            where: { id: uploadRecord.id },
            data: { detectedMetadata: JSON.stringify(classResult.result) },
          }).catch((e) => console.warn('[Upload] YouTube classification persist error:', e));
        }
      })
      .catch((e) => console.warn('[Upload] YouTube classification error:', e));

    return NextResponse.json({
      success: true,
      uploadId: uploadRecord.id,
      videoId,
      title: detectedTitle,
      extractedText,
      queueId,
      format: 'youtube',
      confidence: result.confidence,
      textLength: extractedText.length,
      metadata: result.metadata,
    });
  } catch (err) {
    await db.uploadedFile.update({
      where: { id: uploadRecord.id },
      data: { processingStatus: 'failed' },
    }).catch(() => {});
    throw err;
  }
}

// ─── Format-Specific Processing ──────────────────────────────────────────────

/**
 * Process image: preprocess → multi-engine OCR → consensus
 */
async function processImage(
  buffer: Buffer,
  uploadId: string
): Promise<{ text: string; confidence: number; title: string }> {
  // Preprocess for better OCR
  const preprocessed = await preprocessForOcr(buffer, {
    deskew: true,
    denoise: true,
    enhance: true,
    threshold: 130,
  });

  // Save preprocessed version
  await db.uploadedFileVersion.create({
    data: {
      fileId: uploadId,
      versionNumber: 2,
      label: 'preprocessed',
      storagePath: '',
      sizeBytes: preprocessed.buffer.length,
      metadata: JSON.stringify({ width: preprocessed.width, height: preprocessed.height }),
    },
  }).catch(() => {});

  // Run multi-engine OCR consensus
    const ocrConfig = {
      engines: ['google_vision', 'tesseract', 'paddleocr'] as Array<'google_vision' | 'tesseract' | 'paddleocr'>,
      votingMethod: 'weighted-average' as const,
      language: ['mr', 'hi', 'en'],
      engineTimeout: 30000,
    };

  const consensus = await runOcrConsensus(preprocessed.buffer, ocrConfig);

  // Save OCR consensus results
  await db.ocrConsensusResult.create({
    data: {
      fileId: uploadId,
      engineAResult: consensus.engineResults[0]?.text ?? null,
      engineAConfidence: consensus.engineResults[0]?.confidence ?? null,
      engineBResult: consensus.engineResults[1]?.text ?? null,
      engineBConfidence: consensus.engineResults[1]?.confidence ?? null,
      engineCResult: consensus.engineResults[2]?.text ?? null,
      engineCConfidence: consensus.engineResults[2]?.confidence ?? null,
      votedText: consensus.votedText,
      finalConfidence: consensus.finalConfidence,
      votingMethod: consensus.votingMethod,
      engineCount: consensus.engineCount,
    },
  });

  const title = consensus.votedText.split('\n')[0]?.trim()?.slice(0, 200) || '';

  return {
    text: consensus.votedText,
    confidence: consensus.finalConfidence,
    title,
  };
}

/**
 * Process PDF: try text extraction first -> OCR if scanned
 */
async function processPdf(
  buffer: Buffer,
  filename: string,
  _uploadId: string
): Promise<{ text: string; confidence: number; title: string }> {
  const result = await extractContent(buffer, filename, 'application/pdf');

  if (result.text.length > 50) {
    // Text PDF — direct extraction worked
    return {
      text: result.text,
      confidence: result.confidence,
      title: result.title,
    };
  }

  // Scanned PDF — OCR each page
  // For now, use the image OCR pipeline on the first page converted to image
  // A full implementation would render each PDF page to an image via pdf.js or poppler
  const consensus = await runOcrConsensus(buffer, {
    engines: ['google_vision', 'tesseract', 'paddleocr'],
    votingMethod: 'weighted-average',
    language: ['mr', 'hi', 'en'],
    engineTimeout: 60000,
  });

  return {
    text: consensus.votedText,
    confidence: consensus.finalConfidence * 0.8, // scanned PDF is harder
    title: result.title || consensus.votedText.split('\n')[0]?.trim()?.slice(0, 200) || filename,
  };
}

/**
 * Process audio: transcribe via Whisper using the audio extractor directly.
 *
 * Called for audio uploads and in-browser voice recordings (webm/opus). The
 * extractor is invoked directly (not via the format registry) so the real
 * filename reaches the Whisper API calls — webm recordings are submitted as
 * webm instead of being mislabeled as mp3.
 */
async function processAudio(
  buffer: Buffer,
  filename: string,
  _uploadId: string
): Promise<{ text: string; confidence: number; title: string }> {
  const extractor = new AudioExtractor();
  const result = await extractor.extract(buffer, filename, { language: ['mr', 'hi', 'en'] });

  return {
    text: result.text,
    confidence: result.confidence,
    title: result.title || filename.replace(/\.\w+$/, ''),
  };
}
