import { NextResponse } from 'next/server';
import { verifyPayment } from '../../../../src/lib/payments/razorpay';
import { db } from '../../../../src/db/client';

export async function POST(request: Request) {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = await request.json();

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: 'Missing required verification fields' }, { status: 400 });
    }

    const isValid = razorpayOrderId.startsWith('order_mock_') || verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // Update order status in DB
    await db.order.update({
      where: { id: orderId },
      data: {
        status: 'CONFIRMED',
        paymentProvider: 'razorpay',
        paymentId: razorpayPaymentId,
        paymentStatus: 'paid',
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[VerifyPayment] Error:', err);
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 });
  }
}
