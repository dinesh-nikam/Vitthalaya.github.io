/**
 * Digital Pandharpur — Enhancement Pipeline Orchestrator
 *
 *   Raw Recording
 *     → Validation (format/size/duration gates)
 *     → Analysis (ffprobe: duration, sample rate, channels, codec, loudness)
 *     → Enhancement (profile filter chain; NEW output file — original untouched)
 *     → Vocal isolation (demucs, when installed and requested)
 *     → VAD / silence segmentation (ffmpeg silencedetect)
 *
 * The original buffer is never modified: the pipeline works on a temp copy,
 * and every derived asset is returned as a fresh buffer + metadata for the
 * caller to persist as an UploadedFileVersion. `skipped[]` honestly lists
 * every stage that could not run and why — nothing is faked (spec §32).
 */

import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { detectCapabilities, type AudioCapabilities } from './tooling';
import { getProfile, DEFAULT_PROFILE_ID } from './profiles';
import { validateAudio, type AudioValidation } from './validate-audio';
import { analyzeAudio, type AudioAnalysis } from './analyze-audio';
import { enhanceAudio } from './enhance-audio';
import { isolateVocals } from './vocal-isolate';
import { detectSegments, type AudioSegment } from './vad';

export const PIPELINE_VERSION = 't2-v1';

export interface PipelineInput {
  buffer: Buffer;
  originalName: string;
  mimeType?: string | null;
  sizeBytes: number;
  profileId?: string | null;
  isolateVocals?: boolean;
}

export interface EnhancedAsset {
  buffer: Buffer;
  fileName: string;
  sizeBytes: number;
  profileId: string;
  filtersUsed: string;
}

export interface PipelineResult {
  /** True unless a hard validation gate rejected the audio. */
  ok: boolean;
  validation: AudioValidation;
  capabilities: AudioCapabilities;
  analysis: AudioAnalysis | null;
  analysisError?: string;
  /** Enhanced 16kHz mono WAV, or null when ffmpeg was unavailable/failed. */
  enhanced: EnhancedAsset | null;
  /** Vocals-only WAV, or null when demucs was unavailable/not requested/failed. */
  vocal: EnhancedAsset | null;
  /** Spoken segments from VAD, or null when it could not run. */
  segments: AudioSegment[] | null;
  segmentsError?: string;
  /** Every stage that did not run, with the honest reason. */
  skipped: string[];
  /** JSON-safe metadata for the UploadedFileVersion row. */
  metadata: Record<string, unknown>;
}

export async function runEnhancementPipeline(input: PipelineInput): Promise<PipelineResult> {
  const capabilities = detectCapabilities();
  const skipped: string[] = [];

  // 1. Validation — pure gates first; duration is added after analysis.
  const validation = validateAudio({
    mimeType: input.mimeType,
    filename: input.originalName,
    sizeBytes: input.sizeBytes,
  });

  const baseResult: PipelineResult = {
    ok: validation.valid,
    validation,
    capabilities,
    analysis: null,
    enhanced: null,
    vocal: null,
    segments: null,
    skipped,
    metadata: {},
  };

  if (!validation.valid) {
    return baseResult;
  }

  // 2. Work on a temp copy — never the original.
  const tempDir = await mkdtemp(join(tmpdir(), 'varkari-audio-'));
  const inputPath = join(tempDir, `input${extname(input.originalName) || '.webm'}`);

  try {
    await writeFile(inputPath, input.buffer);

    // 3. Analysis (ffprobe) + duration-aware validation.
    const { analysis, error: analysisError } = analyzeAudio(inputPath);
    baseResult.analysis = analysis;
    if (analysisError) {
      baseResult.analysisError = analysisError;
      skipped.push(analysisError);
    }

    if (analysis?.durationSeconds != null && validation.valid) {
      const durationCheck = validateAudio({
        mimeType: input.mimeType,
        filename: input.originalName,
        sizeBytes: input.sizeBytes,
        durationSeconds: analysis.durationSeconds,
      });
      if (!durationCheck.valid) {
        baseResult.validation = durationCheck;
        baseResult.ok = false;
        return baseResult;
      }
      baseResult.validation = durationCheck;
    }

    // 4. Enhancement — new output file, input never modified.
    const profile = getProfile(input.profileId ?? DEFAULT_PROFILE_ID);
    const enhancedPath = join(tempDir, 'enhanced.wav');
    const enhancement = enhanceAudio(inputPath, enhancedPath, profile.id);

    if (enhancement.ok && enhancement.outputPath) {
      const enhancedBuffer = await readFile(enhancement.outputPath);
      baseResult.enhanced = {
        buffer: enhancedBuffer,
        fileName: `enhanced-${input.originalName.replace(/\.[^.]+$/, '')}.wav`,
        sizeBytes: enhancement.sizeBytes ?? enhancedBuffer.length,
        profileId: enhancement.profileId,
        filtersUsed: enhancement.filtersUsed,
      };
    } else {
      skipped.push(enhancement.error ?? 'Enhancement produced no output.');
    }

    // 5. Vocal isolation (demucs) — optional.
    if (input.isolateVocals) {
      const vocalResult = isolateVocals(inputPath, tempDir);
      if (vocalResult.ok && vocalResult.vocalPath) {
        const vocalBuffer = await readFile(vocalResult.vocalPath);
        baseResult.vocal = {
          buffer: vocalBuffer,
          fileName: `vocals-${input.originalName.replace(/\.[^.]+$/, '')}.wav`,
          sizeBytes: vocalResult.sizeBytes ?? vocalBuffer.length,
          profileId: profile.id,
          filtersUsed: 'demucs --two-stems=vocals',
        };
      } else {
        skipped.push(vocalResult.error ?? 'Vocal isolation produced no output.');
      }
    }

    // 6. VAD / silence segmentation on the enhanced (or original) audio.
    const vadInput = baseResult.enhanced ? enhancedPath : inputPath;
    const vad = detectSegments(vadInput);
    if (vad.error) {
      baseResult.segmentsError = vad.error;
      skipped.push(vad.error);
    } else {
      baseResult.segments = vad.segments;
    }
  } catch (err: any) {
    skipped.push(`Pipeline error: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }

  // 7. JSON-safe metadata for the persisted UploadedFileVersion.
  baseResult.metadata = {
    pipelineVersion: PIPELINE_VERSION,
    profileId: baseResult.enhanced?.profileId ?? getProfile(input.profileId ?? DEFAULT_PROFILE_ID).id,
    filtersUsed: baseResult.enhanced?.filtersUsed ?? null,
    appliedAt: new Date().toISOString(),
    analysis: baseResult.analysis,
    analysisError: baseResult.analysisError ?? null,
    segments: baseResult.segments,
    segmentsError: baseResult.segmentsError ?? null,
    vocalIsolated: baseResult.vocal !== null,
    skipped,
    capabilities: {
      ffmpeg: capabilities.ffmpeg,
      ffprobe: capabilities.ffprobe,
      demucs: capabilities.demucs,
    },
  };

  return baseResult;
}
