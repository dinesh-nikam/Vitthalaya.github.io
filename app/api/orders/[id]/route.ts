/**
 * GET /api/orders/[id] — Get full order detail with download URLs.
 */
import { NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { canAccessOrder } from '@/src/lib/orders/order-access';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            publication: {
              select: { id: true, slug: true, titleMarathi: true, titleEnglish: true },
            },
            edition: {
              select: { format: true, fileUrl: true, pageCount: true },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Authorization: order owner (session), shareable link token, or the
    // guest email used at checkout — same rules as the order detail page.
    const { searchParams } = new URL(_request.url);
    const userId = session?.user ? (session.user as any).id : null;
    const allowed = canAccessOrder({
      order,
      sessionUserId: userId,
      token: searchParams.get('token'),
      email: searchParams.get('email'),
    });

    if (!allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ order });
  } catch (err) {
    console.error('[Order Detail]', err);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}
