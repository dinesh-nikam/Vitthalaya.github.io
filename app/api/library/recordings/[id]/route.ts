/**
 * Digital Pandharpur — Recording detail actions (owner-gated)
 *
 * PATCH  /api/library/recordings/[id]  — rename the recording
 * DELETE /api/library/recordings/[id]  — delete recording + derived audio
 *   (UploadedFileVersion storage files), transcript, bookmarks, playback
 *   history, playlist items, moderation queue entries.
 *
 * 404 (not 403) for missing and foreign recordings — no existence leak.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { renameRecording, deleteRecording } from '@/src/lib/library';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { id } = await params;
  let body: { name?: string };
  try {
    body = (await request.json()) as { name?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (typeof body.name !== 'string') {
    return NextResponse.json({ error: 'A name is required.' }, { status: 400 });
  }

  try {
    const name = await renameRecording(id, userId, body.name);
    if (name === null) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json({ originalName: name });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to rename recording.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Params): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { id } = await params;

  try {
    const deleted = await deleteRecording(id, userId);
    if (!deleted) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Delete recording error:', err);
    return NextResponse.json({ error: 'Failed to delete recording.' }, { status: 500 });
  }
}
