import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';
import { createRazorpayOrder } from '@/src/lib/payments/razorpay';
import { getUnitPrice, calculateTax } from '@/src/lib/orders/pricing';
import { computeOrderAccessToken } from '@/src/lib/orders/order-access';
import { randomUUID } from 'crypto';

/**
 * POST /api/orders/create
 *
 * Creates an Order + OrderItems + Razorpay payment order.
 *
 * Contract (shared with app/checkout/page.tsx and
 * app/api/orders/verify-payment/route.ts):
 *
 * Body:
 *   items: Array<{ publicationId, editionId, quantity, dedicationText? }>
 *   shippingAddress?: { fullName, phone, line1, line2?, city, state, postalCode, country? }
 *   shippingAddressId?: string
 *   guestEmail?: string
 *   guestName?: string
 *   isGift?: boolean
 *   giftMessage?: string
 *   giftRecipient?: string
 *
 * Response (201):
 *   { orderId, razorpayOrderId, amountPaise, currency, receiptId, items, accessToken }
 *
 * The checkout page passes the returned razorpayOrderId + amountPaise to the
 * Razorpay Checkout modal, then posts orderId/razorpayOrderId/paymentId/
 * signature to /api/orders/verify-payment. `accessToken` lets the customer
 * view their order via /orders/:id?token=... without an account.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : null;

    const body = await request.json();

    // Validation
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'At least one item required' }, { status: 400 });
    }

    // 1. Fetch all editions in a single query to eliminate N+1 Tech Debt
    const editionIds: string[] = body.items.map((item: any) => String(item.editionId));
    if (editionIds.some((id) => !id || id === 'undefined')) {
      return NextResponse.json({ error: 'Each item needs publicationId and editionId' }, { status: 400 });
    }

    const editions = await db.bookEdition.findMany({
      where: { id: { in: editionIds } }
    });

    const editionMap = new Map<string, any>(editions.map(e => [e.id, e]));

    // 2. Resolve items with pricing
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
      const edition = editionMap.get(item.editionId);
      if (!edition) {
        return NextResponse.json({ error: `Edition not found: ${item.editionId}` }, { status: 404 });
      }

      // Single source of truth shared with the book page so the charged
      // amount always matches what the customer saw (see getUnitPrice).
      const basePrice = getUnitPrice(edition.price, edition.format);
      const quantity = item.quantity ?? 1;
      const totalPrice = basePrice * quantity;
      
      subtotal += totalPrice;

      resolvedItems.push({
        publicationId: item.publicationId,
        editionId: item.editionId,
        quantity,
        unitPrice: basePrice,
        totalPrice,
        dedicationText: item.dedicationText,
      });
    }

    // Calculate totals
    const shippingCost = 0;
    const tax = calculateTax(subtotal); // 5% GST
    const total = subtotal + shippingCost + tax;
    const amountPaise = Math.round(total * 100);

    // 3. Generate Order ID locally to link Razorpay reliably
    const orderId = randomUUID();

    // 4. Create Razorpay order first! 
    // If this external API call fails, we abort immediately before touching the DB.
    let razorpayOrder: { id: string };
    try {
      razorpayOrder = await createRazorpayOrder({
        amountPaise,
        receiptId: orderId,
        notes: {
          orderId: orderId,
          itemCount: String(resolvedItems.length),
          ...(userId ? { userId } : {}),
        },
      });
    } catch (err) {
      console.error('Razorpay order creation failed:', err);
      throw err; // Fast fail, no dangling records in DB
    }

    // 5. Commit all DB mutations inside an atomic Transaction
    await db.$transaction(async (tx) => {
      let addressId = body.shippingAddressId;

      if (!addressId && body.shippingAddress) {
        const addr = body.shippingAddress;
        const address = await tx.address.create({
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

      await tx.order.create({
        data: {
          id: orderId, // Use pre-generated UUID linked to Razorpay
          userId: userId || null,
          guestEmail: body.guestEmail,
          guestName: body.guestName,
          status: 'PENDING',
          paymentProvider: 'razorpay',
          paymentId: razorpayOrder.id, // Store gateway ID immediately
          paymentStatus: 'UNPAID',
          currency: 'INR',
          subtotal,
          shippingCost,
          tax,
          total,
          shippingAddressId: addressId,
          isGift: body.isGift ?? false,
          giftMessage: body.giftMessage,
          giftRecipient: body.giftRecipient,
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
        }
      });
    });

    return NextResponse.json({
      orderId,
      razorpayOrderId: razorpayOrder.id,
      amountPaise,
      currency: 'INR',
      receiptId: orderId,
      items: resolvedItems,
      // Shareable view token for the order confirmation page
      accessToken: computeOrderAccessToken(orderId),
    }, { status: 201 });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Order creation failed:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
