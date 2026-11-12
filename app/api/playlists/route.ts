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
import { z } from 'zod';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';
import { createPlaylist } from '@/src/lib/playlists';
import {
  parsePagination,
  buildPagination,
  ApiErrors,
  errorResponse,
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
    data: playlists,
    playlists,
    pagination: buildPagination(page, limit, total),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

const createPlaylistSchema = z.object({
  name: z
    .string({ required_error: 'Playlist name is required.' })
    .trim()
    .min(1, 'Playlist name is required.')
    .max(120, 'Playlist name is too long.'),
  description: z.string().trim().max(500, 'Description is too long.').nullish(),
  isPublic: z.boolean().optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return ApiErrors.UNAUTHORIZED();

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse('Invalid request body.', 400, { code: 'INVALID_JSON' });
  }

  const parsed = createPlaylistSchema.safeParse(rawBody);
  if (!parsed.success) {
    const primaryMessage = parsed.error.issues[0]?.message || 'Validation failed';
    return errorResponse(primaryMessage, 400, {
      code: 'VALIDATION_ERROR',
      details: Object.fromEntries(
        parsed.error.issues.map((issue) => [issue.path.join('.') || 'body', issue.message])
      ),
    });
  }

  try {
    const playlist = await createPlaylist({
      userId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      isPublic: Boolean(parsed.data.isPublic),
    });

    return NextResponse.json(
      {
        data: playlist,
        playlist,
      },
      {
        status: 201,
        headers: {
          Location: `/api/playlists/${playlist.id}`,
        },
      }
    );
  } catch (err) {
    console.error('Create playlist error:', err);
    return errorResponse('Failed to create playlist.', 500, { code: 'INTERNAL_ERROR' });
  }
}
