/**
 * Digital Pandharpur — Audio Enhancement (ffmpeg)
 *
 * Runs a profile's filter chain with ffmpeg, always writing to a NEW output
 * file — the input is never modified. Output is 16 kHz mono PCM WAV, the
 * standard shape for Whisper-style ASR.
 *
 * Honesty rule: when ffmpeg is unavailable or the run fails, we return
 * `ok: false` with the real reason. The orchestrator records that reason in
 * the version metadata instead of pretending an enhancement happened.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { detectCapabilities } from './tooling';
import { getProfile } from './profiles';

export interface EnhancementResult {
  ok: boolean;
  outputPath?: string;
  sizeBytes?: number;
  profileId: string;
  filtersUsed: string;
  error?: string;
}

const FFMPEG_TIMEOUT_MS = 300_000; // 5 min for long recordings

/**
 * Enhance `inputPath` → `outputPath` (a fresh file) using the given profile.
 * Never overwrites the input.
 */
export function enhanceAudio(
  inputPath: string,
  outputPath: string,
  profileId: string | null | undefined
): EnhancementResult {
  const caps = detectCapabilities();
  if (!caps.ffmpeg) {
    return {
      ok: false,
      profileId: profileId ?? 'clean_voice',
      filtersUsed: '',
      error: 'ffmpeg not available — enhancement skipped.',
    };
  }

  const profile = getProfile(profileId);

  try {
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-i',
        inputPath,
        '-af',
        profile.filterChain,
        '-ar',
        '16000',
        '-ac',
        '1',
        '-c:a',
        'pcm_s16le',
        outputPath,
      ],
      { stdio: 'pipe', timeout: FFMPEG_TIMEOUT_MS }
    );

    if (!existsSync(outputPath)) {
      return {
        ok: false,
        profileId: profile.id,
        filtersUsed: profile.filterChain,
        error: 'ffmpeg finished without producing an output file.',
      };
    }

    return {
      ok: true,
      outputPath,
      sizeBytes: statSync(outputPath).size,
      profileId: profile.id,
      filtersUsed: profile.filterChain,
    };
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      profileId: profile.id,
      filtersUsed: profile.filterChain,
      error: `ffmpeg enhancement failed: ${msg.slice(0, 300)}`,
    };
  }
}
