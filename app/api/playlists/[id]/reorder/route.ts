/**
 * Digital Pandharpur — Playlist reorder API (owner-gated)
 *
 * PUT /api/playlists/[id]/reorder
 *
 * body: { itemIds: string[] } — the playlist's item ids in the desired order.
 * Atomic: verifies the id set exactly matches current items before persisting.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { reorderPlaylistItems } from '@/src/lib/playlists';

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { id } = await params;
  let body: { itemIds?: unknown };
  try {
    body = (await request.json()) as { itemIds?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!Array.isArray(body.itemIds) || body.itemIds.some((x) => typeof x !== 'string')) {
    return NextResponse.json({ error: 'itemIds must be an array of strings.' }, { status: 400 });
  }

  try {
    await reorderPlaylistItems(id, userId, body.itemIds as string[]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reorder.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
