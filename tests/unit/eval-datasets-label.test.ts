import { describe, expect, test } from 'bun:test';
import { correctionSampleLabel } from '@/src/eval/datasets';

describe('correctionSampleLabel', () => {
  test('includes upload name when present', () => {
    expect(
      correctionSampleLabel({ uploadName: 'माझा अभंग.mp3', modelVersion: null, correctionId: 'abc12345' })
    ).toBe('माझा अभंग.mp3');
  });

  test('appends model version when present', () => {
    expect(
      correctionSampleLabel({ uploadName: 'rec.wav', modelVersion: 'whisper', correctionId: 'abc12345' })
    ).toBe('rec.wav (whisper)');
  });

  test('falls back to a recording id short form for anonymous uploads', () => {
    const label = correctionSampleLabel({ uploadName: '', modelVersion: null, correctionId: 'f00dface-beef' });
    expect(label).toContain('रेकॉर्डिंग');
    expect(label).toContain('f00dface');
  });

  test('trims whitespace-only upload names to the fallback', () => {
    const label = correctionSampleLabel({ uploadName: '   ', modelVersion: null, correctionId: 'deadbeef00' });
    expect(label).toContain('रेकॉर्डिंग');
  });
});
