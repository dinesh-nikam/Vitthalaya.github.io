/**
 * Digital Pandharpur — Admin Model Lifecycle API
 *
 * POST /api/admin/models/lifecycle
 *   { action: 'register' | 'activate' | 'rollback' | 'retire' | 'seed', ... }
 *
 * Every status change here is an explicit admin action. Activation is refused
 * by `activateModel` unless the model's latest evaluation run passed its
 * WER/CER gates — a new ASR model is never auto-deployed.
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/require-admin';
import {
  registerModel,
  activateModel,
  rollbackModel,
  retireModel,
} from '@/src/eval/registry';
import {
  seedGoldenDatasetsFromCatalog,
  seedRegressionDatasetFromApprovedCorrections,
} from '@/src/eval/datasets';

export const dynamic = 'force-dynamic';

interface LifecycleBody {
  action?: string;
  modelVersionId?: string;
  modelName?: string;
  modelType?: string;
  version?: string;
  provider?: string;
  config?: Record<string, unknown>;
  notes?: string | null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  let body: LifecycleBody;
  try {
    body = (await request.json()) as LifecycleBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  try {
    switch (body.action) {
      case 'register': {
        if (!body.modelName || !body.modelType || !body.version || !body.provider) {
          return NextResponse.json(
            { error: 'modelName, modelType, version and provider are required.' },
            { status: 400 }
          );
        }
        const model = await registerModel({
          modelName: body.modelName,
          modelType: body.modelType,
          version: body.version,
          provider: body.provider,
          config: body.config ?? null,
          notes: body.notes ?? `Registered by ${auth.session.name || auth.session.email}.`,
        });
        return NextResponse.json({ success: true, model });
      }

      case 'activate': {
        if (!body.modelVersionId) {
          return NextResponse.json({ error: 'modelVersionId is required.' }, { status: 400 });
        }
        const model = await activateModel(body.modelVersionId, auth.session.userId);
        return NextResponse.json({ success: true, model, deployed: true });
      }

      case 'rollback': {
        if (!body.modelVersionId) {
          return NextResponse.json({ error: 'modelVersionId is required.' }, { status: 400 });
        }
        const result = await rollbackModel(body.modelVersionId, auth.session.userId);
        return NextResponse.json({ success: true, ...result });
      }

      case 'retire': {
        if (!body.modelVersionId) {
          return NextResponse.json({ error: 'modelVersionId is required.' }, { status: 400 });
        }
        const model = await retireModel(body.modelVersionId);
        return NextResponse.json({ success: true, model });
      }

      case 'seed': {
        const golden = await seedGoldenDatasetsFromCatalog();
        const regression = await seedRegressionDatasetFromApprovedCorrections();
        return NextResponse.json({ success: true, golden, regression });
      }

      default:
        return NextResponse.json(
          { error: 'action must be register | activate | rollback | retire | seed.' },
          { status: 400 }
        );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not found') || msg.includes('refused') || msg.includes('Cannot')) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error('[Admin Models Lifecycle] error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
