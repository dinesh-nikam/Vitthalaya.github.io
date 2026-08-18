import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { requireAdmin } from '@/src/lib/require-admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const { id } = await params;
    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            publication: {
              select: { id: true, titleMarathi: true, titleEnglish: true, slug: true },
            },
            edition: {
              select: { id: true, format: true, price: true },
            },
          },
        },
        shippingAddress: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Admin Order Details GET] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const { id } = await params;
    const body = await request.json();

    const { status, trackingNumber, printPartnerId } = body;

    const updatedOrder = await db.order.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(trackingNumber !== undefined && { trackingNumber }),
        ...(printPartnerId !== undefined && { printPartnerId }),
      },
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Admin Order Details PATCH] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
