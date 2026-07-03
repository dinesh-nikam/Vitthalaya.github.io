/**
 * POST /api/admin/discovery/run
 * POST /api/admin/discovery/run?sourceId=xxx
 *
 * Manually trigger a discovery cycle for all active sources or a single source.
 */
import { NextRequest, NextResponse } from 'next/server';
import { DiscoveryWorker } from '@/src/discovery/discovery-worker';
import { requireAdmin } from '@/src/lib/require-admin';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId');

    // Check if body contains sourceId
    let bodySourceId: string | undefined;
    try {
      const body = await request.json();
      bodySourceId = body.sourceId;
    } catch {
      // No body — that's fine
    }

    const targetSourceId = sourceId ?? bodySourceId;

    if (targetSourceId) {
      // Run for a single source
      const result = await DiscoveryWorker.runForSource(targetSourceId, 'MANUAL');
      return NextResponse.json({ cycleType: 'single', result });
    }

    // Run for all active sources
    const report = await DiscoveryWorker.runForAllActive('MANUAL', 3);
    return NextResponse.json({ cycleType: 'full', report });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Discovery Run API] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
