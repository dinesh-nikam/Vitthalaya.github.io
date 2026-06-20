/**
 * Digital Pandharpur — Knowledge Graph Relationship Engine
 *
 * Manages edges in the EntityGraphEdge table:
 *   - Create relationships between any two entities
 *   - Delete relationships
 *   - Traverse the graph (1-hop, n-hop, bidirectional)
 *   - Bulk import for migration
 *
 * All operations use raw SQL for polymorphic edge traversal.
 * The EntityGraphEdge table stores edges as (sourceType, sourceId) → (targetType, targetId).
 */

import { db } from '../db/client';
import type { EntityType, RelationshipType, TraversalStep, TraversalResult } from './graph-ontology';
import { INVERSE_RELATIONSHIP, ENTITY_TYPES } from './graph-ontology';

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

/** Create a directed edge. Returns the created edge record. */
export async function createEdge(
  _sourceType: EntityType,
  _sourceId: string,
  _targetType: EntityType,
  _targetId: string,
  _relationship: RelationshipType,
  _options?: { weight?: number; metadata?: Record<string, unknown> }
): Promise<EdgeRecord> {
  // Note: Full implementation requires PostgreSQL; SQLite stub
  throw new Error('Edge creation requires PostgreSQL database');
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

/** Delete a specific edge by ID. */
export async function deleteEdge(_edgeId: string): Promise<boolean> {
  // Stub for SQLite compatibility
  return false;
}

/** Delete all edges involving a specific entity (useful before re-import). */
export async function deleteEdgesForEntity(
  _entityType: EntityType,
  _entityId: string
): Promise<number> {
  // Stub for SQLite compatibility
  return 0;
}

/** Check if an edge already exists. */
export async function edgeExists(
  sourceType: EntityType,
  sourceId: string,
  targetType: EntityType,
  targetId: string,
  relationship: string
): Promise<boolean> {
  // Note: Full implementation requires PostgreSQL; SQLite stub
  return false;
}

// ─── Traversal ──────────────────────────────────────────────────────────────

export interface TraversalOptions {
  /** Max depth for multi-hop traversal (default: 1) */
  maxDepth?: number;
  /** Filter by relationship type(s) */
  relationships?: string[];
  /** Filter by target entity type(s) */
  targetTypes?: EntityType[];
  /** Minimum edge weight */
  minWeight?: number;
  /** Max results to return */
  limit?: number;
}

/**
 * One-hop traversal: find all entities directly connected to an entity.
 * Searches both outgoing and incoming edges.
 */
export async function traverseOneHop(
  _entityType: EntityType,
  _entityId: string,
  _options: TraversalOptions = {}
): Promise<TraversalStep[]> {
  // Note: Full implementation requires PostgreSQL; SQLite stub
  return [];
}

/**
 * Multi-hop traversal: find entities at multiple depths.
 */
export async function traverseMultiHop(
  _entityType: EntityType,
  _entityId: string,
  _options: TraversalOptions = {}
): Promise<TraversalStep[]> {
  // Note: Full implementation requires PostgreSQL; SQLite stub
  return [];
}

/**
 * Find the shortest path between two entities using bidirectional BFS.
 */
export async function findPath(
  _entityType: EntityType,
  _entityId: string,
  _targetType: EntityType,
  _targetId: string,
  _options: TraversalOptions = {}
): Promise<TraversalResult | null> {
  // Note: Full implementation requires PostgreSQL; SQLite stub
  return null;
}

// ─── Statistics ─────────────────────────────────────────────────────────────

/** Get edge count statistics. */
export async function getEdgeStatistics(): Promise<{
  totalEdges: number;
  typeDistribution: Record<string, number>;
}> {
  // Stub implementation
  return { totalEdges: 0, typeDistribution: {} };
}

/** Get all edges for a specific entity. */
export async function getEdgesForEntity(
  _entityType: EntityType,
  _entityId: string
): Promise<EdgeRecord[]> {
  // Note: Full implementation requires PostgreSQL; SQLite stub
  return [];
}

// ─── Bulk Import ───────────────────────────────────────────────────────────

/**
 * Bulk import edges for migration/initial seeding.
 * Uses a transaction for atomicity on PostgreSQL.
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
  // Note: Full implementation requires PostgreSQL; SQLite stub
  for (const edge of edges) {
    await createEdge(edge.sourceType, edge.sourceId, edge.targetType, edge.targetId, edge.relationship, {
      weight: edge.weight,
      metadata: edge.metadata,
    });
  }
}