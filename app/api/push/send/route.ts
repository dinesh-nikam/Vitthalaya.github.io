/**
 * Push notification send endpoint (admin-only).
 * POST /api/push/send — Broadcast a push notification to all subscribers.
 * POST /api/push/send/daily — Send the daily abhang to all subscribers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { broadcastNotification, pickDailyComposition } from '@/src/lib/push/notifications';

// Simple API key check (not authentication — admin gating)
function isAuthorized(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return false; // Fail-secure when ADMIN_API_KEY is not configured
  return apiKey === adminKey;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const title = body.title ?? 'डिजिटल पंढरपूर';
    const messageBody = body.body ?? 'Daily spiritual content from Digital Pandharpur';

    const result = await broadcastNotification({
      title,
      body: messageBody,
      url: body.url ?? '/',
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[Push/Send] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Send the daily abhang to all subscribers.
 * Called by cron job (e.g., Vercel Cron, GitHub Actions scheduled workflow).
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const daily = await pickDailyComposition();
    if (!daily) {
      return NextResponse.json({ error: 'No reviewed compositions available' }, { status: 404 });
    }

    const result = await broadcastNotification({
      title: '🌟 Daily Abhang — Digital Pandharpur',
      body: daily.title,
      url: `/abhang/${daily.slug}`,
    });

    return NextResponse.json({
      ...result,
      composition: daily.title,
    });
  } catch (err) {
    console.error('[Push/Send/Daily] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
