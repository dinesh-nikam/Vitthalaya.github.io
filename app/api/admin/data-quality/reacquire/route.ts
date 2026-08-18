/**
 * Digital Pandharpur — Admin Data Quality: Re-acquire Action
 *
 * POST /api/admin/data-quality/reacquire
 *   { compositionId }
 *
 * Marks a weak composition for re-acquisition: it is unpublished
 * (reviewed=false, so it leaves the public catalog), and the decision is
 * audited. The row is kept in the database so a future import / acquisition
 * run can match it (by title + type) and replace it with properly sourced
 * lyrics. Nothing is deleted here.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { requireAdmin } from '@/src/lib/require-admin';
import { recordAuditLog } from '@/src/lib/audit';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  let body: { compositionId?: string };
  try {
    body = (await request.json()) as { compositionId?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!body.compositionId) {
    return NextResponse.json({ error: 'compositionId is required.' }, { status: 400 });
  }

  try {
    const composition = await db.composition.findUnique({
      where: { id: body.compositionId },
      select: { id: true, titleMarathi: true, type: true, reviewed: true },
    });
    if (!composition) {
      return NextResponse.json({ error: 'Composition not found.' }, { status: 404 });
    }
    if (!composition.reviewed) {
      return NextResponse.json({ success: true, alreadyUnpublished: true, composition });
    }

    const updated = await db.composition.update({
      where: { id: composition.id },
      data: { reviewed: false },
      select: { id: true, titleMarathi: true, reviewed: true },
    });

    await recordAuditLog({
      actorId: auth.session.userId,
      action: 'UNPUBLISH',
      entityType: 'Composition',
      entityId: composition.id,
      metadata: {
        title: composition.titleMarathi,
        type: composition.type,
        reason: 'Re-acquire: lyrics too weak (fragment/noisy) — flagged for re-acquisition from a proper source.',
      },
    });

    return NextResponse.json({ success: true, composition: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Admin Data Quality Reacquire] error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
