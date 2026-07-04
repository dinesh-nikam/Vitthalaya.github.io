/**
 * GET /api/orders — List the current user's orders.
 * Supports ?email= for guest order lookup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { listResponse, errorResponse, CORS_HEADERS } from '@/src/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const guestEmail = searchParams.get('email');
    const orderId = searchParams.get('orderId');

    const userId = session?.user ? (session.user as { id?: string }).id : null;

    // Build where clause with proper typing
    const where: {
      userId?: string;
      guestEmail?: string;
      id?: string;
    } = {};

    if (userId) {
      where.userId = userId;
    } else if (guestEmail && orderId) {
      where.guestEmail = guestEmail;
      where.id = orderId;
    } else {
      return NextResponse.json({ orders: [] }, { headers: CORS_HEADERS });
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

    return NextResponse.json({ orders }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error('[Orders List]', err);
    return errorResponse('Failed to fetch orders', 500);
  }
}
