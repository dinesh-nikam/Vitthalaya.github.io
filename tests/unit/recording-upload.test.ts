/**
 * Tests for the in-browser voice-recording upload path
 * (MediaRecorder → audio/webm blob → upload API → audio extractor)
 *
 * Covers TC-REC-001 to TC-REC-011.
 *
 * The upload page records with MediaRecorder, producing a Blob whose type is
 * 'audio/webm;codecs=opus' (or 'audio/webm'/'audio/mp4' depending on the
 * browser) and a filename like 'recording-<timestamp>.webm'. These tests lock
 * in that such blobs:
 *   1. validate + classify as 'audio' (not 'video' — a previous misrouting),
 *   2. route to the AudioExtractor (not the VideoExtractor) in the registry,
 *   3. fail gracefully when no speech-to-text engine is configured, which is
 *      the path the upload API relies on for its "no speech transcribed"
 *      response.
 */

import { describe, test, expect } from 'bun:test';
import { classifyUploadFormat, validateUpload, SUPPORTED_FORMATS } from '../../src/lib/file-validator';
import { findExtractor } from '../../src/lib/extractors';
import { AudioExtractor } from '../../src/lib/extractors/audio-extractor';
import { VideoExtractor } from '../../src/lib/extractors/video-extractor';

describe('Recording upload — validator classification', () => {
  test('TC-REC-001: audio/webm;codecs=opus (Chrome MediaRecorder) classifies as audio', () => {
    const format = classifyUploadFormat('audio/webm;codecs=opus', 'recording-1723456789.webm');
    expect(format).toBe('audio');
  });

  test('TC-REC-002: plain audio/webm (Firefox MediaRecorder) classifies as audio', () => {
    const format = classifyUploadFormat('audio/webm', 'recording-1723456789.webm');
    expect(format).toBe('audio');
  });

  test('TC-REC-003: audio/mp4 (Safari MediaRecorder) classifies as audio', () => {
    const format = classifyUploadFormat('audio/mp4', 'recording-1723456789.m4a');
    expect(format).toBe('audio');
  });

  test('TC-REC-004: video/webm stays video — no regression for webm video uploads', () => {
    expect(classifyUploadFormat('video/webm', 'clip.webm')).toBe('video');
    expect(classifyUploadFormat('video/webm;codecs=vp9', 'clip.webm')).toBe('video');
  });

  test('TC-REC-005: validator accepts a webm recording and reports format audio', () => {
    const result = validateUpload('audio/webm;codecs=opus', 64 * 1024, 'recording-1723456789.webm');
    expect(result.valid).toBe(true);
    expect(result.format).toBe('audio');
  });

  test('TC-REC-006: audio/webm is registered in the audio MIME allowlist', () => {
    expect(SUPPORTED_FORMATS.audio.mimeTypes).toContain('audio/webm');
  });
});

describe('Recording upload — extractor routing', () => {
  test('TC-REC-007: webm recording with codec parameter routes to AudioExtractor', () => {
    const extractor = findExtractor('audio/webm;codecs=opus', 'recording-1723456789.webm');
    expect(extractor).toBeInstanceOf(AudioExtractor);
  });

  test('TC-REC-008: plain audio/webm routes to AudioExtractor', () => {
    const extractor = findExtractor('audio/webm', 'recording-1723456789.webm');
    expect(extractor).toBeInstanceOf(AudioExtractor);
  });

  test('TC-REC-009: video/webm routes to VideoExtractor, not AudioExtractor', () => {
    const extractor = findExtractor('video/webm;codecs=vp9', 'clip.webm');
    expect(extractor).toBeInstanceOf(VideoExtractor);
    expect(extractor).not.toBeInstanceOf(AudioExtractor);
  });

  test('TC-REC-010: AudioExtractor.canHandle accepts codec-qualified webm directly', () => {
    const extractor = new AudioExtractor();
    expect(extractor.canHandle('audio/webm;codecs=opus', '.webm')).toBe(true);
    expect(extractor.canHandle('video/webm', '.webm')).toBe(false);
  });
});

describe('Recording upload — transcription failure path', () => {
  test('TC-REC-011: no speech-to-text engine configured → graceful error result, no throw', async () => {
    // Ensure no API keys leak from the environment into this test, so the
    // extractor deterministically reaches the "no engine available" branch.
    const hadOpenAi = process.env.OPENAI_API_KEY;
    const hadGroq = process.env.GROQ_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GROQ_API_KEY;

    try {
      const extractor = new AudioExtractor();
      const result = await extractor.extract(
        Buffer.from('not really a webm file'),
        'recording-1723456789.webm',
        { language: ['mr', 'hi', 'en'] }
      );

      // The upload API inspects result.text — empty text leads to the
      // "Recording saved, but no speech could be transcribed" message.
      expect(result.text).toBe('');
      expect(result.error).toBeTruthy();
      expect(result.error).toContain('No speech-to-text engine');
    } finally {
      if (hadOpenAi) process.env.OPENAI_API_KEY = hadOpenAi;
      if (hadGroq) process.env.GROQ_API_KEY = hadGroq;
    }
  });
});
