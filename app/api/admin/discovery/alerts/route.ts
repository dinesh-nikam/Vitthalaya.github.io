/**
 * GET /api/admin/discovery/alerts
 *
 * Returns active alerts for the discovery system (failing sources,
 * low trust scores, high error rates, etc.).
 */
import { NextResponse } from 'next/server';
import { ScraperMonitor } from '@/src/discovery/scraper-monitor';
import { requireAdmin } from '@/src/lib/require-admin';

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const alerts = await ScraperMonitor.getActiveAlerts();

    const summary = {
      critical: alerts.filter((a) => a.severity === 'CRITICAL').length,
      warning: alerts.filter((a) => a.severity === 'WARNING').length,
      info: alerts.filter((a) => a.severity === 'INFO').length,
      total: alerts.length,
    };

    return NextResponse.json({ alerts, summary });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Discovery Alerts API] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
