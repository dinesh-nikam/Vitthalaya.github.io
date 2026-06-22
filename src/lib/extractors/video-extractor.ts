/**
 * Digital Pandharpur — Video Extractor
 *
 * Extracts audio track from video files and runs speech-to-text.
 *
 * Pipeline:
 *   Video File → FFmpeg Audio Extraction → Speech-to-Text (Whisper)
 *   → Marathi Correction → Lyrics Formatting
 */

import type { IExtractor, ExtractionResult, ExtractionOptions } from './base';

export class VideoExtractor implements IExtractor {
  readonly id = 'video-extractor';
  readonly name = 'Video Audio Extractor';
  readonly supportedMimeTypes = [
    'video/mp4',
    'video/quicktime',
    'video/x-matroska',
    'video/avi',
    'video/webm',
  ];

  canHandle(mimeType: string, extension: string): boolean {
    const mimes = this.supportedMimeTypes;
    const exts = ['.mp4', '.mov', '.mkv', '.avi', '.webm'];
    return mimes.includes(mimeType) || exts.includes(extension.toLowerCase());
  }

  async extract(buffer: Buffer, filename: string, options?: ExtractionOptions): Promise<ExtractionResult> {
    try {
      // Step 1: Extract audio track from video using ffmpeg
      const audioBuffer = await this.extractAudio(buffer);

      if (!audioBuffer || audioBuffer.length < 100) {
        return {
          text: '',
          title: filename.replace(/\.\w+$/, ''),
          textLength: 0,
          compositionCount: 0,
          metadata: { extractor: this.id, error: 'No audio track found in video' },
          confidence: 0,
          error: 'Could not extract audio from the video file.',
        };
      }

      // Step 2: Transcribe extracted audio
      const transcript = await this.transcribeAudio(audioBuffer, options?.language ?? ['mr', 'hi', 'en']);

      if (!transcript || transcript.length < 10) {
        return {
          text: '',
          title: filename.replace(/\.\w+$/, ''),
          textLength: 0,
          compositionCount: 0,
          metadata: { extractor: this.id, error: 'No speech detected in audio track' },
          confidence: 0,
          error: 'Speech-to-text returned no recognizable content.',
        };
      }

      // Step 3: Post-processing (same as audio)
      const corrected = this.correctMarathiText(transcript);
      const versified = this.detectVerses(corrected);
      const lines = versified.split('\n').filter(l => l.trim().length > 0).length;

      return {
        text: versified,
        title: this.guessTitle(versified, filename),
        textLength: versified.length,
        compositionCount: Math.max(1, Math.ceil(lines / 20)),
        metadata: {
          extractor: this.id,
          method: 'ffmpeg-audio-extract',
          lineCount: lines,
          audioTrackExtracted: true,
        },
        confidence: transcript.length > 100 ? 0.8 : 0.3,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        text: '',
        title: filename.replace(/\.\w+$/, ''),
        textLength: 0,
        compositionCount: 0,
        metadata: { extractor: this.id, error: msg },
        confidence: 0,
        error: `Video extraction failed: ${msg}`,
      };
    }
  }

  /**
   * Extract audio track using ffmpeg.
   * Falls back to checking if ffmpeg is available on the system.
   */
  private async extractAudio(videoBuffer: Buffer): Promise<Buffer | null> {
    try {
      // Try using ffmpeg (must be installed on the system)
      const { execSync } = await import('node:child_process');
      const { writeFileSync, unlinkSync } = await import('node:fs');
      const { join } = await import('node:path');

      // Check ffmpeg availability
      execSync('ffmpeg -version', { stdio: 'pipe', timeout: 5000 });

      // Write video to temp file
      const tempDir = process.env.TEMP || '/tmp';
      const inputPath = join(tempDir, `vid-input-${Date.now()}.mp4`);
      const outputPath = join(tempDir, `vid-audio-${Date.now()}.mp3`);

      writeFileSync(inputPath, videoBuffer);

      // Extract audio as MP3
      execSync(
        `ffmpeg -i "${inputPath}" -vn -acodec libmp3lame -q:a 4 -y "${outputPath}"`,
        { stdio: 'pipe', timeout: 300000 } // 5 min timeout for large files
      );

      const { readFileSync } = await import('node:fs');
      const audioBuffer = readFileSync(outputPath);

      // Cleanup
      try { unlinkSync(inputPath); } catch {}
      try { unlinkSync(outputPath); } catch {}

      return audioBuffer;
    } catch {
      // ffmpeg not available or failed
      return null;
    }
  }

  /**
   * Transcribe audio buffer using Whisper (same as AudioExtractor).
   */
  private async transcribeAudio(buffer: Buffer, language: string[]): Promise<string> {
    // Try OpenAI Whisper API
    const openAiKey = process.env.OPENAI_API_KEY;
    if (openAiKey) {
      try {
        return await this.transcribeWithOpenAI(buffer, language[0] ?? 'mr');
      } catch {
        // Fall through
      }
    }

    // Try Groq Whisper
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        return await this.transcribeWithGroq(buffer, language[0] ?? 'mr');
      } catch {
        // Fall through
      }
    }

    throw new Error(
      'No speech-to-text engine available. Set OPENAI_API_KEY or GROQ_API_KEY for video transcription.'
    );
  }

  private async transcribeWithOpenAI(buffer: Buffer, language: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY!;
    const formData = new FormData();
    const uint8 = new Uint8Array(buffer);
    const blob = new Blob([uint8], { type: 'audio/mpeg' });
    formData.append('file', blob, 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('language', language);
    formData.append('response_format', 'text');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => '');
      throw new Error(`OpenAI Whisper error: ${response.status} ${err.slice(0, 200)}`);
    }

    return await response.text();
  }

  private async transcribeWithGroq(buffer: Buffer, language: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY!;
    const formData = new FormData();
    const uint8 = new Uint8Array(buffer);
    const blob = new Blob([uint8], { type: 'audio/mpeg' });
    formData.append('file', blob, 'audio.mp3');
    formData.append('model', 'whisper-large-v3');
    formData.append('language', language);
    formData.append('response_format', 'text');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => '');
      throw new Error(`Groq Whisper error: ${response.status} ${err.slice(0, 200)}`);
    }

    return await response.text();
  }

  private correctMarathiText(text: string): string {
    let corrected = text;
    corrected = corrected.replace(/\s*([।॥,?!])\s*/g, '$1 ');
    corrected = corrected.replace(/\s+/g, ' ');
    return corrected.trim();
  }

  private detectVerses(text: string): string {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 4 || text.includes('\n\n')) return text;

    const verses: string[] = [];
    for (let i = 0; i < lines.length; i += 4) {
      verses.push(lines.slice(i, i + 4).join('\n'));
    }
    return verses.join('\n\n');
  }

  private guessTitle(text: string, filename: string): string {
    if (!text) return filename.replace(/\.\w+$/, '');
    const firstLine = text.split('\n')[0]?.trim();
    if (firstLine && firstLine.length >= 5 && firstLine.length <= 200) return firstLine;
    return filename.replace(/\.\w+$/, '');
  }
}
