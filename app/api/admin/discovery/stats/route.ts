/**
 * GET /api/admin/discovery/stats
 * Returns aggregate discovery system statistics for the admin dashboard.
 */
import { NextResponse } from 'next/server';
import { SourceRegistry } from '@/src/discovery/source-registry';
import { requireAdmin } from '@/src/lib/require-admin';

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const stats = await SourceRegistry.getAggregateStats();
    const counts = await SourceRegistry.getCounts();
    const sources = await SourceRegistry.getActive();

    // Count today's new items from discovery jobs
    const { db } = await import('@/src/db/client');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayItems: Array<{ total: bigint }> = await db.$queryRawUnsafe(
      `SELECT COALESCE(SUM(items_new), 0) as total FROM discovery_jobs WHERE created_at >= $1`,
      today,
    );

    const todayNew = Number(todayItems[0]?.total ?? 0);

    return NextResponse.json({
      ...stats,
      statusCounts: counts,
      activeSources: sources.length,
      compositionsToday: todayNew,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Discovery Stats API] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
