/**
 * GET /api/admin/discovery/sources
 * POST /api/admin/discovery/sources
 *
 * List all sources (GET) or create a new source (POST).
 */
import { NextRequest, NextResponse } from 'next/server';
import { SourceRegistry } from '@/src/discovery/source-registry';
import { requireAdmin } from '@/src/lib/require-admin';
import type { CreateSourceInput, SourceFilter, SourceStatus, SourceType } from '@/src/discovery/types';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const filter: SourceFilter = {};

    const status = searchParams.get('status');
    if (status) filter.status = status.split(',') as SourceStatus[];

    const type = searchParams.get('type');
    if (type) filter.type = type.split(',') as SourceType[];

    const search = searchParams.get('search');
    if (search) filter.search = search;

    const trustScoreMin = searchParams.get('trustScoreMin');
    if (trustScoreMin) filter.trustScoreMin = parseFloat(trustScoreMin);

    const limit = searchParams.get('limit');
    if (limit) filter.limit = parseInt(limit, 10);

    const offset = searchParams.get('offset');
    if (offset) filter.offset = parseInt(offset, 10);

    const sources = await SourceRegistry.getAll(filter);
    const total = sources.length;

    return NextResponse.json({ sources, total });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Discovery Sources API] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const body = (await request.json()) as CreateSourceInput;

    if (!body.name || !body.url || !body.type || !body.baseDomain) {
      return NextResponse.json(
        { error: 'Missing required fields: name, url, type, baseDomain' },
        { status: 400 },
      );
    }

    const source = await SourceRegistry.create(body);
    return NextResponse.json({ source }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Discovery Sources API] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
