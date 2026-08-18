/**
 * Digital Pandharpur — Playback history recording (owner-gated)
 *
 * POST /api/library/recordings/[id]/playback
 *
 * The player calls this when a recording plays to keep PlaybackHistory fresh
 * (Continue Listening, analytics). Body: { durationSeconds?, completed? }.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';
import { recordPlayback } from '@/src/lib/library';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { id } = await params;

  // Ownership check — foreign recordings get a 404 (no existence leak).
  const recording = await db.uploadedFile.findFirst({
    where: { id, userId, format: 'audio' },
    select: { id: true },
  });
  if (!recording) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  let body: { durationSeconds?: number; completed?: boolean } = {};
  try {
    body = (await request.json()) as { durationSeconds?: number; completed?: boolean };
  } catch {
    // optional body
  }

  try {
    const history = await recordPlayback({
      userId,
      uploadedFileId: id,
      durationSeconds:
        typeof body.durationSeconds === 'number' && body.durationSeconds >= 0
          ? Math.round(body.durationSeconds)
          : null,
      completed: Boolean(body.completed),
    });
    return NextResponse.json({ ok: true, historyId: history.id });
  } catch (err) {
    console.error('Record playback error:', err);
    return NextResponse.json({ error: 'Failed to record playback.' }, { status: 500 });
  }
}
