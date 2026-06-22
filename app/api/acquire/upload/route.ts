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
import { validateUpload, classifyUploadFormat, getFormatLabel } from '@/src/lib/file-validator';
import { extractContent, isYouTubeUrl, extractYouTubeVideoId } from '@/src/lib/extractors';
import { preprocessForOcr } from '@/src/lib/ocr/image-pipeline';
import { runOcrConsensus } from '@/src/lib/ocr/consensus';
import { submitToModeration } from '@/src/lib/moderation-workflow';
import { classifyContent } from '@/src/ai-enrichment/classifier';

// ─── Config ──────────────────────────────────────────────────────────────────

const YOUTUBE_MIME_TYPE = 'youtube/url';

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to contribute.' },
        { status: 401 }
      );
    }
    const userId = (session.user as any).id;

    // 2. Parse input
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const url = formData.get('url')?.toString().trim() || '';
    let customTitle = formData.get('title')?.toString().trim() || '';

    if (!file && !url) {
      return NextResponse.json(
        { error: 'Please provide a file or a YouTube URL.' },
        { status: 400 }
      );
    }

    // 3. Handle YouTube URL
    if (url && isYouTubeUrl(url)) {
      return await handleYouTubeUrl(url, customTitle, userId);
    }

    // 4. Handle file upload
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Attach a file or provide a YouTube URL.' },
        { status: 400 }
      );
    }

    return await handleFileUpload(file, customTitle, userId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Upload API] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── File Upload Handler ─────────────────────────────────────────────────────

async function handleFileUpload(
  file: File,
  customTitle: string,
  userId: string
): Promise<NextResponse> {
  const buffer = Buffer.from(await file.arrayBuffer());

  // 4a. Validate file
  const validation = validateUpload(file.type, file.size, file.name);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.format === 'unknown' ? 415 : 413 }
    );
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
    } else {
      // Document, ebook, audio, video → format extractor
      const result = await extractContent(buffer, file.name, file.type);

      if (result.error) {
        // If extraction failed but it's an audio/video file, try audio processing
        if ((validation.format === 'audio' || validation.format === 'video') && !result.text) {
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
        message: 'File uploaded but no text could be extracted.',
        format: validation.format,
      });
    }

    // 4f. Submit to moderation queue
    const queueId = await submitToModeration(
      'ocr',
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
    return NextResponse.json(
      { error: 'Invalid YouTube URL. Could not extract video ID.' },
      { status: 400 }
    );
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
      return NextResponse.json({
        success: true,
        uploadId: uploadRecord.id,
        videoId,
        extractedText: '',
        detection: null,
        message: 'YouTube metadata fetched but no captions found. Audio processing may be needed.',
        metadata: result.metadata,
      });
    }

    // Submit to moderation
    const queueId = await submitToModeration(
      'ocr',
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
    const msg = err instanceof Error ? err.message : String(err);
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
  uploadId: string
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
 * Process audio: transcribe via Whisper
 */
async function processAudio(
  buffer: Buffer,
  filename: string,
  _uploadId: string
): Promise<{ text: string; confidence: number; title: string }> {
  const result = await extractContent(buffer, filename, 'audio/mpeg');

  return {
    text: result.text,
    confidence: result.confidence,
    title: result.title || filename.replace(/\.\w+$/, ''),
  };
}
