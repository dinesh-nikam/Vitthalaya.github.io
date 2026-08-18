import { describe, expect, test } from 'bun:test';
import {
  alignAndCorrect,
  alignManualEdit,
  alignLines,
  computeWordDiffs,
  classifyErrorType,
  LINE_CORRECT_THRESHOLD,
} from '@/src/canonical/canonical-corrector';

const CANONICAL = [
  'विठ्ठल विठ्ठल गा रे सुखाचा सागर',
  'पुंडलिका वरदा विठ्ठल सुंदर',
  'ज्ञानदेव तुका म्हणे विठ्ठल अंतर',
  'विठ्ठल विठ्ठल गा रे',
].join('\n');

describe('canonical corrector — alignAndCorrect', () => {
  test('TC-CORR-001: identical ASR and canonical → no changes, no false correction record', () => {
    const result = alignAndCorrect(CANONICAL, CANONICAL);
    expect(result.changed).toBe(false);
    expect(result.correctedText).toBe(CANONICAL);
    expect(result.originalAsr).toBe(CANONICAL);
    expect(result.wordsChanged).toBe(0);
    expect(result.errorType).toBe('none');
  });

  test('TC-CORR-002: obvious ASR error is corrected; original preserved verbatim', () => {
    const asr = [
      'विठ्ठल विठ्ठल ग रे सुखाचा सागर', // ग instead of गा
      'पुंडलिका वरदा विठ्ठल सुंदर',
      'ज्ञानदेव तुका म्हणे विठ्ठल अंतर',
      'विठ्ठल विठ्ठल गा रे',
    ].join('\n');

    const result = alignAndCorrect(asr, CANONICAL);

    expect(result.changed).toBe(true);
    expect(result.originalAsr).toBe(asr); // verbatim — never modified
    expect(result.correctedText).toBe(CANONICAL); // confident line corrected
    expect(result.wordsChanged).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.errorType).not.toBe('none');
  });

  test('TC-CORR-003: low-similarity lines stay verbatim (no invented content)', () => {
    const asr = [
      'हे ऐकायला आलो होतो', // unrelated line
      'विठ्ठल विठ्ठल गा रे सुखाचा सागर',
    ].join('\n');

    const result = alignAndCorrect(asr, CANONICAL);
    const firstLine = result.correctedText.split('\n')[0];

    expect(firstLine).toBe('हे ऐकायला आलो होतो'); // never overwritten
    expect(result.linesCorrected).toBeGreaterThan(0); // second line aligned
    expect(result.originalAsr).toBe(asr);
  });

  test('TC-CORR-004: partial recording vs longer canonical → canonical-only lines never injected', () => {
    const asr = [
      'पुंडलिका वरदा विठ्ठल सुंदर',
      'ज्ञानदेव तुका म्हणे विठ्ठल अंतर',
    ].join('\n');

    const result = alignAndCorrect(asr, CANONICAL);
    const correctedLines = result.correctedText.split('\n').filter((l) => l.length > 0);

    // Corrected transcript contains only what was actually sung/recorded.
    expect(correctedLines).toHaveLength(2);
    expect(result.linesTotal).toBe(2);
    expect(result.confidence).toBeGreaterThan(0);
  });

  test('TC-CORR-005: empty transcript is a no-op', () => {
    const result = alignAndCorrect('', CANONICAL);
    expect(result.changed).toBe(false);
    expect(result.correctedText).toBe('');
    expect(result.linesTotal).toBe(0);
  });

  test('TC-CORR-006: diffJson records line-level alignments and stats', () => {
    const result = alignAndCorrect(
      'विठ्ठल विठ्ठल ग रे सुखाचा सागर\nपुंडलिका वरदा विठ्ठल सुंदर',
      'विठ्ठल विठ्ठल गा रे सुखाचा सागर\nपुंडलिका वरदा विठ्ठल सुंदर'
    );
    const aligned = (result.diffJson.alignedLines as any[]).filter((a) => a.asr !== '');
    expect(aligned).toHaveLength(2);
    const stats = result.diffJson.stats as any;
    expect(stats.linesTotal).toBe(2);
    expect(stats.linesCorrected).toBeGreaterThanOrEqual(1);
    expect(stats.wordsChanged).toBeGreaterThan(0);
  });
});

describe('canonical corrector — alignLines', () => {
  test('TC-CORR-007: extra canonical lines become canonical-only alignments (not injected)', () => {
    const alignments = alignLines(
      ['एक ओळ'],
      ['पहिली ओळ', 'दुसरी ओळ', 'तिसरी ओळ']
    );
    expect(alignments.length).toBeGreaterThanOrEqual(3);
    const canonicalOnly = alignments.filter((a) => a.asr === '');
    expect(canonicalOnly.length).toBeGreaterThan(0);
    const asrEntries = alignments.filter((a) => a.asr !== '');
    expect(asrEntries).toHaveLength(1);
  });

  test('TC-CORR-008: empty canonical → every ASR line is a gap, nothing corrected', () => {
    const alignments = alignLines(['एक', 'दोन'], []);
    expect(alignments).toHaveLength(2);
    expect(alignments.every((a) => a.canonical === '' && !a.corrected)).toBe(true);
  });
});

describe('canonical corrector — computeWordDiffs', () => {
  test('TC-CORR-009: changed word reported as original→corrected pair', () => {
    const diffs = computeWordDiffs('विठ्ठल विठ्ठल ग रे', 'विठ्ठल विठ्ठल गा रे');
    expect(diffs.length).toBeGreaterThan(0);
    const pair = diffs.find((d) => d.original === 'ग' && d.corrected === 'गा');
    expect(pair).toBeDefined();
  });

  test('TC-CORR-010: identical lines produce no diffs', () => {
    expect(computeWordDiffs('विठ्ठल विठ्ठल गा रे', 'विठ्ठल विठ्ठल गा रे')).toEqual([]);
  });

  test('TC-CORR-011: extra canonical word appears as added (original "")', () => {
    const diffs = computeWordDiffs('विठ्ठल गा रे', 'विठ्ठल विठ्ठल गा रे');
    const added = diffs.find((d) => d.original === '' && d.corrected === 'विठ्ठल');
    expect(added).toBeDefined();
  });
});

describe('canonical corrector — classifyErrorType', () => {
  test('TC-CORR-012: Latin vs Devanagari is transliteration', () => {
    expect(classifyErrorType('vitthal vitthal', 'विठ्ठल विठ्ठल')).toBe('transliteration');
  });

  test('TC-CORR-013: phonetically close Devanagari is homophone', () => {
    expect(classifyErrorType('विठ्ठल विठ्ठल ग रे', 'विठ्ठल विठ्ठल गा रे')).toBe('homophone');
  });

  test('TC-CORR-014: unrelated words are vocabulary errors', () => {
    expect(classifyErrorType('माझा गाव देवरी', 'विठ्ठल विठ्ठल गा रे')).toBe('vocabulary');
  });

  test('TC-CORR-015: the LINE_CORRECT_THRESHOLD is a single source of truth', () => {
    expect(LINE_CORRECT_THRESHOLD).toBeGreaterThanOrEqual(0.7);
    expect(LINE_CORRECT_THRESHOLD).toBeLessThanOrEqual(0.9);
  });
});

describe('canonical corrector — alignManualEdit', () => {
  const ASR = [
    'विठ्ठल विठ्ठल ग रे सुखाचा सागर',
    'पुंडलिका वरदा विठ्ठल सुंदर',
    'ज्ञानदेव तुका म्हणे विठ्ठल अंतर',
  ].join('\n');

  test('TC-CORR-016: user edit is kept verbatim, original ASR untouched', () => {
    const edited = ASR.replace('ग रे', 'गा रे');
    const result = alignManualEdit(ASR, edited);
    expect(result.originalAsr).toBe(ASR);
    expect(result.correctedText).toBe(edited);
    expect(result.wordsChanged).toBeGreaterThan(0);
    expect(result.changed).toBe(true);
  });

  test('TC-CORR-017: unchanged edit → changed=false, zero diff', () => {
    const result = alignManualEdit(ASR, ASR);
    expect(result.changed).toBe(false);
    expect(result.wordsChanged).toBe(0);
    expect(result.linesCorrected).toBe(0);
  });

  test('TC-CORR-018: diffJson carries aligned lines with word diffs', () => {
    const edited = ASR.replace('ग रे', 'गा रे');
    const result = alignManualEdit(ASR, edited);
    const lines = (result.diffJson as any).alignedLines as Array<{
      asr: string;
      canonical: string;
      wordDiffs: Array<{ original: string; corrected: string }>;
    }>;
    expect(lines.length).toBe(3);
    const changedLine = lines.find((l) => l.wordDiffs.length > 0);
    expect(changedLine).toBeDefined();
    expect(changedLine!.wordDiffs.some((d) => d.original === 'ग' && d.corrected === 'गा')).toBe(true);
  });

  test('TC-CORR-019: appended canonical-only lines are reported, not fabricated', () => {
    const edited = ASR + '\nविठ्ठल विठ्ठल गा रे'; // extra line the user added
    const result = alignManualEdit(ASR, edited);
    const lines = (result.diffJson as any).alignedLines as Array<{ asr: string }>;
    // The added line has no ASR counterpart — alignedLines must include it
    // with asr === '' so the UI can render it honestly as a pure addition.
    expect(lines.some((l) => l.asr === '')).toBe(true);
    expect(result.changed).toBe(true);
  });

  test('TC-CORR-020: empty ASR is handled without crashing', () => {
    const result = alignManualEdit('', 'नवीन ओळ');
    expect(result.originalAsr).toBe('');
    expect(result.correctedText).toBe('नवीन ओळ');
    expect(result.linesTotal).toBe(0);
  });
});
