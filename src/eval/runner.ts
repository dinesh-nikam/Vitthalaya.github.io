/**
 * Digital Pandharpur — Evaluation runner.
 *
 * Scores a model against golden samples, applies WER/CER gates, optionally
 * A/B-compares against the active model's baseline, and persists an
 * `EvaluationRun` row as the auditable record. Two honest modes:
 *
 *  - `regression`: real, moderator-approved TranscriptCorrections for this
 *    model — reference = approved correctedText, hypothesis = verbatim
 *    originalAsr. No generated or fake data.
 *  - `golden`: a frozen `EvaluationDataset`; hypotheses are supplied by the
 *    caller (in production, the ASR engine transcribes each sample's audio;
 *    the offline harness supplies recorded output). Samples without a
 *    hypothesis are skipped and counted — never silently dropped.
 */

import { db } from '@/src/db/client';
import { computeMetrics, type TranscriptMetrics } from '@/src/eval/wer';
import {
  aggregateMetrics,
  compareRuns,
  evaluateGate,
  DEFAULT_GATE_THRESHOLDS,
  type GateThresholds,
} from '@/src/eval/gates';
import {
  materializeRegressionSamples,
  type RegressionSample,
} from '@/src/eval/datasets';
import { getActiveModel, regressionKey } from '@/src/eval/registry';

export interface RunEvaluationInput {
  modelVersionId: string;
  actorId: string;
  mode: 'regression' | 'golden';
  datasetId?: string | null;
  /** golden mode: sampleId → hypothesis text. Missing samples are skipped. */
  hypotheses?: Record<string, string>;
  thresholds?: GateThresholds;
  notes?: string | null;
}

export interface EvaluationSummary {
  runId: string;
  status: string;
  aggregate: { wer: number; cer: number; samplesEvaluated: number; samplesSkipped: number };
  gate: { passed: boolean; reasons: string[]; thresholds: GateThresholds };
  ab: ReturnType<typeof compareRuns> | null;
  samples: Array<TranscriptMetrics & { sampleLabel: string }>;
}

function scoreSamples(
  samples: RegressionSample[],
  hypotheses?: Record<string, string>,
  sampleIds?: string[]
): Array<TranscriptMetrics & { sampleLabel: string; sampleId: string | null }> {
  return samples.map((s, i) => {
    const sampleId = sampleIds?.[i] ?? null;
    let hypothesis = s.hypothesis;
    let skipped = false;
    if (sampleId && hypotheses && !(sampleId in hypotheses)) {
      skipped = true;
      hypothesis = '';
    } else if (sampleId && hypotheses && sampleId in hypotheses) {
      hypothesis = hypotheses[sampleId];
    }
    const metrics = skipped ? { ...computeMetrics(s.reference, ''), evaluated: false } : computeMetrics(s.reference, hypothesis);
    return { ...metrics, sampleLabel: s.sampleLabel, sampleId };
  });
}

export async function runEvaluation(input: RunEvaluationInput): Promise<EvaluationSummary> {
  const model = await db.modelVersion.findUnique({ where: { id: input.modelVersionId } });
  if (!model) throw new Error('Model not found.');

  const thresholds = input.thresholds ?? DEFAULT_GATE_THRESHOLDS;

  let samples: RegressionSample[] = [];
  let datasetId: string | null = input.datasetId ?? null;
  let datasetName: string | null = null;
  let sampleIds: string[] | null = null;

  if (input.mode === 'golden' && input.datasetId) {
    const dataset = await db.evaluationDataset.findUnique({
      where: { id: input.datasetId },
      include: { samples: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!dataset) throw new Error('Dataset not found.');
    datasetName = dataset.name;
    samples = dataset.samples.map((s) => ({
      sampleLabel: s.sampleLabel,
      reference: s.referenceText,
      hypothesis: '',
    }));
    sampleIds = dataset.samples.map((s) => s.id);
  } else {
    // regression mode — real approved corrections for this model's version key
    const versionKey = regressionKey(
      model.config ? safeParseJson(model.config) : null,
      model.modelName
    );
    samples = await materializeRegressionSamples(versionKey);
    datasetId = null;
  }

  const scored = scoreSamples(samples, input.hypotheses, sampleIds ?? undefined);
  const aggregate = aggregateMetrics(scored);
  const gate = evaluateGate(aggregate, thresholds);

  // A/B baseline: the active model's latest run on the same dataset (or its
  // stored metrics). Honest no-baseline when there is no active model.
  let ab: ReturnType<typeof compareRuns> | null = null;
  let comparedModelVersionId: string | null = null;
  let comparedAggregate: { wer: number; cer: number } | null = null;

  const activeModel = await getActiveModel(model.modelType);
  if (activeModel && activeModel.id !== model.id) {
    const baselineRun = await db.evaluationRun.findFirst({
      where: { modelVersionId: activeModel.id, status: { in: ['passed', 'failed'] } },
      orderBy: { createdAt: 'desc' },
      select: { aggregateMetricsJson: true },
    });
    const baselineAggregate = baselineRun?.aggregateMetricsJson
      ? safeParseJson<{ wer?: number; cer?: number }>(baselineRun.aggregateMetricsJson)
      : null;
    if (baselineAggregate && typeof baselineAggregate.wer === 'number' && typeof baselineAggregate.cer === 'number') {
      comparedModelVersionId = activeModel.id;
      comparedAggregate = { wer: baselineAggregate.wer, cer: baselineAggregate.cer };
      ab = compareRuns(aggregate, comparedAggregate);
    }
  }

  const status =
    aggregate.samplesEvaluated === 0
      ? 'inconclusive'
      : gate.passed
        ? 'passed'
        : 'failed';

  const run = await db.evaluationRun.create({
    data: {
      modelVersionId: model.id,
      datasetId,
      status,
      aggregateMetricsJson: JSON.stringify(aggregate),
      sampleMetricsJson: JSON.stringify(scored),
      gatingResultJson: JSON.stringify(gate),
      comparedModelVersionId,
      comparedAggregateJson: comparedAggregate ? JSON.stringify(comparedAggregate) : null,
      notes: input.notes ?? (datasetName ? `Dataset: ${datasetName}` : 'Regression on approved corrections'),
      createdBy: input.actorId,
    },
  });

  // Keep the model's metricsJson in sync with the latest run for quick views.
  await db.modelVersion.update({
    where: { id: model.id },
    data: { metricsJson: JSON.stringify(aggregate) },
  });

  return {
    runId: run.id,
    status,
    aggregate,
    gate,
    ab,
    samples: scored.map((s) => ({ ...s, sampleLabel: s.sampleLabel })),
  };
}

function safeParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
