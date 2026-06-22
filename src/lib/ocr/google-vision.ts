/**
 * Digital Pandharpur — Google Cloud Vision OCR Engine
 *
 * Uses Google Cloud Vision API for text detection.
 * Supports Devanagari and Marathi language hints.
 * Refactored from the existing src/lib/ocr.ts implementation.
 */

import type { EngineOcrResult } from './types';

/**
 * Run OCR via Google Cloud Vision API.
 * Requires GOOGLE_VISION_API_KEY env var.
 */
export async function runGoogleVision(
  buffer: Buffer,
  language: string[],
  timeoutMs: number
): Promise<EngineOcrResult> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;

  if (!apiKey) {
    return {
      engine: 'google_vision',
      text: '',
      confidence: 0,
      error: 'GOOGLE_VISION_API_KEY not configured',
    };
  }

  const base64Image = buffer.toString('base64');

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
            imageContext: {
              languageHints: language,
            },
          },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `Google Vision API error: ${response.status} ${response.statusText}. ${errorText.slice(0, 300)}`
    );
  }

  const data = (await response.json()) as any;
  const textAnnotation = data.responses?.[0]?.fullTextAnnotation;

  if (!textAnnotation?.text) {
    return {
      engine: 'google_vision',
      text: '',
      confidence: 0,
      error: 'No text detected by Google Vision',
    };
  }

  // Google Vision returns confidence per page and per symbol
  // Extract average confidence if available
  let confidence = 0.9; // default for successful detection
  const pages = textAnnotation.pages as Array<{
    confidence?: number;
    blocks?: Array<{ confidence?: number }>;
  }> | undefined;

  if (pages && pages.length > 0) {
    const confidences: number[] = [];
    for (const page of pages) {
      if (page.confidence != null) confidences.push(page.confidence);
      if (page.blocks) {
        for (const block of page.blocks) {
          if (block.confidence != null) confidences.push(block.confidence);
        }
      }
    }
    if (confidences.length > 0) {
      confidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    }
  }

  return {
    engine: 'google_vision',
    text: textAnnotation.text,
    confidence: Math.min(confidence, 1.0),
  };
}
