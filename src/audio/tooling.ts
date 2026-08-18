/**
 * Digital Pandharpur — Audio Tooling Detection
 *
 * The audio enhancement pipeline depends on external binaries (ffmpeg,
 * ffprobe, demucs). Availability is probed once per process and cached;
 * every consumer receives an honest report of what is and isn't available —
 * the pipeline never fakes an enhancement it cannot perform.
 */

import { execFileSync } from 'node:child_process';

export interface AudioCapabilities {
  ffmpeg: boolean;
  ffprobe: boolean;
  demucs: boolean;
  ffmpegVersion?: string;
  ffprobeVersion?: string;
  demucsVersion?: string;
}

const PROBE_TIMEOUT_MS = 5000;

function probeVersion(binary: string, args: string[]): string | null {
  try {
    const out = execFileSync(binary, args, {
      stdio: 'pipe',
      timeout: PROBE_TIMEOUT_MS,
      encoding: 'utf-8',
    });
    const firstLine = out.split('\n')[0]?.trim();
    return firstLine && firstLine.length > 0 ? firstLine : 'present';
  } catch {
    return null;
  }
}

let cached: AudioCapabilities | null = null;

/**
 * Probe for ffmpeg/ffprobe/demucs availability. Results are cached for the
 * process lifetime; pass `force = true` to re-probe.
 */
export function detectCapabilities(force = false): AudioCapabilities {
  if (cached && !force) {
    return cached;
  }

  const ffmpegVersion = probeVersion('ffmpeg', ['-version']);
  const ffprobeVersion = probeVersion('ffprobe', ['-version']);
  const demucsVersion = probeVersion('demucs', ['--version']);

  cached = {
    ffmpeg: ffmpegVersion !== null,
    ffprobe: ffprobeVersion !== null,
    demucs: demucsVersion !== null,
    ffmpegVersion: ffmpegVersion ?? undefined,
    ffprobeVersion: ffprobeVersion ?? undefined,
    demucsVersion: demucsVersion ?? undefined,
  };

  return cached;
}

/** Human-readable summary of what the pipeline can actually do here. */
export function capabilitiesSummary(caps: AudioCapabilities): string[] {
  const lines: string[] = [];
  if (caps.ffmpeg && caps.ffprobe) {
    lines.push('ffmpeg + ffprobe: available — enhancement, analysis and VAD enabled');
  } else {
    lines.push('ffmpeg/ffprobe: NOT available — enhancement, analysis and VAD are skipped');
  }
  if (caps.demucs) {
    lines.push('demucs: available — vocal isolation enabled');
  } else {
    lines.push('demucs: NOT available — vocal isolation is skipped');
  }
  return lines;
}
