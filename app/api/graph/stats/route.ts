/**
 * GET /api/graph/stats
 *
 * Knowledge graph statistics: entity counts, edge counts by relationship type.
 *
 * Response:
 *   {
 *     entities: { saint: number, composition: number, ... },
 *     edges: { total: number, byRelationship: [{ relationship, count }] },
 *     averageDegree: number
 *   }
 */

import { NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { getEdgeStatistics } from '@/src/knowledge-graph/relationship-engine';
import { ENTITY_TYPES } from '@/src/knowledge-graph/graph-ontology';

export async function GET(): Promise<NextResponse> {
  try {
    // Count all entity types in parallel
    const entityCounts = await Promise.all(
      ENTITY_TYPES.map(async (type) => {
        let count = 0;
        switch (type) {
          case 'saint':
            count = await db.saint.count();
            break;
          case 'composition':
            count = await db.composition.count();
            break;
          case 'deity':
            count = await db.deity.count();
            break;
          case 'festival':
            count = await db.festival.count();
            break;
          case 'temple':
            count = await db.temple.count();
            break;
          case 'category':
            count = await db.category.count();
            break;
          case 'region':
            count = await db.region.count();
            break;
          case 'audio':
            count = await db.audio.count();
            break;
          case 'book':
            count = await db.book.count();
            break;
        }
        return { type, count };
      })
    );

    const entities: Record<string, number> = {};
    for (const { type, count } of entityCounts) {
      entities[type] = count;
    }

    const edges = await getEdgeStatistics();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const totalEdges = edges.totalEdges;

    // Average degree: (total edges * 2) / total entities
    const totalEntities = Object.values(entities).reduce((a, b) => a + b, 0);
    const averageDegree = totalEntities > 0 ? (totalEdges * 2) / totalEntities : 0;

    return NextResponse.json({
      entities,
      edges: {
        total: totalEdges,
        byRelationship: edges.typeDistribution,
      },
      averageDegree: Math.round(averageDegree * 100) / 100,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
