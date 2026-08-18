/**
 * Digital Pandharpur — Audio Validation
 *
 * Format / size / duration / quality gates for incoming recordings. Every
 * check that cannot run (e.g. duration measurement needs ffprobe) is listed
 * in `checked`/`warnings` so callers never mistake a skipped check for a
 * pass. Validation never rejects a recording it could not fully inspect —
 * it warns instead, keeping the "useful explanation + retry" contract of
 * spec §26.
 */

export const AUDIO_MIME_WHITELIST = [
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
  'audio/mp4',
  'audio/x-m4a',
  'audio/flac',
  'audio/opus',
  'audio/amr',
  'audio/3gpp',
];

export const AUDIO_EXT_WHITELIST = [
  '.webm',
  '.ogg',
  '.oga',
  '.opus',
  '.mp3',
  '.wav',
  '.aac',
  '.m4a',
  '.mp4',
  '.flac',
  '.amr',
  '.3gp',
];

export const MAX_AUDIO_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB — matches the upload page's audio cap
export const MIN_DURATION_SECONDS = 1;
export const MAX_DURATION_SECONDS = 60 * 60; // 60 min for long kirtans

/** Strip MIME parameters (`audio/webm;codecs=opus` → `audio/webm`). */
export function normalizeMimeType(mimeType: string): string {
  return mimeType.split(';')[0].trim().toLowerCase();
}

export function isSupportedAudioMime(mimeType: string): boolean {
  const base = normalizeMimeType(mimeType);
  return AUDIO_MIME_WHITELIST.includes(base) || base.startsWith('audio/');
}

export function isSupportedAudioExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return AUDIO_EXT_WHITELIST.some((ext) => lower.endsWith(ext));
}

export interface AudioValidationInput {
  mimeType?: string | null;
  filename: string;
  sizeBytes: number;
  /** Measured by ffprobe when available; undefined when it could not run. */
  durationSeconds?: number | null;
}

export interface AudioValidation {
  valid: boolean;
  error?: string;
  /** Warnings that do not block (e.g. a check could not run, very short clip). */
  warnings: string[];
  /** Which gates actually ran (format, size, duration). */
  checked: string[];
}

export function validateAudio(input: AudioValidationInput): AudioValidation {
  const warnings: string[] = [];
  const checked: string[] = [];

  // ── Format gate ──
  const mimeOk = input.mimeType ? isSupportedAudioMime(input.mimeType) : null;
  const extOk = isSupportedAudioExtension(input.filename);

  if (mimeOk === false && !extOk) {
    return {
      valid: false,
      error:
        'Unsupported audio format. Recordings must be webm/opus, ogg, mp3, wav, m4a, aac or flac.',
      warnings,
      checked: ['format'],
    };
  }
  checked.push('format');

  // ── Size gate ──
  if (input.sizeBytes > MAX_AUDIO_SIZE_BYTES) {
    return {
      valid: false,
      error: `Audio file is too large (max ${MAX_AUDIO_SIZE_BYTES / 1024 / 1024} MB).`,
      warnings,
      checked: [...checked, 'size'],
    };
  }
  if (input.sizeBytes <= 0) {
    return {
      valid: false,
      error: 'Audio file is empty.',
      warnings,
      checked: [...checked, 'size'],
    };
  }
  checked.push('size');

  // ── Duration gate (only when measurable) ──
  if (input.durationSeconds == null) {
    warnings.push(
      'Duration could not be measured (ffprobe unavailable) — length checks were skipped.'
    );
  } else {
    checked.push('duration');
    if (input.durationSeconds < MIN_DURATION_SECONDS) {
      return {
        valid: false,
        error: 'Recording is too short (under 1 second) — nothing meaningful to transcribe.',
        warnings,
        checked,
      };
    }
    if (input.durationSeconds > MAX_DURATION_SECONDS) {
      return {
        valid: false,
        error: 'Recording is longer than 60 minutes — please split it into parts.',
        warnings,
        checked,
      };
    }
    if (input.durationSeconds < 3) {
      warnings.push('Recording is very short — speech may be difficult to transcribe.');
    }
  }

  return { valid: true, warnings, checked };
}
