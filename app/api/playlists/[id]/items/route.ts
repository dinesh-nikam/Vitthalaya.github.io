/**
 * Digital Pandharpur — Playlist items API (owner-gated)
 *
 * POST /api/playlists/[id]/items — add an item
 *       body: { compositionId? } or { uploadedFileId? } (never both)
 *
 * DELETE lives at /api/playlists/[id]/items/[itemId].
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { addItemToPlaylist, assertSingleTarget } from '@/src/lib/playlists';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { id } = await params;
  let body: { compositionId?: string; uploadedFileId?: string };
  try {
    body = (await request.json()) as { compositionId?: string; uploadedFileId?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  try {
    assertSingleTarget(body.compositionId ?? null, body.uploadedFileId ?? null);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid item target.' },
      { status: 400 }
    );
  }

  try {
    // addItemToPlaylist throws only for non-owned playlists; a returned item
    // that already existed is the dedup no-op (returns the existing row).
    const item = await addItemToPlaylist({
      playlistId: id,
      userId,
      compositionId: body.compositionId ?? null,
      uploadedFileId: body.uploadedFileId ?? null,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add item.';
    const status = message.includes('owned') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
