import { describe, expect, test } from 'bun:test';

import {
  computeMetrics,
  editDistance,
  decomposeEdits,
  wordsOf,
} from '@/src/eval/wer';
import {
  aggregateMetrics,
  compareRuns,
  evaluateGate,
  DEFAULT_GATE_THRESHOLDS,
} from '@/src/eval/gates';

describe('TC-EVAL-001 WER/CER core math', () => {
  test('identical transcripts score 0 WER and 0 CER', () => {
    const m = computeMetrics('अ ब क', 'अ ब क');
    expect(m.wer).toBe(0);
    expect(m.cer).toBe(0);
    expect(m.evaluated).toBe(true);
    expect(m.refWords).toBe(3);
  });

  test('completely disjoint transcripts score 1 WER', () => {
    const m = computeMetrics('अ ब क', 'ड ए फ');
    expect(m.wer).toBeCloseTo(1, 5);
    expect(m.substitutions).toBe(3);
  });

  test('one deletion is counted exactly', () => {
    const m = computeMetrics('अ ब क', 'अ क');
    expect(m.wer).toBeCloseTo(1 / 3, 5);
    expect(m.deletions).toBe(1);
    expect(m.insertions).toBe(0);
    expect(m.substitutions).toBe(0);
  });

  test('one insertion is counted exactly', () => {
    const m = computeMetrics('अ ब क', 'अ ब क ड');
    expect(m.wer).toBeCloseTo(1 / 3, 5);
    expect(m.insertions).toBe(1);
    expect(m.deletions).toBe(0);
  });

  test('one substitution is counted exactly', () => {
    const m = computeMetrics('अ ब क', 'अ ब ड');
    expect(m.wer).toBeCloseTo(1 / 3, 5);
    expect(m.substitutions).toBe(1);
  });

  test('hypothesis missing a word is a full deletion', () => {
    const m = computeMetrics('अ', '');
    expect(m.wer).toBe(1);
    expect(m.deletions).toBe(1);
    expect(m.evaluated).toBe(true);
  });

  test('empty reference is unscorable, never a fake pass', () => {
    const m = computeMetrics('', 'अ ब');
    expect(m.evaluated).toBe(false);
    expect(m.wer).toBe(0);
    expect(m.hypWords).toBe(2);
  });
});

describe('TC-EVAL-002 Marathi normalization fairness', () => {
  test('॥ vs || and punctuation do not inflate WER', () => {
    const ref = '॥ श्री विठ्ठल ॥\nपंढरपूर नगरी';
    const hyp = '|| श्री विठ्ठल || पंढरपूर नगरी';
    const m = computeMetrics(ref, hyp);
    expect(m.wer).toBe(0);
    expect(m.cer).toBe(0);
  });

  test('wordsOf uses comparison normalization', () => {
    expect(wordsOf('॥ अ ब ॥')).toEqual(['अ', 'ब']);
  });

  test('chandrabindu and anusvara normalize to the same token', () => {
    const ref = 'कंस';
    const hyp = 'कँस';
    const m = computeMetrics(ref, hyp);
    expect(m.wer).toBe(0);
  });
});

describe('TC-EVAL-003 aggregation and gating', () => {
  test('aggregate is the mean over evaluated samples only', () => {
    const agg = aggregateMetrics([
      { ...computeMetrics('अ ब', 'अ ब'), evaluated: true },
      { ...computeMetrics('क ड', 'क ग'), evaluated: true },
      { ...computeMetrics('', 'काहीही'), evaluated: false },
    ]);
    expect(agg.samplesEvaluated).toBe(2);
    expect(agg.samplesSkipped).toBe(1);
    expect(agg.wer).toBeCloseTo(0.25, 5); // (0 + 0.5) / 2
  });

  test('passes when both WER and CER are within thresholds', () => {
    const gate = evaluateGate({ wer: 0.2, cer: 0.1, samplesEvaluated: 10 }, DEFAULT_GATE_THRESHOLDS);
    expect(gate.passed).toBe(true);
    expect(gate.reasons.some((r) => r.includes('within gate'))).toBe(true);
  });

  test('fails when WER exceeds the gate', () => {
    const gate = evaluateGate({ wer: 0.45, cer: 0.1, samplesEvaluated: 10 }, DEFAULT_GATE_THRESHOLDS);
    expect(gate.passed).toBe(false);
    expect(gate.reasons.some((r) => r.includes('WER'))).toBe(true);
  });

  test('fails when CER exceeds the gate', () => {
    const gate = evaluateGate({ wer: 0.1, cer: 0.4, samplesEvaluated: 10 }, DEFAULT_GATE_THRESHOLDS);
    expect(gate.passed).toBe(false);
    expect(gate.reasons.some((r) => r.includes('CER'))).toBe(true);
  });

  test('zero scored samples can never pass — inconclusive, not a pass', () => {
    const gate = evaluateGate({ wer: 0, cer: 0, samplesEvaluated: 0 }, DEFAULT_GATE_THRESHOLDS);
    expect(gate.passed).toBe(false);
    expect(gate.reasons[0]).toContain('inconclusive');
  });

  test('non-finite metrics fail the gate', () => {
    const gate = evaluateGate({ wer: NaN, cer: 0.1, samplesEvaluated: 5 }, DEFAULT_GATE_THRESHOLDS);
    expect(gate.passed).toBe(false);
    expect(gate.reasons.some((r) => r.includes('Non-finite'))).toBe(true);
  });
});

describe('TC-EVAL-004 A/B comparison', () => {
  test('candidate better than baseline on both metrics', () => {
    const ab = compareRuns({ wer: 0.2, cer: 0.1 }, { wer: 0.3, cer: 0.15 });
    expect(ab.improved).toBe(true);
    expect(ab.verdict).toBe('improved');
    expect(ab.werDelta).toBeCloseTo(-0.1, 5);
  });

  test('candidate worse than baseline', () => {
    const ab = compareRuns({ wer: 0.45, cer: 0.2 }, { wer: 0.3, cer: 0.15 });
    expect(ab.improved).toBe(false);
    expect(ab.verdict).toBe('regressed');
  });

  test('no baseline is reported honestly', () => {
    const ab = compareRuns({ wer: 0.2, cer: 0.1 }, null);
    expect(ab.verdict).toBe('no-baseline');
    expect(ab.improved).toBe(false);
    expect(Number.isNaN(ab.baselineWer)).toBe(true);
  });

  test('unchanged metrics are unchanged', () => {
    const ab = compareRuns({ wer: 0.3, cer: 0.15 }, { wer: 0.3, cer: 0.15 });
    expect(ab.verdict).toBe('unchanged');
  });
});

describe('TC-EVAL-005 edit distance primitives', () => {
  test('editDistance handles empty sequences', () => {
    expect(editDistance([], [])).toBe(0);
    expect(editDistance(['a'], [])).toBe(1);
    expect(editDistance([], ['a', 'b'])).toBe(2);
  });

  test('decomposeEdits backtrace matches the distance', () => {
    const ref = ['अ', 'ब', 'क', 'ड'];
    const hyp = ['अ', 'क', 'ड', 'ए'];
    const dist = editDistance(ref, hyp);
    const counts = decomposeEdits(ref, hyp);
    expect(counts.substitutions + counts.insertions + counts.deletions).toBe(dist);
  });
});
