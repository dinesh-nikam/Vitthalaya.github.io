/**
 * Digital Pandharpur — Playlists API (owner-gated)
 *
 * GET  /api/playlists — the authenticated user's playlists (+ item counts),
 *      paginated via ?page=&limit= (default page=1, limit=20, capped at 50)
 *      with a standard `pagination` envelope alongside the `playlists` array
 *      (additive — older clients reading `playlists` keep working).
 * POST /api/playlists — create a playlist { name, description?, isPublic? }
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';
import { createPlaylist } from '@/src/lib/playlists';
import {
  parsePagination,
  buildPagination,
  ApiErrors,
} from '@/src/lib/api-response';

export async function GET(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return ApiErrors.UNAUTHORIZED();

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);

  const [total, playlists] = await Promise.all([
    db.playlist.count({ where: { userId } }),
    db.playlist.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        kind: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { items: true } },
      },
    }),
  ]);

  return NextResponse.json({
    playlists,
    pagination: buildPagination(page, limit, total),
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

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

  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'Playlist name is required.' }, { status: 400 });
  }

  try {
    const playlist = await createPlaylist({
      userId,
      name: body.name,
      description: typeof body.description === 'string' ? body.description : null,
      isPublic: Boolean(body.isPublic),
    });
    return NextResponse.json({ playlist }, { status: 201 });
  } catch (err) {
    console.error('Create playlist error:', err);
    return NextResponse.json({ error: 'Failed to create playlist.' }, { status: 500 });
  }
}
