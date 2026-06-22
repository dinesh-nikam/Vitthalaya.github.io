/**
 * Digital Pandharpur — Extractor Registry
 *
 * Central registry for all format extractors.
 * Automatically picks the right extractor for any file.
 */

import type { IExtractor, ExtractionResult, ExtractionOptions } from './base';
import { TextExtractor } from './text-extractor';
import { DocxExtractor } from './docx-extractor';
import { PdfExtractor } from './pdf-extractor';
import { EpubExtractor } from './epub-extractor';
import { AudioExtractor } from './audio-extractor';
import { VideoExtractor } from './video-extractor';
import { YouTubeExtractor } from './youtube-extractor';

export type { IExtractor } from './base';
export type { ExtractionResult, ExtractionOptions } from './base';

/** All registered extractors */
const extractors: IExtractor[] = [
  new PdfExtractor(),
  new DocxExtractor(),
  new TextExtractor(),
  new EpubExtractor(),
  new AudioExtractor(),
  new VideoExtractor(),
  new YouTubeExtractor(),
];

/**
 * Find the best extractor for a given file.
 */
export function findExtractor(
  mimeType: string,
  filename: string
): IExtractor | null {
  const ext = '.' + (filename.split('.').pop()?.toLowerCase() ?? '');

  for (const extractor of extractors) {
    if (extractor.canHandle(mimeType, ext)) {
      return extractor;
    }
  }

  return null;
}

/**
 * Extract text from a file buffer using the best matching extractor.
 *
 * @param buffer - File contents
 * @param filename - Original filename (for extension detection)
 * @param mimeType - MIME type of the file
 * @param options - Extraction options
 * @returns Extraction result
 */
export async function extractContent(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  options?: ExtractionOptions
): Promise<ExtractionResult> {
  const extractor = findExtractor(mimeType, filename);

  if (!extractor) {
    return {
      text: '',
      title: filename.replace(/\.\w+$/, ''),
      textLength: 0,
      compositionCount: 0,
      metadata: {},
      confidence: 0,
      error: `No extractor available for "${mimeType}" (${filename}). Supported formats: Images, PDF, DOCX, TXT, EPUB, Audio, Video.`,
    };
  }

  return extractor.extract(buffer, filename, options);
}

/**
 * Check if a string is a YouTube URL.
 */
export function isYouTubeUrl(url: string): boolean {
  return YouTubeExtractor.isYouTubeUrl(url);
}

/**
 * Extract video ID from a YouTube URL.
 */
export function extractYouTubeVideoId(url: string): string | null {
  return YouTubeExtractor.extractVideoId(url);
}

export {
  TextExtractor,
  DocxExtractor,
  PdfExtractor,
  EpubExtractor,
  AudioExtractor,
  VideoExtractor,
  YouTubeExtractor,
};


