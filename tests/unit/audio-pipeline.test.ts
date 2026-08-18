import { describe, expect, test } from 'bun:test';
import {
  ENHANCEMENT_PROFILES,
  getProfile,
  DEFAULT_PROFILE_ID,
  parseFfprobeJson,
  parseVolumedetectOutput,
  parseSilencedetectOutput,
  validateAudio,
  normalizeMimeType,
  isSupportedAudioMime,
  isSupportedAudioExtension,
  detectCapabilities,
  runEnhancementPipeline,
  MAX_AUDIO_SIZE_BYTES,
} from '@/src/audio';

describe('audio — enhancement profiles', () => {
  test('TC-AUD-001: exactly the 8 spec profiles, unique ids, real filter chains', () => {
    expect(ENHANCEMENT_PROFILES).toHaveLength(8);
    const ids = new Set(ENHANCEMENT_PROFILES.map((p) => p.id));
    expect(ids.size).toBe(8);
    for (const profile of ENHANCEMENT_PROFILES) {
      expect(profile.filterChain.length).toBeGreaterThan(20);
      expect(profile.labelMarathi.length).toBeGreaterThan(0);
      expect(profile.description.length).toBeGreaterThan(0);
      // Every chain must include the loudness normalization stage
      expect(profile.filterChain).toContain('loudnorm');
    }
  });

  test('TC-AUD-002: getProfile resolves ids and falls back to the default', () => {
    expect(getProfile('kirtan').id).toBe('kirtan');
    expect(getProfile('nope').id).toBe(DEFAULT_PROFILE_ID);
    expect(getProfile(null).id).toBe(DEFAULT_PROFILE_ID);
    expect(ENHANCEMENT_PROFILES.some((p) => p.id === DEFAULT_PROFILE_ID)).toBe(true);
  });
});

describe('audio — ffprobe parsing (pure)', () => {
  test('TC-AUD-003: parses a realistic ffprobe JSON dump', () => {
    const analysis = parseFfprobeJson(
      JSON.stringify({
        streams: [
          { index: 0, codec_name: 'opus', sample_rate: '48000', channels: 2, duration: '24.5' },
        ],
        format: { format_name: 'matroska,webm', duration: '24.5', bit_rate: '96000' },
      })
    );
    expect(analysis).not.toBeNull();
    expect(analysis!.durationSeconds).toBe(24.5);
    expect(analysis!.sampleRate).toBe(48000);
    expect(analysis!.channels).toBe(2);
    expect(analysis!.codec).toBe('opus');
    expect(analysis!.bitRate).toBe(96000);
    expect(analysis!.format).toBe('matroska,webm');
  });

  test('TC-AUD-004: malformed ffprobe JSON yields null, not a throw', () => {
    expect(parseFfprobeJson('not json')).toBeNull();
    expect(parseFfprobeJson('{"streams":[]}')).not.toBeNull();
    expect(parseFfprobeJson('{}')).not.toBeNull();
  });

  test('TC-AUD-005: parses volumedetect dB lines', () => {
    expect(
      parseVolumedetectOutput('mean_volume: -17.3 dB\nmax_volume: -2.1 dB')
    ).toEqual({ meanDb: -17.3, maxDb: -2.1 });
    expect(parseVolumedetectOutput('no loudness data')).toEqual({ meanDb: null, maxDb: null });
  });
});

describe('audio — silencedetect segment parsing (pure)', () => {
  test('TC-AUD-006: no silence → one open-ended segment from 0', () => {
    expect(parseSilencedetectOutput('')).toEqual([{ start: 0, end: null }]);
  });

  test('TC-AUD-007: a single internal silence splits into two segments', () => {
    const raw = [
      'silence_start: 3.0',
      'silence_end: 4.0 | silence_duration: 1.0',
    ].join('\n');
    expect(parseSilencedetectOutput(raw)).toEqual([
      { start: 0, end: 3.0 },
      { start: 4.0, end: null },
    ]);
  });

  test('TC-AUD-008: leading silence is not counted as speech', () => {
    const raw = [
      'silence_start: 0',
      'silence_end: 1.5 | silence_duration: 1.5',
      'silence_start: 4.2',
      'silence_end: 5.8 | silence_duration: 1.6',
    ].join('\n');
    expect(parseSilencedetectOutput(raw)).toEqual([
      { start: 1.5, end: 4.2 },
      { start: 5.8, end: null },
    ]);
  });
});

describe('audio — validation gates', () => {
  test('TC-AUD-009: a webm/opus recording passes', () => {
    const result = validateAudio({
      mimeType: 'audio/webm;codecs=opus',
      filename: 'recording.webm',
      sizeBytes: 1_000_000,
      durationSeconds: 30,
    });
    expect(result.valid).toBe(true);
    expect(result.checked).toContain('format');
    expect(result.checked).toContain('size');
    expect(result.checked).toContain('duration');
    expect(result.warnings).toEqual([]);
  });

  test('TC-AUD-010: oversized audio is rejected with the size gate listed', () => {
    const result = validateAudio({
      mimeType: 'audio/webm',
      filename: 'big.webm',
      sizeBytes: MAX_AUDIO_SIZE_BYTES + 1,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('too large');
    expect(result.checked).toContain('size');
  });

  test('TC-AUD-011: unsupported formats are rejected', () => {
    const result = validateAudio({
      mimeType: 'application/pdf',
      filename: 'doc.pdf',
      sizeBytes: 1000,
    });
    expect(result.valid).toBe(false);
  });

  test('TC-AUD-012: too-short recordings are rejected; very short ones warn', () => {
    expect(
      validateAudio({ mimeType: 'audio/webm', filename: 'x.webm', sizeBytes: 10, durationSeconds: 0.5 }).valid
    ).toBe(false);
    const short = validateAudio({
      mimeType: 'audio/webm',
      filename: 'x.webm',
      sizeBytes: 10,
      durationSeconds: 2,
    });
    expect(short.valid).toBe(true);
    expect(short.warnings.some((w) => w.includes('short'))).toBe(true);
  });

  test('TC-AUD-013: unmeasurable duration warns instead of silently passing', () => {
    const result = validateAudio({
      mimeType: 'audio/webm',
      filename: 'x.webm',
      sizeBytes: 1000,
    });
    expect(result.valid).toBe(true);
    expect(result.checked).not.toContain('duration');
    expect(result.warnings.some((w) => w.includes('could not be measured'))).toBe(true);
  });

  test('TC-AUD-014: mime normalization strips codec parameters', () => {
    expect(normalizeMimeType('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(isSupportedAudioMime('audio/webm;codecs=opus')).toBe(true);
    expect(isSupportedAudioExtension('recording.webm')).toBe(true);
    expect(isSupportedAudioExtension('recording.xyz')).toBe(false);
  });
});

describe('audio — orchestrator honesty (environment-adaptive)', () => {
  test('TC-AUD-015: capability detection returns a full boolean report', () => {
    const caps = detectCapabilities();
    expect(typeof caps.ffmpeg).toBe('boolean');
    expect(typeof caps.ffprobe).toBe('boolean');
    expect(typeof caps.demucs).toBe('boolean');
  });

  test('TC-AUD-016: pipeline never fakes — skipped reasons are recorded verbatim', async () => {
    const caps = detectCapabilities();
    const result = await runEnhancementPipeline({
      buffer: Buffer.from('not real audio bytes'),
      originalName: 'recording.webm',
      mimeType: 'audio/webm;codecs=opus',
      sizeBytes: 32,
    });

    // Hard gates pass (format+size); enhancement output is only present when
    // ffmpeg genuinely produced it.
    expect(result.ok).toBe(true);
    expect(result.validation.valid).toBe(true);
    expect(Array.isArray(result.skipped)).toBe(true);
    expect(result.metadata.pipelineVersion).toBe('t2-v1');
    expect(typeof result.metadata.skipped).toBe('object');

    if (!caps.ffmpeg) {
      // On hosts without ffmpeg the pipeline must say so explicitly.
      expect(result.enhanced).toBeNull();
      expect(result.skipped.join(' ')).toContain('ffmpeg');
      expect(result.analysisError).toBeTruthy();
    } else {
      // With ffmpeg present, a garbage buffer must fail loudly — still honest.
      expect(result.skipped.join(' ')).toMatch(/ffmpeg|Pipeline error/i);
    }
  });

  test('TC-AUD-017: hard validation failure short-circuits the pipeline', async () => {
    const result = await runEnhancementPipeline({
      buffer: Buffer.from('x'),
      originalName: 'doc.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 100,
    });
    expect(result.ok).toBe(false);
    expect(result.validation.valid).toBe(false);
    expect(result.enhanced).toBeNull();
  });
});
