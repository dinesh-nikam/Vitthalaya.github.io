/**
 * Digital Pandharpur — Users API
 *
 * GET /api/community/users?email=...
 *   Get a user by email.
 *
 * GET /api/community/users?id=...
 *   Get a user by ID.
 *
 * POST /api/community/users
 *   Create or find a user.
 *   Body: { email, name?, imageUrl?, bio? }
 *
 * GET /api/community/users?list=true
 *   List all users (limit/offset optional).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';

// ─── GET: Lookup user ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    const id = request.nextUrl.searchParams.get('id');
    const listAll = request.nextUrl.searchParams.get('list') === 'true';

    if (listAll) {
      const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10);
      const offset = parseInt(request.nextUrl.searchParams.get('offset') ?? '0', 10);

      const [users, total] = await Promise.all([
        db.user.findMany({
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          select: {
            id: true,
            email: true,
            name: true,
            imageUrl: true,
            role: true,
            reputationScore: true,
            bio: true,
            createdAt: true,
          },
        }),
        db.user.count(),
      ]);

      return NextResponse.json({ users, total, limit, offset });
    }

    if (email && typeof email === 'string') {
      const user = await db.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          imageUrl: true,
          role: true,
          reputationScore: true,
          bio: true,
          createdAt: true,
        },
      });

      if (!user) {
        return NextResponse.json({ exists: false, user: null });
      }

      return NextResponse.json({ exists: true, user });
    }

    if (id && typeof id === 'string') {
      const user = await db.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          imageUrl: true,
          role: true,
          reputationScore: true,
          bio: true,
          createdAt: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: `User ${id} not found` }, { status: 404 });
      }

      return NextResponse.json(user);
    }

    return NextResponse.json(
      { error: 'Provide email, id, or list=true query parameter' },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch user';
    console.error('[Community] Get user error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST: Create or find user ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, imageUrl, bio } = body as {
      email?: string;
      name?: string;
      imageUrl?: string;
      bio?: string;
    };

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email is required' },
        { status: 400 }
      );
    }

    // Upsert: find or create
    const user = await db.user.upsert({
      where: { email },
      create: {
        email,
        name: name ?? null,
        imageUrl: imageUrl ?? null,
        bio: bio ?? null,
      },
      update: {
        name: name ?? undefined,
        imageUrl: imageUrl ?? undefined,
        bio: bio ?? undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        imageUrl: true,
        role: true,
        reputationScore: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create user';
    console.error('[Community] Create user error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
