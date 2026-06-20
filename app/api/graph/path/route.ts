/**
 * GET /api/graph/path
 *
 * Find the shortest path between two entities in the knowledge graph.
 * Uses BFS up to maxDepth (default: 4, max: 6).
 *
 * Query params:
 *   sourceType - Source entity type
 *   sourceId   - Source entity UUID
 *   targetType - Target entity type
 *   targetId   - Target entity UUID
 *   maxDepth   - Max search depth (default: 4)
 *
 * Response:
 *   { found: boolean, path: TraversalStep[] | null }
 */

import { NextRequest, NextResponse } from 'next/server';
import { findPath } from '@/src/knowledge-graph/relationship-engine';
import type { EntityType } from '@/src/knowledge-graph/graph-ontology';
import { ENTITY_TYPES } from '@/src/knowledge-graph/graph-ontology';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const sourceType = searchParams.get('sourceType') as EntityType | null;
    const sourceId = searchParams.get('sourceId');
    const targetType = searchParams.get('targetType') as EntityType | null;
    const targetId = searchParams.get('targetId');
    const maxDepth = Math.min(
      parseInt(searchParams.get('maxDepth') ?? '4', 10),
      6
    );

    if (!sourceType || !sourceId || !targetType || !targetId) {
      return NextResponse.json(
        { error: 'sourceType, sourceId, targetType, targetId are required' },
        { status: 400 }
      );
    }

    if (!ENTITY_TYPES.includes(sourceType as EntityType)) {
      return NextResponse.json({ error: `Invalid sourceType: ${sourceType}` }, { status: 400 });
    }
    if (!ENTITY_TYPES.includes(targetType as EntityType)) {
      return NextResponse.json({ error: `Invalid targetType: ${targetType}` }, { status: 400 });
    }

    const path = await findPath(
      sourceType, sourceId,
      targetType, targetId,
      { maxDepth }
    );

    return NextResponse.json({
      source: { type: sourceType, id: sourceId },
      target: { type: targetType, id: targetId },
      found: path !== null,
      pathLength: path?.steps?.length ?? 0,
      path,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
