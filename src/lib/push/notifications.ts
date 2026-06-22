/**
 * Push notification service — handles VAPID key management, subscription storage,
 * and sending push notifications to subscribed users.
 */

import { db } from '../../db/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

// ── Subscription Management ───────────────────────────────────────────────────

/**
 * Save a push subscription to the database.
 */
export async function saveSubscription(
  userId: string,
  subscription: PushSubscription,
): Promise<boolean> {
  try {
    const existing = await db.pushSubscription.findFirst({
      where: { endpoint: subscription.endpoint, userId },
    });

    if (existing) {
      await db.pushSubscription.update({
        where: { id: existing.id },
        data: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      });
    } else {
      await db.pushSubscription.create({
        data: {
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      });
    }
    return true;
  } catch (err) {
    console.error('[Push] Failed to save subscription:', err);
    return false;
  }
}

/**
 * Remove a push subscription (e.g., when user unsubscribes).
 */
export async function removeSubscription(endpoint: string): Promise<boolean> {
  try {
    await db.pushSubscription.deleteMany({ where: { endpoint } });
    return true;
  } catch (err) {
    console.error('[Push] Failed to remove subscription:', err);
    return false;
  }
}

/**
 * Get all active subscriptions (or for a specific user).
 */
export async function getSubscriptions(userId?: string): Promise<PushSubscription[]> {
  const where = userId ? { userId } : {};
  const subs = await db.pushSubscription.findMany({ where, take: 1000 });
  return subs.map((s) => ({
    endpoint: s.endpoint,
    keys: { p256dh: s.p256dh, auth: s.auth },
  }));
}

/**
 * Send a push notification to a single subscription using Web Push API.
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload,
): Promise<{ success: boolean; statusCode?: number }> {
  try {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn('[Push] VAPID keys not configured — skipping push');
      return { success: false, statusCode: 412 };
    }

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
        'Urgency': 'normal',
      },
      body: JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon ?? '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        data: { url: payload.url ?? '/' },
      }),
    });

    // Remove expired subscriptions
    if (response.status === 410) {
      await removeSubscription(subscription.endpoint);
    }

    return { success: response.ok, statusCode: response.status };
  } catch (err) {
    console.error('[Push] Failed to send notification:', err);
    return { success: false };
  }
}

/**
 * Broadcast a push notification to all subscribers.
 */
export async function broadcastNotification(payload: PushPayload): Promise<{
  sent: number;
  failed: number;
}> {
  const subscriptions = await getSubscriptions();
  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const result = await sendPushNotification(sub, payload);
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
    // Rate limit: small delay between sends
    await new Promise((r) => setTimeout(r, 50));
  }

  console.log(`[Push] Broadcast complete: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}

/**
 * Pick a random composition for the daily abhang feature.
 */
export async function pickDailyComposition(): Promise<{
  title: string;
  text: string;
  slug: string;
} | null> {
  const count = await db.composition.count({ where: { reviewed: true } });
  if (count === 0) return null;

  const skip = Math.floor(Math.random() * count);
  const composition = await db.composition.findFirst({
    where: { reviewed: true },
    skip,
    select: { id: true, titleMarathi: true, slug: true },
  });

  if (!composition) return null;

  return {
    title: composition.titleMarathi,
    text: `Daily Abhang: ${composition.titleMarathi}`,
    slug: composition.slug,
  };
}
