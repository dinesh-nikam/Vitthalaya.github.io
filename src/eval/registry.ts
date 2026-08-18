/**
 * Digital Pandharpur — ModelVersion lifecycle (registry + governance).
 *
 * The core invariant of T3: **a new ASR model is never auto-deployed.**
 * Activation is always an explicit admin action, and it is refused unless the
 * model's latest evaluation run on a golden dataset passed its WER/CER gates.
 *
 * Statuses: candidate → (eval passed, admin acts) → active
 *           active → (admin acts) → retired | rolled_back
 *           rolled_back → (re-evaluated) → candidate → active
 */

import { db } from '@/src/db/client';

export type ModelStatus = 'candidate' | 'active' | 'retired' | 'rolled_back';

export interface RegisterModelInput {
  modelName: string;
  modelType: string; // asr | enhancement | classification | identification
  version: string;
  provider: string;
  config?: Record<string, unknown> | null;
  notes?: string | null;
  /** Baseline bootstrapping only (seed script): establishes the currently
   *  deployed model as active without an eval run. Never used by the API. */
  forceActive?: boolean;
}

export interface ModelView {
  id: string;
  modelName: string;
  modelType: string;
  version: string;
  provider: string;
  status: ModelStatus;
  config: Record<string, unknown> | null;
  metricsJson: string | null;
  notes: string | null;
  createdAt: Date;
  /** The string recorded in TranscriptCorrection.modelVersion for this model. */
  versionKey: string;
  latestRun: {
    id: string;
    status: string;
    wer: number | null;
    cer: number | null;
    samplesEvaluated: number;
    datasetName: string | null;
    createdAt: Date;
  } | null;
}

/** The key used to match this model's output in TranscriptCorrection rows. */
export function regressionKey(config: Record<string, unknown> | null | undefined, modelName: string): string {
  if (config && typeof config.asrKey === 'string' && config.asrKey.length > 0) {
    return config.asrKey;
  }
  return modelName.toLowerCase();
}

export async function registerModel(input: RegisterModelInput): Promise<ModelView> {
  const created = await db.modelVersion.create({
    data: {
      modelName: input.modelName,
      modelType: input.modelType,
      version: input.version,
      provider: input.provider,
      config: input.config ? JSON.stringify(input.config) : null,
      notes: input.notes ?? null,
      status: input.forceActive ? 'active' : 'candidate',
    },
  });

  if (input.forceActive) {
    // Establishing the known production baseline: any other active model of
    // the same type is retired first so there is exactly one active.
    await db.modelVersion.updateMany({
      where: { modelType: input.modelType, status: 'active', id: { not: created.id } },
      data: { status: 'retired' },
    });
  }

  return toView(created, null);
}

/** Latest evaluation run for a model, if any. */
export async function getLatestRun(modelVersionId: string) {
  return db.evaluationRun.findFirst({
    where: { modelVersionId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      aggregateMetricsJson: true,
      dataset: { select: { name: true } },
      createdAt: true,
    },
  });
}

async function toView(
  model: {
    id: string;
    modelName: string;
    modelType: string;
    version: string;
    provider: string;
    status: string;
    config: string | null;
    metricsJson: string | null;
    notes: string | null;
    createdAt: Date;
  },
  latestRun: Awaited<ReturnType<typeof getLatestRun>>
): Promise<ModelView> {
  let config: Record<string, unknown> | null = null;
  if (model.config) {
    try {
      config = JSON.parse(model.config) as Record<string, unknown>;
    } catch {
      config = null;
    }
  }

  let metrics: { wer: number | null; cer: number | null; samplesEvaluated: number } = {
    wer: null,
    cer: null,
    samplesEvaluated: 0,
  };
  if (model.metricsJson) {
    try {
      const parsed = JSON.parse(model.metricsJson) as Partial<typeof metrics>;
      metrics = {
        wer: typeof parsed.wer === 'number' ? parsed.wer : null,
        cer: typeof parsed.cer === 'number' ? parsed.cer : null,
        samplesEvaluated: typeof parsed.samplesEvaluated === 'number' ? parsed.samplesEvaluated : 0,
      };
    } catch {
      // best-effort
    }
  }

  let latestRunView: ModelView['latestRun'] = null;
  if (latestRun) {
    let runMetrics = metrics;
    if (latestRun.aggregateMetricsJson) {
      try {
        const parsed = JSON.parse(latestRun.aggregateMetricsJson) as Partial<typeof metrics>;
        runMetrics = {
          wer: typeof parsed.wer === 'number' ? parsed.wer : null,
          cer: typeof parsed.cer === 'number' ? parsed.cer : null,
          samplesEvaluated: typeof parsed.samplesEvaluated === 'number' ? parsed.samplesEvaluated : 0,
        };
      } catch {
        // best-effort
      }
    }
    latestRunView = {
      id: latestRun.id,
      status: latestRun.status,
      wer: runMetrics.wer,
      cer: runMetrics.cer,
      samplesEvaluated: runMetrics.samplesEvaluated,
      datasetName: latestRun.dataset?.name ?? null,
      createdAt: latestRun.createdAt,
    };
  }

  return {
    id: model.id,
    modelName: model.modelName,
    modelType: model.modelType,
    version: model.version,
    provider: model.provider,
    status: model.status as ModelStatus,
    config,
    metricsJson: model.metricsJson,
    notes: model.notes,
    createdAt: model.createdAt,
    versionKey: regressionKey(config, model.modelName),
    latestRun: latestRunView,
  };
}

/** Registry snapshot: all models (newest first) with their latest eval run. */
export async function getRegistry(modelType?: string): Promise<ModelView[]> {
  const models = await db.modelVersion.findMany({
    where: modelType ? { modelType } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return Promise.all(models.map(async (m) => toView(m, await getLatestRun(m.id))));
}

/** The single active model of a type (null when none). */
export async function getActiveModel(modelType: string) {
  return db.modelVersion.findFirst({ where: { modelType, status: 'active' } });
}

/**
 * Explicitly activate a model. Refuses unless:
 *   - the model is not already active,
 *   - its latest evaluation run exists and passed the gate.
 * The previous active model of the same type is demoted to `retired`.
 */
export async function activateModel(modelVersionId: string, actorId: string): Promise<ModelView> {
  const model = await db.modelVersion.findUnique({ where: { id: modelVersionId } });
  if (!model) throw new Error('Model not found.');
  if (model.status === 'active') throw new Error('Model is already active.');

  const latestRun = await db.evaluationRun.findFirst({
    where: { modelVersionId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true },
  });

  if (!latestRun || latestRun.status !== 'passed') {
    throw new Error(
      'Activation refused: the model has no passing evaluation run. ' +
        'Run an evaluation on a frozen golden dataset first — models are never auto-deployed.'
    );
  }

  const updated = await db.$transaction(async (tx) => {
    await tx.modelVersion.updateMany({
      where: { modelType: model.modelType, status: 'active', id: { not: model.id } },
      data: { status: 'retired' },
    });
    return tx.modelVersion.update({
      where: { id: model.id },
      data: { status: 'active', notes: model.notes ?? `Activated by ${actorId} after passing eval gate.` },
    });
  });

  return toView(updated, await getLatestRun(updated.id));
}

/**
 * Rollback: demote the current active model to `rolled_back` and restore the
 * most recent previously-active model of the same type as `active`.
 */
export async function rollbackModel(modelVersionId: string, actorId: string): Promise<{ rolledBack: ModelView; restored: ModelView | null }> {
  const model = await db.modelVersion.findUnique({ where: { id: modelVersionId } });
  if (!model) throw new Error('Model not found.');
  if (model.status !== 'active') {
    throw new Error('Rollback refused: only the active model can be rolled back.');
  }

  const previousActive = await db.modelVersion.findFirst({
    where: { modelType: model.modelType, status: { in: ['retired', 'rolled_back'] } },
    orderBy: { updatedAt: 'desc' },
  });

  const updated = await db.$transaction(async (tx) => {
    await tx.modelVersion.update({
      where: { id: model.id },
      data: { status: 'rolled_back', notes: `Rolled back by ${actorId}.` },
    });
    if (previousActive) {
      await tx.modelVersion.update({
        where: { id: previousActive.id },
        data: { status: 'active', notes: `Restored by ${actorId} (rollback).` },
      });
    }
    return tx.modelVersion.findUnique({ where: { id: model.id } });
  });

  const rolledBack = await toView(updated!, await getLatestRun(model.id));
  const restored = previousActive
    ? await toView(previousActive, await getLatestRun(previousActive.id))
    : null;

  return { rolledBack, restored };
}

/** Retire a non-active model. */
export async function retireModel(modelVersionId: string): Promise<ModelView> {
  const model = await db.modelVersion.findUnique({ where: { id: modelVersionId } });
  if (!model) throw new Error('Model not found.');
  if (model.status === 'active') {
    throw new Error('Cannot retire the active model — roll back first.');
  }
  const updated = await db.modelVersion.update({
    where: { id: model.id },
    data: { status: 'retired' },
  });
  return toView(updated, await getLatestRun(updated.id));
}
