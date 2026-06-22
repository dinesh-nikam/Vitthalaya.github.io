/**
 * Push notification subscription API.
 * POST: Subscribe a user to push notifications
 * DELETE: Unsubscribe a user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loggedInUserId = (session.user as any).id;

    const body = await request.json();
    const { userId, endpoint, p256dh, auth } = body;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Missing required fields (endpoint, p256dh, auth)' }, { status: 400 });
    }

    if (userId && userId !== loggedInUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const resolvedUserId = userId || loggedInUserId;

    const existing = await db.pushSubscription.findFirst({
      where: { endpoint },
    });

    if (existing) {
      await db.pushSubscription.update({
        where: { id: existing.id },
        data: {
          p256dh,
          auth,
          userId: resolvedUserId,
        },
      });
    } else {
      await db.pushSubscription.create({
        data: {
          endpoint,
          p256dh,
          auth,
          userId: resolvedUserId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Push/Subscribe] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loggedInUserId = (session.user as any).id;

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
    }

    const existing = await db.pushSubscription.findFirst({
      where: { endpoint },
    });

    if (!existing) {
      return NextResponse.json({ success: true });
    }

    if (existing.userId && existing.userId !== loggedInUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.pushSubscription.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Push/Subscribe] Delete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
