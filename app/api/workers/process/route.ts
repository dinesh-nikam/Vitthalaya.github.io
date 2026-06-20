import { NextRequest, NextResponse } from 'next/server';
import { processSearchSyncJobs, processAiEnrichmentJobs } from '@/src/lib/workers';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate with WORKER_SECRET_KEY
    const authHeader = request.headers.get('authorization');
    const secretKey = (() => {
    const key = process.env.WORKER_SECRET_KEY;
    if (!key && process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: WORKER_SECRET_KEY is required in production. Set environment variable.');
    }
    if (!key) {
      console.warn('⚠️ WORKER_SECRET_KEY not set. Worker endpoint will reject requests in production.');
    }
    return key || '';
  })();

    let token = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Fallback to query parameter secret
      const { searchParams } = new URL(request.url);
      token = searchParams.get('secret') || '';
    }

    if (!token || token !== secretKey) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid or missing worker secret key.' },
        { status: 401 }
      );
    }

    console.log('[WorkerAPI] Starting background worker execution...');

    // 2. Execute workers
    const searchSyncCount = await processSearchSyncJobs();
    const aiEnrichCount = await processAiEnrichmentJobs();

    console.log(`[WorkerAPI] Complete. Processed ${searchSyncCount} search sync jobs, ${aiEnrichCount} AI enrichment jobs.`);

    return NextResponse.json({
      success: true,
      processed: {
        searchSync: searchSyncCount,
        aiEnrichment: aiEnrichCount,
      },
    });
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[WorkerAPI] Execution failed:', err);
    return NextResponse.json(
      { error: 'Internal worker execution failure', details: errorMsg },
      { status: 500 }
    );
  }
}
