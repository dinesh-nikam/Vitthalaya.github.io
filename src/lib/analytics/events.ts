/**
 * Analytics Event Service — records and queries analytics events.
 *
 * Tracks: page views, book views, search queries, add-to-cart,
 * checkout funnel, payment outcomes, and user engagement metrics.
 */

import { db } from '../../db/client';

// ── Event Types ───────────────────────────────────────────────────────────────

export type AnalyticsEventType =
  | 'page_view'
  | 'book_view'
  | 'search'
  | 'add_to_cart'
  | 'checkout_start'
  | 'checkout_complete'
  | 'payment_success'
  | 'payment_failed'
  | 'book_generated'
  | 'book_export'
  | 'subscription_started';

// ── Record Event ──────────────────────────────────────────────────────────────

export interface RecordEventInput {
  eventType: AnalyticsEventType;
  page?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  userId?: string;
  sessionId?: string;
}

/**
 * Record a single analytics event (fire-and-forget, never throws).
 */
export async function recordEvent(input: RecordEventInput): Promise<void> {
  try {
    await db.analyticsEvent.create({
      data: {
        eventType: input.eventType,
        page: input.page,
        referrer: input.referrer,
        metadata: input.metadata ?? {},
        ip: input.ip ? anonymizeIp(input.ip) : null,
        userAgent: input.userAgent ? truncate(input.userAgent, 500) : null,
        userId: input.userId,
        sessionId: input.sessionId,
      },
    });
  } catch (err) {
    // Analytics must never break the app
    console.error('[Analytics] Failed to record event:', err);
  }
}

/**
 * Record multiple events in a batch.
 */
export async function recordEvents(events: RecordEventInput[]): Promise<void> {
  try {
    await db.analyticsEvent.createMany({
      data: events.map((e) => ({
        eventType: e.eventType,
        page: e.page,
        referrer: e.referrer,
        metadata: e.metadata ?? {},
        ip: e.ip ? anonymizeIp(e.ip) : null,
        userAgent: e.userAgent ? truncate(e.userAgent, 500) : null,
        userId: e.userId,
        sessionId: e.sessionId,
      })),
    });
  } catch (err) {
    console.error('[Analytics] Failed to record batch events:', err);
  }
}

// ── Query Metrics ─────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalPageViews: number;
  totalSearches: number;
  totalBookViews: number;
  uniqueVisitors: number;
  topPages: Array<{ page: string; count: number }>;
  topSearchQueries: Array<{ query: string; count: number }>;
  funnel: {
    pageViews: number;
    addToCart: number;
    checkoutStart: number;
    checkoutComplete: number;
    paymentSuccess: number;
  };
  eventsByDay: Array<{ date: string; count: number }>;
}

/**
 * Get analytics summary for a date range (last N days).
 */
export async function getAnalyticsSummary(days: number = 30): Promise<AnalyticsSummary> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const where = { createdAt: { gte: since } };

  const [
    totalPageViews,
    totalSearches,
    totalBookViews,
    uniqueVisitorResult,
    topPages,
    topSearchQueries,
    addToCartCount,
    checkoutStartCount,
    checkoutCompleteCount,
    paymentSuccessCount,
    eventsByDay,
  ] = await Promise.all([
    db.analyticsEvent.count({ where: { ...where, eventType: 'page_view' } }),
    db.analyticsEvent.count({ where: { ...where, eventType: 'search' } }),
    db.analyticsEvent.count({ where: { ...where, eventType: 'book_view' } }),
    db.analyticsEvent.findMany({
      where: { ...where, ip: { not: null } },
      distinct: ['ip'],
      select: { ip: true },
    }),
    db.analyticsEvent.groupBy({
      by: ['page'],
      where: { ...where, page: { not: null }, eventType: 'page_view' },
      _count: true,
      orderBy: { _count: { page: 'desc' } },
      take: 20,
    }) as unknown as Array<{ page: string; _count: number }>,
    db.analyticsEvent.findMany({
      where: {
        ...where,
        eventType: 'search',
        metadata: { path: ['query'], not: null },
      },
      select: { metadata: true },
      take: 500,
    }) as unknown as Array<{ metadata: { query?: string } }>,
    db.analyticsEvent.count({ where: { ...where, eventType: 'add_to_cart' } }),
    db.analyticsEvent.count({ where: { ...where, eventType: 'checkout_start' } }),
    db.analyticsEvent.count({ where: { ...where, eventType: 'checkout_complete' } }),
    db.analyticsEvent.count({ where: { ...where, eventType: 'payment_success' } }),
    db.analyticsEvent.findMany({
      where: { ...where },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Count unique visitors (by IP)
  const uniqueVisitors = uniqueVisitorResult.length;

  // Aggregate search queries
  const queryCounts = new Map<string, number>();
  for (const event of topSearchQueries) {
    const q = (event.metadata as any)?.query;
    if (q && typeof q === 'string') {
      queryCounts.set(q, (queryCounts.get(q) ?? 0) + 1);
    }
  }
  const topQueries = [...queryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([query, count]) => ({ query, count }));

  // Aggregate events by day
  const dayCounts = new Map<string, number>();
  for (const event of eventsByDay) {
    const day = event.createdAt.toISOString().split('T')[0];
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }
  const dailyEvents = [...dayCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return {
    totalPageViews,
    totalSearches,
    totalBookViews,
    uniqueVisitors,
    topPages: topPages.map((p) => ({ page: p.page ?? '/', count: p._count })),
    topSearchQueries: topQueries,
    funnel: {
      pageViews: totalPageViews,
      addToCart: addToCartCount,
      checkoutStart: checkoutStartCount,
      checkoutComplete: checkoutCompleteCount,
      paymentSuccess: paymentSuccessCount,
    },
    eventsByDay: dailyEvents,
  };
}

/**
 * Get the most viewed compositions (books).
 */
export async function getPopularContent(days: number = 30, limit: number = 10): Promise<Array<{ id: string; title: string; views: number }>> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const bookViews = await db.analyticsEvent.findMany({
    where: {
      eventType: 'book_view',
      createdAt: { gte: since },
      metadata: { path: ['bookId'], not: null },
    },
    select: { metadata: true },
    take: 2000,
  });

  const viewMap = new Map<string, { id: string; title: string; views: number }>();
  for (const event of bookViews) {
    const meta = event.metadata as { bookId?: string; bookTitle?: string } | null;
    if (meta?.bookId) {
      const existing = viewMap.get(meta.bookId);
      if (existing) {
        existing.views++;
      } else {
        viewMap.set(meta.bookId, {
          id: meta.bookId,
          title: meta.bookTitle ?? 'Unknown',
          views: 1,
        });
      }
    }
  }

  return [...viewMap.values()]
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function anonymizeIp(ip: string): string {
  // Anonymize last octet for privacy
  if (ip.includes('.')) {
    return ip.replace(/\d+$/, '0');
  }
  if (ip.includes(':')) {
    return ip.replace(/(?::[0-9a-fA-F]{1,4}){5}$/, ':0:0:0:0:0');
  }
  return ip;
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}
