/**
 * GET /api/graph/traverse
 *
 * Multi-hop graph traversal from a starting entity.
 * Discovers connected entities up to a configurable depth.
 *
 * Query params:
 *   type      - Entity type
 *   id        - Entity UUID
 *   depth     - Max traversal depth (1-4, default: 2)
 *   relations - Optional comma-separated relationship filter
 *   types     - Optional comma-separated target type filter
 *   limit     - Max results (default: 50)
 *
 * Example:
 *   GET /api/graph/traverse?type=temple&id=<uuid>&depth=3
 *
 * Response:
 *   { origin: { type, id }, steps: TraversalStep[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { traverseOneHop, traverseMultiHop } from '@/src/knowledge-graph/relationship-engine';
import type { EntityType } from '@/src/knowledge-graph/graph-ontology';
import { ENTITY_TYPES } from '@/src/knowledge-graph/graph-ontology';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as EntityType | null;
    const id = searchParams.get('id');
    const depth = parseInt(searchParams.get('depth') ?? '1', 10);
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);
    const relationsParam = searchParams.get('relations');
    const typesParam = searchParams.get('types');

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Query params "type" and "id" are required' },
        { status: 400 }
      );
    }

    if (!ENTITY_TYPES.includes(type as any)) {
      return NextResponse.json(
        { error: `Invalid type "${type}". Valid: ${ENTITY_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const clampedDepth = Math.max(1, Math.min(4, depth));
    const options = {
      maxDepth: clampedDepth,
      limit,
      relationships: relationsParam ? relationsParam.split(',').map((r) => r.trim()) : undefined,
      targetTypes: typesParam ? typesParam.split(',').map((t) => t.trim() as EntityType) : undefined,
      avoidCycles: true,
    };

    const steps = clampedDepth <= 1
      ? await traverseOneHop(type, id, options)
      : await traverseMultiHop(type, id, options);

    // Group by depth for response
    const byDepth = new Map<number, typeof steps>();
    for (const step of steps) {
      const list = byDepth.get(step.depth) ?? [];
      list.push(step);
      byDepth.set(step.depth, list);
    }

    const grouped = Array.from(byDepth.entries())
      .sort(([a], [b]) => a - b)
      .map(([depth, items]) => ({ depth, count: items.length, items }));

    return NextResponse.json({
      origin: { type, id },
      totalSteps: steps.length,
      depth: clampedDepth,
      groups: grouped,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
