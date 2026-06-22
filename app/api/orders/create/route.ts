import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '../../../../src/db/client';
import { createRazorpayOrder } from '../../../../src/lib/payments/razorpay';

/**
 * POST /api/orders/create
 *
 * Creates an Order + OrderItems + Razorpay payment order.
 *
 * Body:
 *   items: Array<{ publicationId, editionId, quantity, dedicationText? }>
 *   shippingAddress?: { fullName, phone, line1, line2?, city, state, postalCode }
 *   shippingAddressId?: string
 *   guestEmail?: string
 *   guestName?: string
 *   isGift?: boolean
 *   giftMessage?: string
 *   giftRecipient?: string
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : null;

    const body = await request.json();

    // Validation
    if (!body.items?.length) {
      return NextResponse.json({ error: 'At least one item required' }, { status: 400 });
    }

    // Resolve items with pricing
    const resolvedItems: Array<{
      publicationId: string;
      editionId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      dedicationText?: string;
    }> = [];

    let subtotal = 0;

    for (const item of body.items) {
      if (!item.publicationId || !item.editionId) {
        return NextResponse.json({ error: 'Each item needs publicationId and editionId' }, { status: 400 });
      }

      const edition = await db.bookEdition.findUnique({
        where: { id: item.editionId },
        include: { publication: { select: { bookType: true } } },
      });

      if (!edition) {
        return NextResponse.json({ error: `Edition not found: ${item.editionId}` }, { status: 404 });
      }

      const basePrice = edition.price
        ? Number(edition.price)
        : edition.format === 'DIGITAL_PDF' ? 199 : 599;

      const totalPrice = basePrice * (item.quantity ?? 1);
      subtotal += totalPrice;

      resolvedItems.push({
        publicationId: item.publicationId,
        editionId: item.editionId,
        quantity: item.quantity ?? 1,
        unitPrice: basePrice,
        totalPrice,
        dedicationText: item.dedicationText,
      });
    }

    // Handle shipping address
    let addressId = body.shippingAddressId;

    if (!addressId && body.shippingAddress) {
      const addr = body.shippingAddress;
      const address = await db.address.create({
        data: {
          userId: userId || null,
          fullName: addr.fullName,
          phone: addr.phone,
          line1: addr.line1,
          line2: addr.line2,
          city: addr.city,
          state: addr.state,
          postalCode: addr.postalCode,
          country: addr.country ?? 'IN',
        },
      });
      addressId = address.id;
    }

    // Calculate totals
    const shippingCost = 0;
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const total = subtotal + shippingCost + tax;

    // Create order in DB
    const order = await db.order.create({
      data: {
        userId: userId || null,
        guestEmail: body.guestEmail,
        guestName: body.guestName,
        status: 'PENDING',
        shippingAddressId: addressId,
        isGift: body.isGift ?? false,
        giftMessage: body.giftMessage,
        giftRecipient: body.giftRecipient,
        subtotal,
        shippingCost,
        tax,
        total,
        currency: 'INR',
        items: {
          create: resolvedItems.map((ri) => ({
            publicationId: ri.publicationId,
            editionId: ri.editionId,
            quantity: ri.quantity,
            unitPrice: ri.unitPrice,
            totalPrice: ri.totalPrice,
            dedicationText: ri.dedicationText,
          })),
        },
      },
      include: { items: true },
    });

    // Create Razorpay order (with dev fallback)
    const amountPaise = Math.round(total * 100);
    let razorpayOrder: { id: string };
    try {
      razorpayOrder = await createRazorpayOrder({
        amountPaise,
        receiptId: order.id,
        notes: { orderId: order.id },
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        // Dev mode — no real Razorpay keys, use mock
        console.warn('[Dev] Razorpay not configured, using mock order');
        razorpayOrder = { id: `order_mock_${Date.now()}` };
      } else {
        console.error('Razorpay order creation failed in production:', err);
        throw err;
      }
    }

    return NextResponse.json({
      orderId: order.id,
      razorpayOrderId: razorpayOrder.id,
      amountPaise,
      currency: 'INR',
      receiptId: order.id,
      items: resolvedItems,
    }, { status: 201 });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Order creation failed:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


