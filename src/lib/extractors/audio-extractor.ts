/**
 * Digital Pandharpur — Audio-to-Lyrics Extractor
 *
 * Transcribes audio files to text using speech-to-text.
 *
 * Pipeline:
 *   Audio File → Speech-to-Text (Whisper API / local) → 
 *   Marathi Correction → Verse Detection → Lyrics Formatting
 *
 * Engine selection:
 *   1. OpenAI Whisper API (best quality, requires OPENAI_API_KEY)
 *   2. Groq Whisper (faster, requires GROQ_API_KEY)
 *   3. Local Whisper (via whisper.cpp or Bun's ffmpeg)
 */

import type { IExtractor, ExtractionResult, ExtractionOptions } from './base';

export class AudioExtractor implements IExtractor {
  readonly id = 'audio-extractor';
  readonly name = 'Audio-to-Lyrics Extractor';
  readonly supportedMimeTypes = [
    'audio/mpeg',
    'audio/wav',
    'audio/aac',
    'audio/ogg',
    'audio/flac',
    'audio/x-m4a',
    'audio/mp4',
  ];

  canHandle(mimeType: string, extension: string): boolean {
    const mimes = this.supportedMimeTypes;
    const exts = ['.mp3', '.wav', '.aac', '.ogg', '.flac', '.m4a'];
    return mimes.includes(mimeType) || exts.includes(extension.toLowerCase());
  }

  async extract(buffer: Buffer, filename: string, options?: ExtractionOptions): Promise<ExtractionResult> {
    try {
      // Step 1: Run speech-to-text
      const transcript = await this.transcribe(buffer, options?.language ?? ['mr', 'hi', 'en']);

      if (!transcript || transcript.length < 10) {
        return {
          text: '',
          title: filename.replace(/\.\w+$/, ''),
          textLength: 0,
          compositionCount: 0,
          metadata: { extractor: this.id, error: 'No speech detected' },
          confidence: 0,
          error: 'Speech-to-text returned no recognizable content.',
        };
      }

      // Step 2: Marathi post-correction (improves Devanagari accuracy)
      const corrected = this.correctMarathiText(transcript);

      // Step 3: Verse detection (identify ovi/abhang structure)
      const versified = this.detectVerses(corrected);

      // Step 4: Build metadata
      const lines = versified.split('\n').filter(l => l.trim().length > 0).length;
      const estimatedCompositions = this.estimateCompositionCount(versified);

      return {
        text: versified,
        title: this.guessTitle(versified, filename),
        textLength: versified.length,
        compositionCount: estimatedCompositions,
        metadata: {
          extractor: this.id,
          method: this.selectedMethod,
          lineCount: lines,
          verseStructure: versified.includes('\n\n') ? 'multi-verse' : 'continuous',
        },
        confidence: transcript.length > 100 ? 0.85 : 0.4,
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
        error: `Audio transcription failed: ${msg}`,
      };
    }
  }

  private selectedMethod = 'none';

  // ─── Speech-to-Text ──────────────────────────────────────────────────────

  private async transcribe(buffer: Buffer, language: string[]): Promise<string> {
    // Try OpenAI Whisper API
    const openAiKey = process.env.OPENAI_API_KEY;
    if (openAiKey) {
      try {
        this.selectedMethod = 'openai-whisper';
        return await this.transcribeWithOpenAI(buffer, language[0] ?? 'mr');
      } catch {
        // Fall through
      }
    }

    // Try Groq Whisper (faster inference)
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        this.selectedMethod = 'groq-whisper';
        return await this.transcribeWithGroq(buffer, language[0] ?? 'mr');
      } catch {
        // Fall through
      }
    }

    // Try local ffmpeg + whisper.cpp
    try {
      this.selectedMethod = 'local-whisper';
      return await this.transcribeLocal(buffer);
    } catch {
      // Fall through
    }

    throw new Error(
      'No speech-to-text engine available. Set OPENAI_API_KEY or GROQ_API_KEY, or install whisper.cpp locally.'
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
      throw new Error(`OpenAI Whisper API error: ${response.status} ${err.slice(0, 200)}`);
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
      throw new Error(`Groq Whisper API error: ${response.status} ${err.slice(0, 200)}`);
    }

    return await response.text();
  }

  private async transcribeLocal(_buffer: Buffer): Promise<string> {
    // Local Whisper via whisper.cpp or similar
    // For development, this is a placeholder
    throw new Error('Local Whisper not configured. Use OPENAI_API_KEY or GROQ_API_KEY.');
  }

  // ─── Post-Processing ──────────────────────────────────────────────────────

  /**
   * Correct common Marathi ASR errors.
   */
  private correctMarathiText(text: string): string {
    let corrected = text;

    // Fix common punctuation spacing
    corrected = corrected.replace(/\s*([।॥,?!])\s*/g, '$1 ');
    corrected = corrected.replace(/\s+/g, ' ');
    corrected = corrected.replace(/ ,/g, ',');
    corrected = corrected.replace(/ \./g, '.');

    // Fix common Devanagari confusion pairs
    const corrections: Record<string, string> = {
      'ळा': 'ला',
      'ाळे': 'ाले',
      // Add more Marathi-specific corrections as needed
    };

    for (const [wrong, right] of Object.entries(corrections)) {
      corrected = corrected.replace(new RegExp(wrong, 'g'), right);
    }

    return corrected.trim();
  }

  /**
   * Try to detect verse boundaries (abhang ovi structure).
   * Abhangs typically have 4-line ovis separated by line breaks.
   */
  private detectVerses(text: string): string {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length <= 4) return text;

    // If text already has clear verse breaks (double newlines), keep them
    if (text.includes('\n\n')) return text;

    // Try to detect 4-line ovi patterns
    // Abhangs often have rhythmic patterns detectable by syllable count
    // For now, group into 4-line stanzas
    const verses: string[] = [];
    for (let i = 0; i < lines.length; i += 4) {
      const verse = lines.slice(i, i + 4).join('\n');
      verses.push(verse);
    }

    return verses.join('\n\n');
  }

  private guessTitle(text: string, filename: string): string {
    if (!text) return filename.replace(/\.\w+$/, '');
    const firstLine = text.split('\n')[0]?.trim();
    if (firstLine && firstLine.length >= 5 && firstLine.length <= 200) return firstLine;
    return filename.replace(/\.\w+$/, '');
  }

  private estimateCompositionCount(text: string): number {
    const verses = text.split(/\n\n+/).filter(v => v.trim().length > 0);
    if (verses.length > 1) return verses.length;
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    return Math.max(1, Math.ceil(lines.length / 20));
  }
}
