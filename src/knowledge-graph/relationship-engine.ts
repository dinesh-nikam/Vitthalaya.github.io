/**
 * Digital Pandharpur — Knowledge Graph Relationship Engine
 *
 * Manages edges in the EntityGraphEdge table:
 *   - Create relationships between any two entities
 *   - Delete relationships
 *   - Traverse the graph (1-hop, n-hop, bidirectional)
 *   - Bulk import for migration
 *
 * EntityGraphEdge stores polymorphic edges as:
 *   (sourceType, sourceId) —[relationship]→ (targetType, targetId)
 */

import { db } from '../db/client';
import type { EntityType, RelationshipType, TraversalStep, TraversalResult } from './graph-ontology';
import { INVERSE_RELATIONSHIP } from './graph-ontology';

// ─── Edge CRUD ──────────────────────────────────────────────────────────────

export interface EdgeRecord {
  id: string;
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;
  relationship: string;
  weight: number;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

function toEdgeRecord(e: any): EdgeRecord {
  return {
    id: e.id,
    sourceType: e.sourceType as EntityType,
    sourceId: e.sourceId,
    targetType: e.targetType as EntityType,
    targetId: e.targetId,
    relationship: e.relationship,
    weight: e.weight ?? 1.0,
    metadata: e.metadata ? (typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata) : null,
    createdAt: e.createdAt,
  };
}

/** Create a directed edge. Returns the created edge record. */
export async function createEdge(
  sourceType: EntityType,
  sourceId: string,
  targetType: EntityType,
  targetId: string,
  relationship: RelationshipType,
  options?: { weight?: number; metadata?: Record<string, unknown> }
): Promise<EdgeRecord> {
  const edge = await db.entityGraphEdge.create({
    data: {
      sourceType,
      sourceId,
      targetType,
      targetId,
      relationship,
      weight: options?.weight ?? 1.0,
      metadata: options?.metadata ? JSON.stringify(options.metadata) : null,
    },
  });
  return toEdgeRecord(edge);
}

/** Create a bidirectional edge pair (A→B and B→A with inverse relationship). */
export async function createBidirectionalEdge(
  sourceType: EntityType,
  sourceId: string,
  targetType: EntityType,
  targetId: string,
  relationship: RelationshipType,
  options?: { weight?: number; metadata?: Record<string, unknown> }
): Promise<[EdgeRecord, EdgeRecord]> {
  const forward = await createEdge(sourceType, sourceId, targetType, targetId, relationship, options);

  const inverseRel = (INVERSE_RELATIONSHIP[relationship] ?? 'related_to') as RelationshipType;
  const reverse = await createEdge(targetType, targetId, sourceType, sourceId, inverseRel, {
    weight: options?.weight,
    metadata: options?.metadata,
  });

  return [forward, reverse];
}

/** Delete a specific edge by ID. Returns true if deleted. */
export async function deleteEdge(edgeId: string): Promise<boolean> {
  try {
    await db.entityGraphEdge.delete({ where: { id: edgeId } });
    return true;
  } catch {
    return false;
  }
}

/** Delete all edges involving a specific entity (source OR target). */
export async function deleteEdgesForEntity(
  entityType: EntityType,
  entityId: string
): Promise<number> {
  const result = await db.$executeRawUnsafe(
    `DELETE FROM entity_graph_edges
     WHERE (source_type = $1 AND source_id = $2)
        OR (target_type = $1 AND target_id = $2)`,
    entityType,
    entityId
  );
  return result;
}

/** Check if an edge already exists. */
export async function edgeExists(
  sourceType: EntityType,
  sourceId: string,
  targetType: EntityType,
  targetId: string,
  relationship: string
): Promise<boolean> {
  const count = await db.entityGraphEdge.count({
    where: { sourceType, sourceId, targetType, targetId, relationship },
  });
  return count > 0;
}

// ─── Traversal ──────────────────────────────────────────────────────────────

const ALLOWED_RELATIONSHIPS = new Set<string>([
  'composed',
  'visited',
  'born_in',
  'associated_with',
  'related_to_saint',
  'worshipped',
  'composed_by',
  'dedicated_to',
  'categorized_as',
  'related_to_festival',
  'recorded_in',
  'published_in',
  'originates_from',
  'worshipped_at',
  'celebrated_in_festival',
  'associated_region',
  'held_at',
  'celebrates_deity',
  'observed_in_region',
  'located_in',
  'dedicated_to_deity',
  'associated_saint',
  'contains_temple',
  'region_associated_saint',
  'recording_of',
  'performed_by',
  'contains_composition',
  'authored_by',
  'published_in_region',
  'related_to',
  'located_in_stub'
]);

export interface TraversalOptions {
  maxDepth?: number;
  relationships?: string[];
  targetTypes?: EntityType[];
  minWeight?: number;
  limit?: number;
}

/**
 * One-hop traversal: find all entities directly connected to an entity
 * in either direction (outgoing or incoming edges).
 */
export async function traverseOneHop(
  entityType: EntityType,
  entityId: string,
  options: TraversalOptions = {}
): Promise<TraversalStep[]> {
  if (options.relationships && options.relationships.length > 0) {
    for (const r of options.relationships) {
      if (!ALLOWED_RELATIONSHIPS.has(r)) {
        throw new Error(`Invalid relationship type: ${r}`);
      }
    }
  }

  let sql = `
    (SELECT source_type AS other_type, source_id AS other_id, relationship, 'incoming' AS direction, weight, created_at
     FROM entity_graph_edges
     WHERE target_type = $1 AND target_id = $2
       AND relationship IN ('composed_by','dedicated_to','categorized_as','related_to_festival','recorded_in','published_in','related_to','worshipped_at','celebrated_in_festival','associated_region','held_at','located_in','dedicated_to_deity','observed_in_region','contains_composition','authored_by','published_in_region','region_associated_saint','associated_saint','contains_temple','recording_of','celebrates_deity','performed_by','composed','visited','born_in','associated_with','worshipped','related_to_saint','originates_from','located_in_stub')
    )
    UNION ALL
    (SELECT target_type AS other_type, target_id AS other_id, relationship, 'outgoing' AS direction, weight, created_at
     FROM entity_graph_edges
     WHERE source_type = $1 AND source_id = $2
       AND relationship IN ('composed_by','dedicated_to','categorized_as','related_to_festival','recorded_in','published_in','related_to','worshipped_at','celebrated_in_festival','associated_region','held_at','located_in','dedicated_to_deity','observed_in_region','contains_composition','authored_by','published_in_region','region_associated_saint','associated_saint','contains_temple','recording_of','celebrates_deity','performed_by','composed','visited','born_in','associated_with','worshipped','related_to_saint','originates_from','located_in_stub')
    )
  `;

  const allParams: unknown[] = [entityType, entityId, entityType, entityId];

  if (options.relationships && options.relationships.length > 0) {
    const relList = options.relationships.map((r) => `'${r.replace(/'/g, "''")}'`).join(',');
    sql = sql.replace(/AND relationship IN \([^)]+\)/g, `AND relationship IN (${relList})`);
  }

  if (options.minWeight !== undefined) {
    const paramIndex = allParams.length + 1;
    sql += ` AND weight >= $${paramIndex}`;
    allParams.push(options.minWeight);
  }

  sql += ` ORDER BY weight DESC, created_at DESC`;

  if (options.limit !== undefined) {
    sql += ` LIMIT ${options.limit}`;
  }

  const rows = (await db.$queryRawUnsafe(sql, ...allParams)) as unknown[];

  const steps: TraversalStep[] = [];
  for (const row of rows as any[]) {
    if (options.targetTypes && !options.targetTypes.includes(row.other_type as EntityType)) continue;
    steps.push({
      entityType: row.other_type as EntityType,
      entityId: row.other_id,
      relationship: row.relationship,
      direction: row.direction as 'outgoing' | 'incoming',
      weight: row.weight ?? 1.0,
      depth: 1,
    });
  }

  return steps;
}

/**
 * Multi-hop traversal: BFS up to maxDepth from a starting entity.
 */
export async function traverseMultiHop(
  entityType: EntityType,
  entityId: string,
  options: TraversalOptions = {}
): Promise<TraversalStep[]> {
  const maxDepth = options.maxDepth ?? 2;
  const limit = options.limit ?? 100;
  const allSteps: TraversalStep[] = [];
  const visited = new Set<string>();

  visited.add(`${entityType}:${entityId}`);
  let currentBatch: { entityType: EntityType; entityId: string }[] = [{ entityType, entityId }];
  let depth = 1;

  while (depth <= maxDepth && currentBatch.length > 0 && allSteps.length < limit) {
    const nextBatch: { entityType: EntityType; entityId: string }[] = [];
    const remaining = limit - allSteps.length;

    for (const current of currentBatch) {
      const hops = await traverseOneHop(current.entityType, current.entityId, {
        ...options,
        limit: Math.ceil(remaining / Math.max(1, currentBatch.length)),
      });

      for (const step of hops) {
        const key = `${step.entityType}:${step.entityId}`;
        if (visited.has(key)) continue;
        visited.add(key);

        allSteps.push({ ...step, depth });
        nextBatch.push({ entityType: step.entityType, entityId: step.entityId });

        if (allSteps.length >= limit) break;
      }
      if (allSteps.length >= limit) break;
    }

    depth++;
    currentBatch = nextBatch;
  }

  return allSteps;
}

/**
 * Find the shortest path between two entities using bidirectional BFS.
 */
export async function findPath(
  sourceEntityType: EntityType,
  sourceEntityId: string,
  targetEntityType: EntityType,
  targetEntityId: string,
  options: TraversalOptions = {}
): Promise<TraversalResult | null> {
  if (sourceEntityType === targetEntityType && sourceEntityId === targetEntityId) {
    return {
      originType: sourceEntityType,
      originId: sourceEntityId,
      steps: [],
    };
  }

  const maxDepth = options.maxDepth ?? 4;

  // Forward BFS from source
  const forwardQueue: { entityType: EntityType; entityId: string; path: TraversalStep[]; depth: number }[] = [
    { entityType: sourceEntityType, entityId: sourceEntityId, path: [], depth: 0 },
  ];
  const forwardVisited = new Map<string, TraversalStep[]>();
  forwardVisited.set(`${sourceEntityType}:${sourceEntityId}`, []);

  // Backward BFS from target
  const backwardQueue: { entityType: EntityType; entityId: string; path: TraversalStep[]; depth: number }[] = [
    { entityType: targetEntityType, entityId: targetEntityId, path: [], depth: 0 },
  ];
  const backwardVisited = new Map<string, TraversalStep[]>();
  backwardVisited.set(`${targetEntityType}:${targetEntityId}`, []);

  for (let d = 0; d < maxDepth; d++) {
    // Expand forward frontier
    const fSize = forwardQueue.length;
    for (let i = 0; i < fSize; i++) {
      const current = forwardQueue.shift()!;
      if (current.depth >= Math.ceil(maxDepth / 2)) continue;

      const hops = await traverseOneHop(current.entityType, current.entityId, {
        ...options,
        limit: 50,
      });
      for (const step of hops) {
        const key = `${step.entityType}:${step.entityId}`;
        if (forwardVisited.has(key)) continue;
        const newPath = [...current.path, step];
        forwardVisited.set(key, newPath);

        // Check if this node was visited by backward BFS — path found
        const backwardPath = backwardVisited.get(key);
        if (backwardPath !== undefined) {
          const fullPath = [...newPath, ...[...backwardPath].reverse()];
          return { originType: sourceEntityType, originId: sourceEntityId, steps: fullPath };
        }

        forwardQueue.push({ entityType: step.entityType, entityId: step.entityId, path: newPath, depth: current.depth + 1 });
      }
    }

    // Expand backward frontier
    const bSize = backwardQueue.length;
    for (let i = 0; i < bSize; i++) {
      const current = backwardQueue.shift()!;
      if (current.depth >= Math.floor(maxDepth / 2)) continue;

      const hops = await traverseOneHop(current.entityType, current.entityId, {
        ...options,
        limit: 50,
      });
      for (const step of hops) {
        const key = `${step.entityType}:${step.entityId}`;
        if (backwardVisited.has(key)) continue;
        const newPath = [...current.path, step];
        backwardVisited.set(key, newPath);

        // Check if this node was visited by forward BFS — path found
        const forwardPath = forwardVisited.get(key);
        if (forwardPath !== undefined) {
          const fullPath = [...forwardPath, ...[...newPath].reverse()];
          return { originType: sourceEntityType, originId: sourceEntityId, steps: fullPath };
        }

        backwardQueue.push({ entityType: step.entityType, entityId: step.entityId, path: newPath, depth: current.depth + 1 });
      }
    }
  }

  return null;
}

// ─── Statistics ─────────────────────────────────────────────────────────────

/** Get edge count and type distribution. */
export async function getEdgeStatistics(): Promise<{
  totalEdges: number;
  typeDistribution: Record<string, number>;
}> {
  const totalEdges = await db.entityGraphEdge.count();

  const rows = (await db.$queryRawUnsafe(
    `SELECT relationship, COUNT(*) as cnt
     FROM entity_graph_edges
     GROUP BY relationship
     ORDER BY cnt DESC`
  )) as unknown[];

  const typeDistribution: Record<string, number> = {};
  for (const row of rows as any[]) {
    typeDistribution[row.relationship] = Number(row.cnt);
  }

  return { totalEdges, typeDistribution };
}

/** Get all edges (as outgoing or incoming) for a specific entity. */
export async function getEdgesForEntity(
  entityType: EntityType,
  entityId: string
): Promise<EdgeRecord[]> {
  const edges = await db.entityGraphEdge.findMany({
    where: {
      OR: [
        { sourceType: entityType, sourceId: entityId },
        { targetType: entityType, targetId: entityId },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
  return edges.map(toEdgeRecord);
}

// ─── Bulk Import ───────────────────────────────────────────────────────────

/**
 * Bulk import edges for migration/initial seeding.
 * Uses a transaction for atomicity.
 */
export async function bulkImportEdges(
  edges: Array<{
    sourceType: EntityType;
    sourceId: string;
    targetType: EntityType;
    targetId: string;
    relationship: RelationshipType;
    weight?: number;
    metadata?: Record<string, unknown>;
  }>
): Promise<void> {
  await db.$transaction(
    edges.map((edge) =>
      db.entityGraphEdge.create({
        data: {
          sourceType: edge.sourceType,
          sourceId: edge.sourceId,
          targetType: edge.targetType,
          targetId: edge.targetId,
          relationship: edge.relationship,
          weight: edge.weight ?? 1.0,
          metadata: edge.metadata ? JSON.stringify(edge.metadata) : null,
        },
      })
    )
  );
}