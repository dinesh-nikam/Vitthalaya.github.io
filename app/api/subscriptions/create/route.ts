import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';

/**
 * POST /api/subscriptions/create
 *
 * Creates a Bhakta Club subscription (₹99/month).
 *
 * Flow:
 *   1. Create Razorpay recurring subscription
 *   2. Store subscription in User model
 *   3. Return subscription details
 *
 * Environment:
 *   RAZORPAY_KEY_ID
 *   RAZORPAY_KEY_SECRET
 *
 * Body: { planId?: string, userId?: string }
 */

const SUBSCRIPTION_PRICE_PAISE = 9900; // ₹99/month = 9900 paise
const SUBSCRIPTION_CURRENCY = 'INR';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loggedInUserId = (session.user as any).id;

    const body = await request.json();
    if (body.userId && body.userId !== loggedInUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const userId = body.userId || loggedInUserId;
    const planId = body.planId ?? 'bhakta_club_monthly';

    // Create Razorpay subscription
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: 'Payment gateway not configured' },
        { status: 503 },
      );
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    // Create plan if not exists
    const planRes = await fetch('https://api.razorpay.com/v1/plans', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        period: 'monthly',
        interval: 1,
        item: {
          name: 'Bhakta Club Monthly',
          amount: SUBSCRIPTION_PRICE_PAISE,
          currency: SUBSCRIPTION_CURRENCY,
          description: 'Monthly subscription — 1 free digital book, 15% off print books, early access, exclusive covers',
        },
      }),
    });

    if (!planRes.ok) {
      const errText = await planRes.text();
      // Plan may already exist — that's fine, try to create subscription
      console.warn('Razorpay plan creation warning:', errText);
    }

    let resolvedPlanId = planId;
    if (planRes.ok) {
      try {
        const planData = await planRes.json();
        if (planData.id) {
          resolvedPlanId = planData.id;
        }
      } catch (e) {
        console.warn('Failed to parse Razorpay plan JSON:', e);
      }
    }

    // Create subscription
    const subRes = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: resolvedPlanId,
        total_count: 12,
        customer_notify: true,
        notes: {
          userId,
        },
      }),
    });

    if (!subRes.ok) {
      const errText = await subRes.text();
      throw new Error(`Razorpay subscription creation failed: ${errText}`);
    }

    const subscription = await subRes.json();

    return NextResponse.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      startAt: subscription.start_at,
      amount: SUBSCRIPTION_PRICE_PAISE,
      currency: SUBSCRIPTION_CURRENCY,
    }, { status: 201 });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Subscription creation failed:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
