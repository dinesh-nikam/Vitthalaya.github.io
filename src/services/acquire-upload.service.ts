/**
 * Digital Pandharpur — Acquire & Upload Domain Service
 *
 * Encapsulates all extraction, OCR consensus, transcription enqueuing,
 * rights recording, and moderation pipeline ingestion for contributed content.
 */

import { db } from '@/src/db/client';
import { storage } from '@/src/lib/storage';
import { validateUpload, getFormatLabel } from '@/src/lib/file-validator';
import {
  extractContent,
  extractYouTubeVideoId,
  AudioExtractor,
} from '@/src/lib/extractors';
import { preprocessForOcr } from '@/src/lib/ocr/image-pipeline';
import { runOcrConsensus } from '@/src/lib/ocr/consensus';
import { submitToModeration } from '@/src/lib/moderation-workflow';
import {
  enqueueAudioProcessingJob,
  enqueueAudioFileTranscriptionJob,
} from '@/src/lib/audio-processing';
import { decideRights, type RightsInput } from '@/src/lib/rights';
import { classifyContent } from '@/src/ai-enrichment/classifier';

export const YOUTUBE_MIME_TYPE = 'youtube/url';

export interface ProcessFileUploadOptions {
  file: File;
  customTitle?: string;
  userId: string;
  isRecording?: boolean;
  rightsInput?: RightsInput;
}

export interface ProcessYouTubeUploadOptions {
  url: string;
  customTitle?: string;
  userId: string;
}

export interface ServiceOperationResult {
  status: number;
  body: Record<string, unknown>;
}

export class AcquireUploadService {
  /**
   * Process a binary file upload (image, audio, pdf, document, etc.).
   */
  async processFileUpload(options: ProcessFileUploadOptions): Promise<ServiceOperationResult> {
    const {
      file,
      customTitle = '',
      userId,
      isRecording = false,
      rightsInput = {},
    } = options;

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Validate file format and size
    const validation = validateUpload(file.type, file.size, file.name);
    if (!validation.valid) {
      const status = validation.format === 'unknown' ? 415 : 413;
      return {
        status,
        body: {
          error: validation.error ?? 'File validation failed.',
          code: validation.format === 'unknown' ? 'UNSUPPORTED_MEDIA_TYPE' : 'PAYLOAD_TOO_LARGE',
        },
      };
    }

    let uploadRecordId: string | null = null;

    try {
      // 2. Save original file to storage
      const storagePath = await storage.save(file.name, buffer, file.type);

      // Create initial upload record
      const uploadRecord = await db.uploadedFile.create({
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
      uploadRecordId = uploadRecord.id;

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

      // 3. Process voice recording rights and consent declarations
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

      // 4. Extract content according to media format
      let extractedText = '';
      let extractionConfidence = 0;
      let detectedTitle = customTitle;

      if (validation.format === 'image') {
        const extracted = await this.processImage(buffer, uploadRecord.id);
        extractedText = extracted.text;
        extractionConfidence = extracted.confidence;
        detectedTitle = detectedTitle || extracted.title;
      } else if (validation.format === 'pdf') {
        const extracted = await this.processPdf(buffer, file.name, uploadRecord.id);
        extractedText = extracted.text;
        extractionConfidence = extracted.confidence;
        detectedTitle = detectedTitle || extracted.title;
      } else if (validation.format === 'audio' || isRecording) {
        if (isRecording) {
          // Asynchronous transcription job: enqueue and return immediately to avoid client timeouts
          await enqueueAudioFileTranscriptionJob({
            uploadId: uploadRecord.id,
            storagePath,
          });

          await db.uploadedFile.update({
            where: { id: uploadRecord.id },
            data: {
              processingStatus: 'transcribing',
              processingSteps: JSON.stringify(['uploaded', 'transcription_queued']),
              detectedMetadata: customTitle.trim()
                ? JSON.stringify({ userTitle: customTitle.trim() })
                : undefined,
            },
          });

          return {
            status: 200,
            body: {
              success: true,
              uploadId: uploadRecord.id,
              needsTranscription: true,
              format: validation.format,
              message: 'रेकॉर्डिंग जतन झाली. ट्रान्सक्रिप्शन पार्श्वभूमीवर सुरू आहे — स्थिती खाली दिसेल.',
              rights: rightsRecord,
            },
          };
        }

        const audioResult = await this.processAudio(buffer, file.name);
        extractedText = audioResult.text;
        extractionConfidence = audioResult.confidence;
        detectedTitle = detectedTitle || audioResult.title;
      } else {
        const result = await extractContent(buffer, file.name, file.type);
        if (result.error) {
          if (validation.format === 'video' && !result.text) {
            const audioResult = await this.processAudio(buffer, file.name);
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

      // 5. Clean and normalize extracted text
      extractedText = extractedText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{4,}/g, '\n\n\n')
        .trim();

      // 6. Update upload record
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
        return {
          status: 200,
          body: {
            success: true,
            uploadId: uploadRecord.id,
            extractedText: '',
            detection: null,
            message: isRecording
              ? 'Recording saved, but no speech could be transcribed. You can still keep the audio and add lyrics manually.'
              : 'File uploaded but no text could be extracted.',
            format: validation.format,
          },
        };
      }

      // 7. Submit to moderation queue as an unapproved draft
      const moderationSourceType = isRecording ? 'recording' : 'ocr';
      const queueId = await submitToModeration(
        moderationSourceType,
        uploadRecord.id,
        detectedTitle || file.name,
        extractedText
      );

      await db.moderationQueue.update({
        where: { id: queueId },
        data: { uploadedFileId: uploadRecord.id },
      });

      // 8. Trigger asynchronous AI classification for categorization tags
      this.triggerAsyncClassification(uploadRecord.id, extractedText, detectedTitle || file.name);

      const fileUrl = storage.getUrl(storagePath);

      return {
        status: 200,
        body: {
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
        },
      };
    } catch (err) {
      if (uploadRecordId) {
        const msg = err instanceof Error ? err.message : String(err);
        await db.uploadedFile
          .update({
            where: { id: uploadRecordId },
            data: {
              processingStatus: 'failed',
              processingSteps: JSON.stringify(['uploaded', 'failed']),
              extractedText: msg,
            },
          })
          .catch(() => {});
      }
      throw err;
    }
  }

  /**
   * Process a YouTube link submission.
   */
  async processYouTubeUpload(options: ProcessYouTubeUploadOptions): Promise<ServiceOperationResult> {
    const { url, customTitle = '', userId } = options;

    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      return {
        status: 400,
        body: { error: 'Invalid YouTube URL. Could not extract video ID.' },
      };
    }

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

        return {
          status: 200,
          body: {
            success: true,
            uploadId: uploadRecord.id,
            videoId,
            extractedText: '',
            detection: null,
            needsAudioProcessing: true,
            message:
              'YouTube metadata fetched but no captions were found. Audio transcription has been queued and will complete in the background.',
            metadata: result.metadata,
          },
        };
      }

      const queueId = await submitToModeration('youtube', uploadRecord.id, detectedTitle, extractedText);

      await db.moderationQueue.update({
        where: { id: queueId },
        data: { uploadedFileId: uploadRecord.id },
      });

      this.triggerAsyncClassification(uploadRecord.id, extractedText, detectedTitle);

      return {
        status: 200,
        body: {
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
        },
      };
    } catch (err) {
      await db.uploadedFile
        .update({
          where: { id: uploadRecord.id },
          data: { processingStatus: 'failed' },
        })
        .catch(() => {});
      throw err;
    }
  }

  /**
   * Preprocess and execute OCR consensus on image data.
   */
  private async processImage(
    buffer: Buffer,
    uploadId: string
  ): Promise<{ text: string; confidence: number; title: string }> {
    const preprocessed = await preprocessForOcr(buffer, {
      deskew: true,
      denoise: true,
      enhance: true,
      threshold: 130,
    });

    await db.uploadedFileVersion
      .create({
        data: {
          fileId: uploadId,
          versionNumber: 2,
          label: 'preprocessed',
          storagePath: '',
          sizeBytes: preprocessed.buffer.length,
          metadata: JSON.stringify({ width: preprocessed.width, height: preprocessed.height }),
        },
      })
      .catch(() => {});

    const consensus = await runOcrConsensus(preprocessed.buffer, {
      engines: ['google_vision', 'tesseract', 'paddleocr'],
      votingMethod: 'weighted-average',
      language: ['mr', 'hi', 'en'],
      engineTimeout: 30000,
    });

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
   * Process PDF by attempting direct text extraction with fallback to OCR consensus.
   */
  private async processPdf(
    buffer: Buffer,
    filename: string,
    _uploadId: string
  ): Promise<{ text: string; confidence: number; title: string }> {
    const result = await extractContent(buffer, filename, 'application/pdf');

    if (result.text.length > 50) {
      return {
        text: result.text,
        confidence: result.confidence,
        title: result.title,
      };
    }

    const consensus = await runOcrConsensus(buffer, {
      engines: ['google_vision', 'tesseract', 'paddleocr'],
      votingMethod: 'weighted-average',
      language: ['mr', 'hi', 'en'],
      engineTimeout: 60000,
    });

    return {
      text: consensus.votedText,
      confidence: consensus.finalConfidence * 0.8,
      title: result.title || consensus.votedText.split('\n')[0]?.trim()?.slice(0, 200) || filename,
    };
  }

  /**
   * Process audio buffer with speech-to-text extractor.
   */
  private async processAudio(
    buffer: Buffer,
    filename: string
  ): Promise<{ text: string; confidence: number; title: string }> {
    const extractor = new AudioExtractor();
    const result = await extractor.extract(buffer, filename, { language: ['mr', 'hi', 'en'] });

    return {
      text: result.text,
      confidence: result.confidence,
      title: result.title || filename.replace(/\.\w+$/, ''),
    };
  }

  /**
   * Fire-and-forget classifier runner to avoid blocking the client request.
   */
  private triggerAsyncClassification(uploadRecordId: string, text: string, title: string): void {
    classifyContent(text, title)
      .then(async (classResult) => {
        if (classResult.success && classResult.result) {
          await db.uploadedFile
            .update({
              where: { id: uploadRecordId },
              data: { detectedMetadata: JSON.stringify(classResult.result) },
            })
            .catch((e) => console.warn('[Upload] Failed to persist classification:', e));
        }
      })
      .catch((e) => console.warn('[Upload] Classification error:', e));
  }
}

export const acquireUploadService = new AcquireUploadService();
