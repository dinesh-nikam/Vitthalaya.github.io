/**
 * Digital Pandharpur — Admin Model Evaluation API
 *
 * POST /api/admin/models/evaluate
 *   { modelVersionId, mode: 'regression' | 'golden', datasetId?, hypotheses?, notes? }
 *
 * Runs the offline evaluation harness for a model, persists an EvaluationRun,
 * applies WER/CER gates and A/B comparison, and returns the summary. This
 * route never changes a model's status — activation is a separate explicit
 * admin action that requires a passing run.
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/require-admin';
import { runEvaluation } from '@/src/eval/runner';

export const dynamic = 'force-dynamic';

interface EvaluateBody {
  modelVersionId?: string;
  mode?: string;
  datasetId?: string | null;
  hypotheses?: Record<string, string>;
  notes?: string | null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  let body: EvaluateBody;
  try {
    body = (await request.json()) as EvaluateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body.modelVersionId) {
    return NextResponse.json({ error: 'modelVersionId is required.' }, { status: 400 });
  }
  if (body.mode !== 'regression' && body.mode !== 'golden') {
    return NextResponse.json({ error: 'mode must be "regression" or "golden".' }, { status: 400 });
  }
  if (body.mode === 'golden' && !body.datasetId) {
    return NextResponse.json({ error: 'datasetId is required in golden mode.' }, { status: 400 });
  }

  try {
    const summary = await runEvaluation({
      modelVersionId: body.modelVersionId,
      actorId: auth.session.userId,
      mode: body.mode,
      datasetId: body.datasetId ?? null,
      hypotheses: body.hypotheses,
      notes: body.notes ?? null,
    });

    return NextResponse.json({
      success: true,
      ...summary,
      deployed: false, // explicit: evaluation never deploys
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not found')) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    console.error('[Admin Models Evaluate] error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
