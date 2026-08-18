/**
 * Digital Pandharpur — Audio Enhancement Pipeline (public API)
 *
 *   runEnhancementPipeline() — validate → analyze → enhance → isolate → VAD,
 *   never touching the original buffer. Returns honest capability reports
 *   and versioned metadata for the caller to persist.
 */

export { runEnhancementPipeline, PIPELINE_VERSION } from './enhance-pipeline';
export type {
  PipelineInput,
  PipelineResult,
  EnhancedAsset,
} from './enhance-pipeline';

export { detectCapabilities, capabilitiesSummary } from './tooling';
export type { AudioCapabilities } from './tooling';

export { ENHANCEMENT_PROFILES, getProfile, DEFAULT_PROFILE_ID } from './profiles';
export type { EnhancementProfile } from './profiles';

export {
  validateAudio,
  isSupportedAudioMime,
  isSupportedAudioExtension,
  normalizeMimeType,
  MAX_AUDIO_SIZE_BYTES,
  AUDIO_MIME_WHITELIST,
  AUDIO_EXT_WHITELIST,
} from './validate-audio';
export type { AudioValidation, AudioValidationInput } from './validate-audio';

export { analyzeAudio, parseFfprobeJson, parseVolumedetectOutput } from './analyze-audio';
export type { AudioAnalysis } from './analyze-audio';

export { parseSilencedetectOutput, detectSegments } from './vad';
export type { AudioSegment, VadResult } from './vad';

export { isolateVocals } from './vocal-isolate';
