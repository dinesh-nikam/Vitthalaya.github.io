/**
 * GET /api/graph/related
 *
 * Returns graph data for the knowledge graph page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildCompleteGraph } from '@/src/lib/graph-builder-sqlite';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const graph = buildCompleteGraph();

    return NextResponse.json({
      nodes: graph.nodes,
      edges: graph.edges,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}