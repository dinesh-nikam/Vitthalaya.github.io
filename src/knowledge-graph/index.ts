/**
 * Digital Pandharpur — Knowledge Graph Public API
 *
 * Barrel exports for the knowledge graph module.
 * Import from '@/src/knowledge-graph' throughout the codebase.
 */

// Graph ontology
export {
  ENTITY_TYPES,
  RELATIONSHIP_TYPES,
  INVERSE_RELATIONSHIP,
  CANONICAL_PATHS,
} from './graph-ontology';
export type {
  EntityType,
  RelationshipType,
  EdgeInput,
  TraversalStep,
  TraversalResult,
} from './graph-ontology';

// Relationship engine
export {
  createEdge,
  createBidirectionalEdge,
  deleteEdge,
  deleteEdgesForEntity,
  edgeExists,
  traverseOneHop,
  traverseMultiHop,
  findPath,
  getEdgeStatistics,
  getEdgesForEntity,
  bulkImportEdges,
} from './relationship-engine';
export type {
  EdgeRecord,
  TraversalOptions,
} from './relationship-engine';

// Graph queries - SQLite versions
export {
  buildCompleteGraph,
} from '../lib/graph-builder-sqlite';
export type {
  GraphNode,
  GraphEdge,
  KnowledgeGraph,
} from '../lib/graph-builder-sqlite';
