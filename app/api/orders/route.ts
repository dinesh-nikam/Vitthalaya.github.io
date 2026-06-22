/**
 * GET /api/orders — List the current user's orders.
 * Supports ?email= for guest order lookup.
 */
import { NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const guestEmail = searchParams.get('email');
    const orderId = searchParams.get('orderId');

    const userId = session?.user ? (session.user as any).id : null;

    const where: any = {};
    if (userId) {
      where.userId = userId;
    } else if (guestEmail && orderId) {
      where.guestEmail = guestEmail;
      where.id = orderId;
    } else {
      return NextResponse.json({ orders: [] });
    }

    const orders = await db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        total: true,
        currency: true,
        paymentStatus: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            publication: {
              select: { slug: true, titleMarathi: true },
            },
            edition: {
              select: { format: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ orders });
  } catch (err) {
    console.error('[Orders List]', err);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
