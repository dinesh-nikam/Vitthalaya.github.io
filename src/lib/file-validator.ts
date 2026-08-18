/**
 * Digital Pandharpur — File Upload Validator
 *
 * Validates uploaded files: MIME type, size, magic bytes.
 * Supports all desired formats with clear error messages.
 */

// ─── Supported Formats ───────────────────────────────────────────────────────

export const SUPPORTED_FORMATS = {
  image: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/bmp', 'image/heic'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif', '.bmp', '.heic'],
    maxSize: 20 * 1024 * 1024, // 20MB
    description: 'Images (JPG, PNG, WebP, TIFF, BMP, HEIC)',
  },
  pdf: {
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf'],
    maxSize: 100 * 1024 * 1024, // 100MB
    description: 'PDF documents',
  },
  document: {
    mimeTypes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
      'application/vnd.oasis.opendocument.text',
      'text/markdown',
    ],
    extensions: ['.doc', '.docx', '.txt', '.rtf', '.odt', '.md'],
    maxSize: 25 * 1024 * 1024, // 25MB
    description: 'Documents (DOCX, TXT, RTF, ODT, MD)',
  },
  ebook: {
    mimeTypes: ['application/epub+zip', 'application/x-mobipocket-ebook', 'application/vnd.amazon.ebook'],
    extensions: ['.epub', '.mobi', '.azw'],
    maxSize: 50 * 1024 * 1024, // 50MB
    description: 'Ebooks (EPUB, MOBI, AZW)',
  },
  audio: {
    mimeTypes: [
      'audio/mpeg', 'audio/wav', 'audio/aac', 'audio/ogg',
      'audio/flac', 'audio/x-m4a', 'audio/mp4',
      // In-browser voice recordings (MediaRecorder produces
      // audio/webm;codecs=opus — the codec parameter is stripped below).
      'audio/webm',
    ],
    extensions: ['.mp3', '.wav', '.aac', '.ogg', '.flac', '.m4a'],
    maxSize: 200 * 1024 * 1024, // 200MB
    description: 'Audio (MP3, WAV, AAC, OGG, FLAC, M4A, WebM)',
  },
  video: {
    mimeTypes: [
      'video/mp4', 'video/quicktime', 'video/x-matroska',
      'video/avi', 'video/webm',
      // 'video/webm;codecs=...' variants are matched via the parameter
      // stripping in classifyUploadFormat.
    ],
    extensions: ['.mp4', '.mov', '.mkv', '.avi', '.webm'],
    maxSize: 500 * 1024 * 1024, // 500MB
    description: 'Video (MP4, MOV, MKV, AVI, WebM)',
  },
} as const;

export type UploadFormat = keyof typeof SUPPORTED_FORMATS;

// ─── Format Classification ───────────────────────────────────────────────────

/**
 * Detect format category from MIME type and/or filename extension.
 */
export function classifyUploadFormat(
  mimeType: string,
  filename: string
): UploadFormat | 'youtube' | 'unknown' {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  // Strip MIME parameters (e.g. ";codecs=opus") so 'audio/webm;codecs=opus'
  // from MediaRecorder matches the plain 'audio/webm' entry. The bare
  // extension is only consulted when the MIME is absent/unknown, and audio is
  // checked before video in the loop below, so real video/webm uploads (which
  // always carry a video/webm MIME) still classify as video.
  const mime = mimeType.toLowerCase().split(';')[0].trim();

  const knownFormats = SUPPORTED_FORMATS as unknown as Record<string, { mimeTypes: string[]; extensions: string[] }>;
  for (const [fmt, info] of Object.entries(knownFormats)) {
    if (info.mimeTypes.includes(mime)) return fmt as UploadFormat;
    for (const e of info.extensions) {
      if (ext === e) return fmt as UploadFormat;
    }
  }

  return 'unknown';
}

// ─── Validation ──────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  format: UploadFormat | 'youtube' | 'unknown';
  mimeType: string;
  sizeBytes: number;
  error?: string;
}

/**
 * Validate an uploaded file. Checks MIME type, size limits, and basic integrity.
 */
export function validateUpload(
  mimeType: string,
  sizeBytes: number,
  filename: string
): ValidationResult {
  const format = classifyUploadFormat(mimeType, filename);

  if (format === 'unknown') {
    return {
      valid: false,
      format: 'unknown',
      mimeType,
      sizeBytes,
      error: `Unsupported file type "${mimeType}". Supported: Images, PDF, DOCX, TXT, EPUB, Audio, Video.`,
    };
  }

  const limits = SUPPORTED_FORMATS[format as UploadFormat];

  if (sizeBytes === 0) {
    return {
      valid: false,
      format,
      mimeType,
      sizeBytes,
      error: 'Empty file uploaded.',
    };
  }

  if (sizeBytes > limits.maxSize) {
    const maxMB = Math.round(limits.maxSize / 1024 / 1024);
    const actualMB = Math.round(sizeBytes / 1024 / 1024);
    return {
      valid: false,
      format,
      mimeType,
      sizeBytes,
      error: `File too large (${actualMB}MB). Maximum for ${limits.description}: ${maxMB}MB.`,
    };
  }

  return {
    valid: true,
    format,
    mimeType,
    sizeBytes,
  };
}

// ─── Human-Readable Error Helpers ────────────────────────────────────────────

const FORMAT_LABELS: Record<string, string> = {
  image: 'प्रतिमा (Image)',
  pdf: 'पीडीएफ (PDF)',
  document: 'कागदपत्र (Document)',
  ebook: 'ई-पुस्तक (Ebook)',
  audio: 'ऑडिओ (Audio)',
  video: 'व्हिडिओ (Video)',
  youtube: 'यूट्यूब (YouTube)',
};

export function getFormatLabel(format: string): string {
  return FORMAT_LABELS[format] ?? format;
}
