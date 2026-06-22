/**
 * Reading Lists API — CRUD for user-curated composition collections.
 *
 * GET /api/reading-lists — List public reading lists (paginated)
 * POST /api/reading-lists — Create a new reading list (auth required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';
import { createReadingList, getPublicReadingLists } from '@/src/lib/reading-lists/reading-lists';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);

    const result = await getPublicReadingLists({
      take: limit,
      skip: (page - 1) * limit,
    });

    return NextResponse.json({
      lists: result.lists,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (err) {
    console.error('[ReadingLists/GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loggedInUserId = (session.user as any).id;

    const body = await request.json();
    const { userId, name, description, isPublic, compositionIds } = body;

    if (!userId || !name) {
      return NextResponse.json({ error: 'Missing required fields (userId, name)' }, { status: 400 });
    }

    if (userId !== loggedInUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const list = await createReadingList({
      userId,
      name,
      description,
      isPublic,
      compositionIds,
    });

    return NextResponse.json(list, { status: 201 });
  } catch (err) {
    console.error('[ReadingLists/POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
