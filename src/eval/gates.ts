/**
 * Digital Pandharpur — Evaluation gates, aggregation and A/B comparison.
 *
 * Pure decision logic for the ModelVersion lifecycle. A model only passes a
 * gate when its aggregate WER and CER on a frozen golden dataset are both at
 * or below the configured thresholds. Nothing here deploys anything — the
 * caller (admin API / lifecycle code) is the only thing allowed to act on a
 * passed gate, and it must be an explicit human action.
 */

import { computeMetrics, type TranscriptMetrics } from '@/src/eval/wer';

export interface GateThresholds {
  wer: number;
  cer: number;
}

/** Default quality bar for ASR gating — tight enough to matter, sane for singing. */
export const DEFAULT_GATE_THRESHOLDS: GateThresholds = {
  wer: 0.3, // ≤30% word error rate
  cer: 0.15, // ≤15% character error rate
};

export interface GateResult {
  passed: boolean;
  thresholds: GateThresholds;
  reasons: string[];
  samplesEvaluated: number;
}

/**
 * Aggregate per-sample metrics into one dataset-level result.
 * Uses mean WER/CER over evaluated samples (empty reference samples are
 * skipped and counted separately).
 */
export function aggregateMetrics(
  samples: TranscriptMetrics[]
): { wer: number; cer: number; samplesEvaluated: number; samplesSkipped: number } {
  const evaluated = samples.filter((s) => s.evaluated);
  const skipped = samples.length - evaluated.length;
  if (evaluated.length === 0) {
    return { wer: 0, cer: 0, samplesEvaluated: 0, samplesSkipped: skipped };
  }
  const werSum = evaluated.reduce((sum, s) => sum + s.wer, 0);
  const cerSum = evaluated.reduce((sum, s) => sum + s.cer, 0);
  return {
    wer: werSum / evaluated.length,
    cer: cerSum / evaluated.length,
    samplesEvaluated: evaluated.length,
    samplesSkipped: skipped,
  };
}

/**
 * Decide whether an aggregate result passes the gate. Honest by construction:
 * an evaluation with zero scored samples can never pass, and non-finite
 * metrics fail.
 */
export function evaluateGate(
  aggregate: { wer: number; cer: number; samplesEvaluated: number },
  thresholds: GateThresholds = DEFAULT_GATE_THRESHOLDS
): GateResult {
  if (aggregate.samplesEvaluated === 0) {
    return {
      passed: false,
      thresholds,
      reasons: ['No scored samples — evaluation is inconclusive, not a pass.'],
      samplesEvaluated: 0,
    };
  }

  if (!Number.isFinite(aggregate.wer) || !Number.isFinite(aggregate.cer)) {
    return {
      passed: false,
      thresholds,
      reasons: ['Non-finite metrics — cannot gate on this run.'],
      samplesEvaluated: aggregate.samplesEvaluated,
    };
  }

  // A run passes only when there are NO threshold violations. A single
  // violation is a failure, not a pass.
  const violations: string[] = [];
  if (aggregate.wer > thresholds.wer) {
    violations.push(`WER ${(aggregate.wer * 100).toFixed(1)}% exceeds gate ${(thresholds.wer * 100).toFixed(0)}%.`);
  }
  if (aggregate.cer > thresholds.cer) {
    violations.push(`CER ${(aggregate.cer * 100).toFixed(1)}% exceeds gate ${(thresholds.cer * 100).toFixed(0)}%.`);
  }

  const reasons =
    violations.length === 0
      ? ['WER and CER within gate thresholds.']
      : violations;

  return {
    passed: violations.length === 0,
    thresholds,
    reasons,
    samplesEvaluated: aggregate.samplesEvaluated,
  };
}

export interface AbComparison {
  candidateWer: number;
  baselineWer: number;
  candidateCer: number;
  baselineCer: number;
  werDelta: number; // candidate - baseline (negative = better)
  cerDelta: number;
  improved: boolean;
  /** Honest label: an improvement on WER alone is still gated on CER. */
  verdict: 'improved' | 'regressed' | 'unchanged' | 'no-baseline';
}

/**
 * A/B compare a candidate run against a baseline (the active model's run on
 * the same dataset). Pure — used for the admin A/B view.
 */
export function compareRuns(
  candidate: { wer: number; cer: number },
  baseline: { wer: number; cer: number } | null
): AbComparison {
  if (!baseline) {
    return {
      candidateWer: candidate.wer,
      baselineWer: NaN,
      candidateCer: candidate.cer,
      baselineCer: NaN,
      werDelta: NaN,
      cerDelta: NaN,
      improved: false,
      verdict: 'no-baseline',
    };
  }

  const werDelta = candidate.wer - baseline.wer;
  const cerDelta = candidate.cer - baseline.cer;
  const werImproved = werDelta < -1e-9;
  const cerImproved = cerDelta < -1e-9;
  const werRegressed = werDelta > 1e-9;
  const cerRegressed = cerDelta > 1e-9;

  let verdict: AbComparison['verdict'] = 'unchanged';
  if (werImproved && !werRegressed && cerImproved && !cerRegressed) verdict = 'improved';
  else if (werRegressed && !werImproved && cerRegressed && !cerImproved) verdict = 'regressed';
  else if ((werImproved && cerRegressed) || (werRegressed && cerImproved)) verdict = 'improved'; // mixed — judge WER as primary signal

  return {
    candidateWer: candidate.wer,
    baselineWer: baseline.wer,
    candidateCer: candidate.cer,
    baselineCer: baseline.cer,
    werDelta,
    cerDelta,
    improved: werDelta <= 0 && cerDelta <= 0,
    verdict,
  };
}

/** Convenience: full metrics for one sample (used by runner + tests). */
export function scoreSample(reference: string, hypothesis: string): TranscriptMetrics {
  return computeMetrics(reference, hypothesis);
}
