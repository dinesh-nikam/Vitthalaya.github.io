/**
 * Digital Pandharpur — Recording bookmark toggle (owner-gated)
 *
 * POST /api/library/recordings/[id]/bookmark
 *
 * Toggles the AudioFavorite row for the authenticated user's recording.
 * 404 for missing or foreign recordings — no existence leak.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { toggleRecordingBookmark } from '@/src/lib/library';

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { id } = await params;

  try {
    const result = await toggleRecordingBookmark(id, userId);
    if (result === null) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json(result);
  } catch (err) {
    console.error('Bookmark toggle error:', err);
    return NextResponse.json({ error: 'Failed to update bookmark.' }, { status: 500 });
  }
}
