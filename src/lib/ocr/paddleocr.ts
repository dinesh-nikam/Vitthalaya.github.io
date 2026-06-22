/**
 * Digital Pandharpur — PaddleOCR Engine
 *
 * PaddleOCR excels at Devanagari script recognition.
 * This wrapper connects to a PaddleOCR server API or runs locally.
 *
 * Expected server: paddleocr-server running on PADDLE_OCR_URL
 * (default: http://localhost:9898)
 */

import type { EngineOcrResult } from './types';

export async function runPaddleOcr(
  buffer: Buffer,
  language: string[],
  timeoutMs: number
): Promise<EngineOcrResult> {
  const serverUrl = process.env.PADDLE_OCR_URL ?? 'http://localhost:9898';
  const isProduction = process.env.NODE_ENV === 'production';

  try {
    // Send image to PaddleOCR server
    const base64Image = buffer.toString('base64');

    const response = await fetch(`${serverUrl}/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64Image,
        language: language.includes('mr') ? 'mr' : 'hi',
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`PaddleOCR server error: ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json() as any;

    // Expected response format: { result: [{text: "...", confidence: 0.99}, ...] }
    const items: Array<{ text: string; confidence: number }> = data?.result ?? data?.data ?? [];

    if (!Array.isArray(items) || items.length === 0) {
      return {
        engine: 'paddleocr',
        text: '',
        confidence: 0,
        error: 'No text detected',
      };
    }

    const text = items.map((i) => i.text).join('\n');
    const avgConfidence = items.reduce((sum, i) => sum + (i.confidence ?? 0), 0) / items.length;

    return {
      engine: 'paddleocr',
      text,
      confidence: avgConfidence,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    // If PaddleOCR server is not available in production, throw error
    if (isProduction && (msg.includes('ECONNREFUSED') || msg.includes('fetch failed'))) {
      return {
        engine: 'paddleocr',
        text: '',
        confidence: 0,
        error: 'PaddleOCR server not reachable. Start with: docker run -p 9898:9898 paddleocr-server',
      };
    }

    // In dev, fail gracefully
    return {
      engine: 'paddleocr',
      text: '',
      confidence: 0,
      error: msg,
    };
  }
}
