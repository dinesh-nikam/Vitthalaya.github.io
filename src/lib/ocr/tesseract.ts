/**
 * Digital Pandharpur — Tesseract.js OCR Engine
 *
 * Uses Tesseract.js for local OCR with Devanagari language support.
 * Falls back gracefully if tesseract.js is not installed.
 */

import type { EngineOcrResult } from './types';

/**
 * Run OCR via Tesseract.js with Marathi/Devanagari language data.
 */
export async function runTesseractOcr(
  buffer: Buffer,
  language: string[],
  timeoutMs: number
): Promise<EngineOcrResult> {
  // Map our language codes to Tesseract language codes
  const langMap: Record<string, string> = {
    mr: 'mar',
    hi: 'hin',
    en: 'eng',
    sa: 'san',
  };

  const tessLangs = language
    .map((l) => langMap[l] ?? l)
    .filter(Boolean)
    .join('+');

  try {
    const Tesseract = await import('tesseract.js');

    const startTime = Date.now();
    const result = await Tesseract.recognize(buffer, tessLangs || 'eng', {
      logger: () => {}, // suppress progress logs
    });
    const duration = Date.now() - startTime;

    if (result?.data?.text) {
      return {
        engine: 'tesseract',
        text: result.data.text.trim(),
        confidence: (result.data.confidence ?? 0) / 100, // Tesseract returns 0-100
        segments: result.data.words?.map((w: any) => ({
          text: w.text,
          confidence: w.confidence / 100,
          bbox: w.bbox
            ? {
                x: w.bbox.x0 ?? 0,
                y: w.bbox.y0 ?? 0,
                width: (w.bbox.x1 ?? 0) - (w.bbox.x0 ?? 0),
                height: (w.bbox.y1 ?? 0) - (w.bbox.y0 ?? 0),
              }
            : undefined,
        })),
      };
    }

    return {
      engine: 'tesseract',
      text: '',
      confidence: 0,
      error: 'Tesseract returned empty text',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      engine: 'tesseract',
      text: '',
      confidence: 0,
      error: `Tesseract failed: ${msg}`,
    };
  }
}
