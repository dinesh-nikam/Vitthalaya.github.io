/**
 * Digital Pandharpur — Admin Model Registry API
 *
 * GET /api/admin/models
 *
 * Returns the ModelVersion registry with latest eval runs, the frozen golden
 * datasets, recent evaluation runs, and the active gate thresholds.
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/require-admin';
import { getRegistry, getActiveModel } from '@/src/eval/registry';
import { listDatasets } from '@/src/eval/datasets';
import { DEFAULT_GATE_THRESHOLDS } from '@/src/eval/gates';
import { db } from '@/src/db/client';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const [registry, datasets, recentRuns, activeAsr] = await Promise.all([
      getRegistry(),
      listDatasets(),
      db.evaluationRun.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          status: true,
          aggregateMetricsJson: true,
          gatingResultJson: true,
          comparedAggregateJson: true,
          notes: true,
          createdAt: true,
          createdBy: true,
          modelVersion: { select: { modelName: true, version: true, modelType: true } },
          dataset: { select: { name: true } },
        },
      }),
      getActiveModel('asr'),
    ]);

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      gateThresholds: DEFAULT_GATE_THRESHOLDS,
      activeAsr: activeAsr
        ? { id: activeAsr.id, modelName: activeAsr.modelName, version: activeAsr.version }
        : null,
      models: registry,
      datasets: datasets.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        datasetType: d.datasetType,
        version: d.version,
        status: d.status,
        sampleCount: d.sampleCount,
        createdAt: d.createdAt,
        samples: d.samples.map((s) => ({
          id: s.id,
          sampleLabel: s.sampleLabel,
          referenceText: s.referenceText,
        })),
      })),
      recentRuns: recentRuns.map((r) => {
        let aggregate: { wer: number | null; cer: number | null; samplesEvaluated: number } = {
          wer: null,
          cer: null,
          samplesEvaluated: 0,
        };
        try {
          const parsed = JSON.parse(r.aggregateMetricsJson) as Partial<typeof aggregate>;
          aggregate = {
            wer: typeof parsed.wer === 'number' ? parsed.wer : null,
            cer: typeof parsed.cer === 'number' ? parsed.cer : null,
            samplesEvaluated: typeof parsed.samplesEvaluated === 'number' ? parsed.samplesEvaluated : 0,
          };
        } catch {
          // best-effort
        }
        let baseline: { wer: number | null; cer: number | null } | null = null;
        if (r.comparedAggregateJson) {
          try {
            const parsed = JSON.parse(r.comparedAggregateJson) as { wer?: number; cer?: number };
            baseline = {
              wer: typeof parsed.wer === 'number' ? parsed.wer : null,
              cer: typeof parsed.cer === 'number' ? parsed.cer : null,
            };
          } catch {
            // best-effort
          }
        }
        return {
          id: r.id,
          status: r.status,
          wer: aggregate.wer,
          cer: aggregate.cer,
          samplesEvaluated: aggregate.samplesEvaluated,
          baseline,
          modelName: r.modelVersion.modelName,
          version: r.modelVersion.version,
          modelType: r.modelVersion.modelType,
          datasetName: r.dataset?.name ?? null,
          notes: r.notes,
          createdAt: r.createdAt,
          createdBy: r.createdBy,
        };
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Admin Models API] error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
