/**
 * Digital Pandharpur — Audio Analysis
 *
 * ffprobe-based structural analysis (duration, sample rate, channels, codec,
 * bitrate) plus a volumedetect pass for loudness. The JSON parsers are pure
 * and unit-tested; the exec steps honestly report "not available" when
 * ffprobe is missing.
 */

import { execFileSync } from 'node:child_process';
import { detectCapabilities } from './tooling';

export interface AudioAnalysis {
  durationSeconds: number | null;
  sampleRate: number | null;
  channels: number | null;
  codec: string | null;
  bitRate: number | null;
  format: string | null;
  loudnessMeanDb: number | null;
  loudnessMaxDb: number | null;
}

export interface AnalysisResult {
  analysis: AudioAnalysis | null;
  error?: string;
}

/** Pure: parse `ffprobe -print_format json` output into an AudioAnalysis. */
export function parseFfprobeJson(raw: string): AudioAnalysis | null {
  try {
    const data = JSON.parse(raw);
    const stream: any = Array.isArray(data?.streams) ? data.streams[0] : null;
    const format: any = data?.format ?? null;

    return {
      durationSeconds:
        typeof stream?.duration === 'string' && stream.duration !== 'N/A'
          ? Number(stream.duration)
          : typeof format?.duration === 'string'
            ? Number(format.duration)
            : null,
      sampleRate: stream?.sample_rate ? Number(stream.sample_rate) : null,
      channels: stream?.channels != null ? Number(stream.channels) : null,
      codec: stream?.codec_name ?? null,
      bitRate: format?.bit_rate ? Number(format.bit_rate) : null,
      format: format?.format_name ?? null,
      loudnessMeanDb: null,
      loudnessMaxDb: null,
    };
  } catch {
    return null;
  }
}

/** Pure: parse volumedetect stderr lines into { mean, max } dB values. */
export function parseVolumedetectOutput(raw: string): {
  meanDb: number | null;
  maxDb: number | null;
} {
  const meanMatch = raw.match(/mean_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/);
  const maxMatch = raw.match(/max_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/);
  return {
    meanDb: meanMatch ? Number(meanMatch[1]) : null,
    maxDb: maxMatch ? Number(maxMatch[1]) : null,
  };
}

function probeJson(inputPath: string): string | null {
  try {
    return execFileSync(
      'ffprobe',
      ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', inputPath],
      { stdio: 'pipe', timeout: 30000, encoding: 'utf-8' }
    );
  } catch {
    return null;
  }
}

function probeLoudness(inputPath: string): { meanDb: number | null; maxDb: number | null } {
  try {
    const out = execFileSync(
      'ffmpeg',
      ['-i', inputPath, '-af', 'volumedetect', '-f', 'null', '-'],
      { stdio: 'pipe', timeout: 120000, encoding: 'utf-8' }
    );
    return parseVolumedetectOutput(out);
  } catch {
    return { meanDb: null, maxDb: null };
  }
}

/** Analyze an audio file on disk. Returns analysis:null + error when ffprobe is missing. */
export function analyzeAudio(inputPath: string): AnalysisResult {
  const caps = detectCapabilities();
  if (!caps.ffprobe) {
    return { analysis: null, error: 'ffprobe not available — audio analysis skipped.' };
  }

  const json = probeJson(inputPath);
  if (!json) {
    return { analysis: null, error: 'ffprobe could not read the audio file.' };
  }

  const analysis = parseFfprobeJson(json);
  if (!analysis) {
    return { analysis: null, error: 'ffprobe output could not be parsed.' };
  }

  if (caps.ffmpeg) {
    const loudness = probeLoudness(inputPath);
    analysis.loudnessMeanDb = loudness.meanDb;
    analysis.loudnessMaxDb = loudness.maxDb;
  }

  return { analysis };
}
