/**
 * Digital Pandharpur — Base Extractor Interface
 *
 * Every format extractor implements this interface.
 * The pipeline calls extract() and gets back structured extraction results.
 */

export interface ExtractionResult {
  /** The main extracted text content */
  text: string;
  /** Suggested title (from metadata or first line heuristics) */
  title: string;
  /** Total character count of extracted text */
  textLength: number;
  /** Estimated number of compositions found in this content */
  compositionCount: number;
  /** Format-specific metadata */
  metadata: Record<string, unknown>;
  /** Confidence score [0-1] for the extraction quality */
  confidence: number;
  /** Error message if extraction failed */
  error?: string;
}

export interface ExtractionOptions {
  /** Max pages/chapters to process (default: all) */
  maxPages?: number;
  /** Extract detailed structure (chapters, sections) */
  extractStructure?: boolean;
  /** Language hints for OCR/ASR */
  language?: string[];
  /**
   * When captions/subtitles are unavailable for a YouTube source, download
   * the audio track and run it through speech-to-text as a fallback.
   * Defaults to FALSE: yt-dlp + Whisper can take minutes, so the request
   * path returns immediately with `needsAudioProcessing` instead, and the
   * background worker (src/lib/audio-processing.ts) performs the fallback
   * with this option explicitly enabled.
   */
  transcribeAudioFallback?: boolean;
}

export interface IExtractor {
  /** Unique identifier for this extractor */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Supported MIME types */
  readonly supportedMimeTypes: string[];
  /** Extract text and metadata from a file buffer */
  extract(buffer: Buffer, filename: string, options?: ExtractionOptions): Promise<ExtractionResult>;
  /** Check if this extractor can handle the given file */
  canHandle(mimeType: string, extension: string): boolean;
}
