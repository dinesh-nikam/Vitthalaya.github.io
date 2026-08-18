/**
 * Digital Pandharpur — Playlist item removal (owner-gated)
 *
 * DELETE /api/playlists/[id]/items/[itemId]
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { removeItemFromPlaylist } from '@/src/lib/playlists';

type Params = { params: Promise<{ id: string; itemId: string }> };

export async function DELETE(_request: Request, { params }: Params): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { id, itemId } = await params;
  try {
    await removeItemFromPlaylist(id, itemId, userId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }
}
