import { NextResponse } from 'next/server';
import { db } from '../../../../src/db/client';
import { verifyWebhookSignature, parseWebhookEvent } from '../../../../src/lib/payments/razorpay';

/**
 * POST /api/orders/webhook
 *
 * Razorpay payment webhook. Verifies HMAC signature, then updates
 * the Order status based on the event type.
 *
 * Expected events:
 *   - payment.captured  → order CONFIRMED
 *   - payment.failed     → order CANCELLED
 *   - order.paid         → order CONFIRMED
 *
 * Environment: RAZORPAY_WEBHOOK_SECRET
 */
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature') ?? '';

    // Verify webhook signature
    const isValid = verifyWebhookSignature(body, signature);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = parseWebhookEvent(body);
    const payment = event.payload.payment?.entity;
    const orderId = payment?.notes?.orderId
      ?? event.payload.order?.entity?.receipt;
    const paymentId = payment?.id ?? event.payload.order?.entity?.id;
    console.log(`[Webhook] Received: ${event.event}`, {
      orderId,
      paymentId,
      status: payment?.status ?? event.payload.order?.entity?.status,
    });

    // Handle event types
    switch (event.event) {
      case 'payment.captured':
      case 'order.paid': {
        const payment = event.payload.payment?.entity;
        const orderId = payment?.notes?.orderId
          ?? event.payload.order?.entity?.receipt;

        if (orderId) {
          await db.order.updateMany({
            where: { id: orderId },
            data: {
              status: 'CONFIRMED',
              paymentProvider: 'razorpay',
              paymentId: payment?.id ?? event.payload.order?.entity?.id,
              paymentStatus: 'paid',
            },
          });
          console.log(`[Webhook] Order ${orderId} confirmed`);
        }
        break;
      }

      case 'payment.failed': {
        const payment = event.payload.payment?.entity;
        const orderId = payment?.notes?.orderId;

        if (orderId) {
          await db.order.updateMany({
            where: { id: orderId },
            data: {
              status: 'CANCELLED',
              paymentStatus: 'failed',
            },
          });
          console.log(`[Webhook] Order ${orderId} cancelled (payment failed)`);
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event: ${event.event}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (err) {
    console.error('[Webhook] Error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
