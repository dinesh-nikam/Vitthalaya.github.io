/**
 * GET /api/admin/discovery/sources/:id
 * PUT /api/admin/discovery/sources/:id
 * DELETE /api/admin/discovery/sources/:id
 *
 * Single source operations: read, update, delete.
 */
import { NextRequest, NextResponse } from 'next/server';
import { SourceRegistry } from '@/src/discovery/source-registry';
import { ScraperMonitor } from '@/src/discovery/scraper-monitor';
import { requireAdmin } from '@/src/lib/require-admin';
import type { UpdateSourceInput } from '@/src/discovery/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const { id } = await params;
    const source = await SourceRegistry.getById(id);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Include health metrics with the source
    let health: Awaited<ReturnType<typeof ScraperMonitor.getSourceHealth>> | null = null;
    try {
      health = await ScraperMonitor.getSourceHealth(id);
    } catch {
      // Health check failed — return source without health
    }

    return NextResponse.json({ source, health });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Discovery Source API] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const { id } = await params;
    const body = (await request.json()) as UpdateSourceInput;

    const source = await SourceRegistry.update(id, body);
    return NextResponse.json({ source });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Discovery Source API] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const { id } = await params;
    await SourceRegistry.delete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Discovery Source API] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
