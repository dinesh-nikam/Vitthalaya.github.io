/**
 * Digital Pandharpur — Playlist detail API (owner-gated)
 *
 * GET    /api/playlists/[id] — playlist with ordered items
 * PATCH  /api/playlists/[id] — rename / update description / visibility
 * DELETE /api/playlists/[id] — delete the playlist
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';
import { getPlaylistForUser, renamePlaylist, deletePlaylist } from '@/src/lib/playlists';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { id } = await params;
  const playlist = await getPlaylistForUser(id, userId);
  if (!playlist) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json({ playlist });
}

export async function PATCH(request: Request, { params }: Params): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { id } = await params;
  let body: { name?: string; description?: string | null; isPublic?: boolean };
  try {
    body = (await request.json()) as {
      name?: string;
      description?: string | null;
      isPublic?: boolean;
    };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Verify ownership before any write.
  const owned = await db.playlist.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof body.name === 'string') {
    try {
      await renamePlaylist(id, userId, body.name);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Invalid playlist name.' },
        { status: 400 }
      );
    }
  }
  if (typeof body.description === 'string') data.description = body.description;
  if (typeof body.isPublic === 'boolean') data.isPublic = body.isPublic;

  if (Object.keys(data).length > 0) {
    await db.playlist.update({ where: { id }, data });
  }

  const playlist = await getPlaylistForUser(id, userId);
  return NextResponse.json({ playlist });
}

export async function DELETE(_request: Request, { params }: Params): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { id } = await params;
  try {
    await deletePlaylist(id, userId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }
}
