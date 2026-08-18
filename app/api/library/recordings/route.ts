/**
 * Digital Pandharpur — My Recordings API (owner-gated)
 *
 * GET /api/library/recordings
 *
 * Returns the authenticated user's audio recordings (UploadedFile format=audio)
 * with playable version URLs (enhanced preferred), transcript preview, bookmark
 * state, and last-played info. Owners only — no cross-user access.
 *
 * Paginated via ?page=&limit= (default page=1, limit=20, capped at 50) with a
 * standard `pagination` envelope alongside the `recordings` array (additive —
 * older clients reading `recordings` keep working).
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { listRecordings } from '@/src/lib/library';
import {
  parsePagination,
  buildPagination,
  ApiErrors,
} from '@/src/lib/api-response';
import { db } from '@/src/db/client';

export async function GET(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return ApiErrors.UNAUTHORIZED();
  }

  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const [total, recordings] = await Promise.all([
      db.uploadedFile.count({ where: { userId, format: 'audio' } }),
      listRecordings(userId, { skip, take: limit }),
    ]);

    return NextResponse.json({
      recordings,
      pagination: buildPagination(page, limit, total),
    });
  } catch (err) {
    console.error('List recordings error:', err);
    return ApiErrors.INTERNAL_ERROR('Failed to load recordings.');
  }
}
