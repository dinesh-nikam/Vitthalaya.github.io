/**
 * Digital Pandharpur — Admin Transcript Correction Verification
 *
 * POST /api/admin/audio/corrections/[id]/verify
 *
 * Approve/reject a pending TranscriptCorrection. Uses the shared
 * verifyTranscriptCorrection gate (canonical-corrector) so the moderator's
 * decision is recorded with verifier id + notes, and only approved
 * corrections become eligible for the training/eval loop.
 */

import { NextResponse } from 'next/server';
import { verifyTranscriptCorrection } from '@/src/canonical/canonical-corrector';
import { requireAdmin } from '@/src/lib/require-admin';

export const dynamic = 'force-dynamic';

interface VerifyBody {
  action?: string;
  notes?: string | null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  let body: VerifyBody;
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const action = body.action;
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json(
      { error: "action must be 'approve' or 'reject'." },
      { status: 400 }
    );
  }

  try {
    await verifyTranscriptCorrection(
      id,
      auth.session.userId,
      action === 'approve',
      body.notes ?? null
    );
    return NextResponse.json({
      success: true,
      correctionId: id,
      status: action === 'approve' ? 'approved' : 'rejected',
      verifier: auth.session.name || auth.session.email,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not found')) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    console.error('[Admin Audio Verify] error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
