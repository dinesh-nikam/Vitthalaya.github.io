/**
 * Digital Pandharpur — Admin Audio Job Retry API
 *
 * POST /api/admin/audio/retry   { jobId }
 *
 * Resets a failed/pending AudioProcessingJob back to `pending` with a fresh
 * attempt budget so the worker daemon picks it up again. Admin-only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { requireAdmin } from '@/src/lib/require-admin';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { jobId } = body;
    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json({ error: 'jobId is required.' }, { status: 400 });
    }

    const job = await db.audioProcessingJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }

    // Manual retry resets attempts so jobs past their auto-retry budget are
    // eligible again; errorMessage is cleared for a clean slate.
    const updated = await db.audioProcessingJob.update({
      where: { id: jobId },
      data: {
        status: 'pending',
        attempts: 0,
        errorMessage: null,
      },
    });

    return NextResponse.json({
      success: true,
      job: {
        id: updated.id,
        kind: updated.kind,
        status: updated.status,
        attempts: updated.attempts,
        maxAttempts: updated.maxAttempts,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Admin Audio Retry API] error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
