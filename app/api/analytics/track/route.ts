/**
 * Analytics tracking endpoint.
 * POST /api/analytics/track — Record a single analytics event (client-side).
 * POST /api/analytics/track/batch — Record multiple events.
 *
 * Used by the client-side analytics hook to fire-and-forget events.
 */

import { NextRequest, NextResponse } from 'next/server';
import { recordEvent, recordEvents } from '@/src/lib/analytics/events';

const VALID_EVENT_TYPES = [
  'page_view',
  'book_view',
  'search',
  'add_to_cart',
  'checkout_start',
  'checkout_complete',
  'payment_success',
  'payment_failed',
  'book_generated',
  'book_export',
  'subscription_started'
];

function anonymizeIp(ip: string): string {
  if (ip.includes('.')) {
    return ip.replace(/\d+$/, '0');
  }
  if (ip.includes(':')) {
    return ip.replace(/(?::[0-9a-fA-F]{1,4}){5}$/, ':0:0:0:0:0');
  }
  return ip;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Single event
    const { eventType, page, referrer, metadata, userId, sessionId } = body;

    if (!eventType) {
      return NextResponse.json({ error: 'Missing eventType' }, { status: 400 });
    }

    if (!VALID_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json({ error: `Invalid eventType: ${eventType}` }, { status: 400 });
    }

    const rawIp = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined;
    const ip = rawIp ? anonymizeIp(rawIp) : undefined;
    const userAgent = request.headers.get('user-agent') ?? undefined;

    await recordEvent({
      eventType,
      page: page ?? request.headers.get('referer') ?? undefined,
      referrer: referrer ?? request.headers.get('referer') ?? undefined,
      metadata,
      ip,
      userAgent,
      userId,
      sessionId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Analytics/Track] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { events } = body;

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'Missing events array' }, { status: 400 });
    }

    for (const e of events) {
      if (!e.eventType || !VALID_EVENT_TYPES.includes(e.eventType)) {
        return NextResponse.json({ error: `Invalid eventType: ${e.eventType}` }, { status: 400 });
      }
    }

    const rawIp = request.headers.get('x-forwarded-for') ?? undefined;
    const ip = rawIp ? anonymizeIp(rawIp) : undefined;
    const userAgent = request.headers.get('user-agent') ?? undefined;

    const enriched = events.map((e: any) => ({
      ...e,
      ip: e.ip ? anonymizeIp(e.ip) : ip,
      userAgent: e.userAgent ?? userAgent,
    }));

    await recordEvents(enriched);

    return NextResponse.json({ success: true, count: events.length });
  } catch (err) {
    console.error('[Analytics/Track/Batch] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
