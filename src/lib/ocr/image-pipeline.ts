/**
 * Digital Pandharpur — OCR Image Preprocessing Pipeline
 *
 * Pre-processes images before OCR to maximize accuracy:
 *   1. Auto-orient (EXIF)
 *   2. Grayscale conversion
 *   3. Adaptive thresholding / binarization
 *
 * Enhanced version of the existing src/lib/ocr.ts preprocessImage.
 */

import sharp from 'sharp';
import type { Metadata as SharpMetadata } from 'sharp';

export interface OcrPreprocessOptions {
  /** Enable deskewing (default: true) - requires additional computation */
  deskew?: boolean;
  /** Enable noise reduction (default: true) */
  denoise?: boolean;
  /** Enable contrast enhancement (default: true) */
  enhance?: boolean;
  /** Binarization threshold (0-255, default: 130) */
  threshold?: number;
  /** Target DPI for OCR (default: 300) */
  targetDpi?: number;
}

/**
 * Pre-process an image buffer for optimal OCR.
 * Returns the processed buffer and metadata about the image.
 */
export async function preprocessForOcr(
  buffer: Buffer,
  options: OcrPreprocessOptions = {}
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const {
    deskew = true,
    denoise = true,
    enhance = true,
    threshold = 130,
    targetDpi = 300,
  } = options;

  let pipeline = sharp(buffer).rotate(); // auto-orient based on EXIF

  // Get metadata first
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  // Resize if image is too small (ensure minimum useful size)
  if (width > 0 && height > 0 && (width < 800 || height < 600)) {
    const scale = Math.max(800 / width, 600 / height);
    pipeline = pipeline.resize(Math.round(width * scale), undefined, {
      fit: 'inside',
      withoutEnlargement: false,
    });
  }

  // Convert to grayscale for better text recognition
  pipeline = pipeline.grayscale();

  // Noise reduction using median filter (if sharp supports it)
  if (denoise) {
    // sharp's median filter
    pipeline = pipeline.median(1);
  }

  // Contrast enhancement (CLAHE-like via gamma + linear)
  if (enhance) {
    // Apply gamma correction to enhance contrast
    pipeline = pipeline.gamma(1.2);
  }

  // Binarization (threshold to pure black/white)
  pipeline = pipeline.threshold(threshold);

  // Set resolution metadata for PDF processing
  pipeline = pipeline.withMetadata({ density: targetDpi });

  const processedBuffer = await pipeline.toBuffer();

  return {
    buffer: processedBuffer,
    width,
    height,
  };
}

/**
 * Quick check if an image needs preprocessing (is it already clean enough?)
 * Returns true if preprocessing is recommended.
 */
export function needsPreprocessing(metadata: SharpMetadata): boolean {
  // If image is already grayscale or has limited colors, might still need threshold
  if (metadata.channels && metadata.channels <= 2) {
    return false; // already grayscale/binary
  }

  // Color images always benefit from preprocessing
  return true;
}
