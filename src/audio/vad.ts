/**
 * Digital Pandharpur — Voice Activity Detection (silence-based)
 *
 * Runs ffmpeg's silencedetect filter to split a recording into spoken
 * segments. Segments are honest: silence boundaries only, and the parser is
 * pure so the boundary math is unit-tested. When ffmpeg is missing, returns
 * `error` — the caller records that VAD was skipped rather than fabricating
 * segment timings.
 */

import { execFileSync } from 'node:child_process';
import { detectCapabilities } from './tooling';

export interface AudioSegment {
  start: number;
  /** Null = segment continues to the end of the audio. */
  end: number | null;
}

export interface VadResult {
  segments: AudioSegment[];
  error?: string;
}

const SILENCE_THRESHOLD_DB = -30;
const MIN_SILENCE_SECONDS = 0.5;

/**
 * Pure: parse ffmpeg silencedetect stderr into spoken segments.
 *
 * Input lines look like:
 *   [silencedetect @ 0x...] silence_start: 0.234567
 *   [silencedetect @ 0x...] silence_end: 1.876543 | silence_duration: 1.641975
 *
 * Segments run from the end of one silence to the start of the next; the
 * last segment is open-ended (end: null) unless a trailing silence closes it.
 */
export function parseSilencedetectOutput(raw: string): AudioSegment[] {
  const silenceStartRe = /silence_start:\s*([\d.]+)/g;
  const silenceEndRe = /silence_end:\s*([\d.]+)/g;

  const starts: number[] = [];
  const ends: number[] = [];

  let match: RegExpExecArray | null;
  while ((match = silenceStartRe.exec(raw)) !== null) {
    starts.push(Number(match[1]));
  }
  while ((match = silenceEndRe.exec(raw)) !== null) {
    ends.push(Number(match[1]));
  }

  const segments: AudioSegment[] = [];

  // Walk silences in order. A spoken segment spans [prevEnd, silenceStart).
  let cursor = 0; // start of the current speech region
  let silenceIndex = 0;

  // Interleave starts and ends by position. (ffmpeg emits them in order.)
  while (silenceIndex < starts.length) {
    const start = starts[silenceIndex];
    const end = ends[silenceIndex];

    if (start > cursor) {
      segments.push({ start: cursor, end: start });
    }

    if (end != null && !Number.isNaN(end)) {
      cursor = end;
    } else {
      // A silence that never ended — stop here.
      cursor = start;
      break;
    }
    silenceIndex++;
  }

  // Anything after the last closed silence is a final open-ended segment.
  segments.push({ start: cursor, end: null });

  return segments;
}

/**
 * Detect spoken segments in an audio file. Returns segments:[] + error when
 * ffmpeg is unavailable or the probe fails.
 */
export function detectSegments(inputPath: string): VadResult {
  const caps = detectCapabilities();
  if (!caps.ffmpeg) {
    return { segments: [], error: 'ffmpeg not available — silence/VAD detection skipped.' };
  }

  try {
    const out = execFileSync(
      'ffmpeg',
      [
        '-i',
        inputPath,
        '-af',
        `silencedetect=noise=${SILENCE_THRESHOLD_DB}dB:d=${MIN_SILENCE_SECONDS}`,
        '-f',
        'null',
        '-',
      ],
      { stdio: 'pipe', timeout: 300000, encoding: 'utf-8' }
    );

    return { segments: parseSilencedetectOutput(out) };
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    return { segments: [], error: `Silence detection failed: ${msg.slice(0, 300)}` };
  }
}
