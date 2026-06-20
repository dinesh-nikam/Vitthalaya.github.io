/**
 * Digital Pandharpur — Spiritual Knowledge Graph Ontology
 *
 * Defines the graph schema: entity types, relationship types, and
 * canonical paths through the graph for Marathi devotional literature.
 *
 * Entity types: Saint, Composition, Deity, Festival, Temple, Category,
 *               Region, Audio, Book
 *
 * This ontology powers the relationship engine, recommendation queries,
 * and the Neo4j alternative schema.
 */

// ─── Entity Types ───────────────────────────────────────────────────────────

export const ENTITY_TYPES = [
  'saint',
  'composition',
  'deity',
  'festival',
  'temple',
  'category',
  'region',
  'audio',
  'book',
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

/** Prisma model name for each entity type */
export const ENTITY_PRISMA_MODEL: Record<EntityType, string> = {
  saint: 'saint',
  composition: 'composition',
  deity: 'deity',
  festival: 'festival',
  temple: 'temple',
  category: 'category',
  region: 'region',
  audio: 'audio',
  book: 'book',
};

// ─── Relationship Types ─────────────────────────────────────────────────────

export const RELATIONSHIP_TYPES = [
  // Saint relationships
  'composed',
  'visited',
  'born_in',
  'associated_with',
  'related_to_saint',
  'worshipped',

  // Composition relationships
  'composed_by',
  'dedicated_to',
  'categorized_as',
  'related_to_festival',
  'recorded_in',
  'published_in',
  'originates_from',

  // Deity relationships
  'worshipped_at',
  'celebrated_in_festival',
  'associated_region',

  // Festival relationships
  'held_at',
  'celebrates_deity',
  'observed_in_region',

  // Temple relationships
  'located_in',
  'dedicated_to_deity',
  'associated_saint',

  // Region relationships
  'contains_temple',
  'region_associated_saint',

  // Audio relationships
  'recording_of',
  'performed_by',

  // Book relationships
  'contains_composition',
  'authored_by',
  'published_in_region',

  // Generic
  'related_to',
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

// ─── Inverse Mapping ────────────────────────────────────────────────────────

/** Maps each relationship to its inverse (for bidirectional traversal). */
export const INVERSE_RELATIONSHIP: Record<string, string> = {
  composed: 'composed_by',
  composed_by: 'composed',
  visited: 'associated_saint',
  associated_saint: 'visited',
  born_in: 'region_associated_saint',
  region_associated_saint: 'born_in',
  associated_with: 'associated_with', // self-inverse
  worshipped: 'worshipped_at',
  worshipped_at: 'worshipped',
  dedicated_to: 'dedicated_to', // self-inverse
  categorized_as: 'categorized_as', // self-inverse
  related_to_festival: 'celebrates_deity',
  celebrates_deity: 'related_to_festival',
  recorded_in: 'recording_of',
  recording_of: 'recorded_in',
  published_in: 'contains_composition',
  contains_composition: 'published_in',
  originates_from: 'originates_from', // self-inverse
  celebrated_in_festival: 'celebrates_deity',
  associated_region: 'region_associated_saint',
  held_at: 'located_in_stub',
  located_in: 'contains_temple',
  contains_temple: 'located_in',
  located_in_stub: 'held_at',
  dedicated_to_deity: 'dedicated_to',
  observed_in_region: 'originates_from',
  performed_by: 'performed_by', // self-inverse
  authored_by: 'composed_by',
  published_in_region: 'originates_from',
  related_to: 'related_to',
  related_to_saint: 'related_to_saint', // self-inverse
};

// ─── Canonical Graph Paths ──────────────────────────────────────────────────

/**
 * Defines the typical traversal paths through the graph.
 * Used for: "if user is viewing X, recommend Y via Z relationship".
 */
export const CANONICAL_PATHS: Array<{
  label: string;
  sourceType: EntityType;
  relationship: RelationshipType;
  targetType: EntityType;
  description: string;
}> = [
  { label: 'saint-compositions',   sourceType: 'saint',       relationship: 'composed',         targetType: 'composition',  description: 'Compositions authored by a saint' },
  { label: 'composition-saint',    sourceType: 'composition', relationship: 'composed_by',       targetType: 'saint',        description: 'Saint who composed this work' },
  { label: 'composition-deity',    sourceType: 'composition', relationship: 'dedicated_to',      targetType: 'deity',        description: 'Deity to whom the composition is dedicated' },
  { label: 'deity-temple',         sourceType: 'deity',       relationship: 'worshipped_at',     targetType: 'temple',       description: 'Temples where this deity is worshipped' },
  { label: 'temple-deity',         sourceType: 'temple',      relationship: 'dedicated_to_deity', targetType: 'deity',       description: 'Deity to whom the temple is dedicated' },
  { label: 'temple-region',        sourceType: 'temple',      relationship: 'located_in',        targetType: 'region',       description: 'Region where the temple is located' },
  { label: 'saint-temple',         sourceType: 'saint',       relationship: 'visited',           targetType: 'temple',       description: 'Temples visited by the saint' },
  { label: 'saint-region',         sourceType: 'saint',       relationship: 'born_in',           targetType: 'region',       description: 'Region where the saint was born' },
  { label: 'composition-festival', sourceType: 'composition', relationship: 'related_to_festival', targetType: 'festival',    description: 'Festivals associated with the composition' },
  { label: 'festival-deity',       sourceType: 'festival',    relationship: 'celebrates_deity',   targetType: 'deity',        description: 'Deity celebrated by the festival' },
  { label: 'composition-audio',    sourceType: 'composition', relationship: 'recorded_in',        targetType: 'audio',        description: 'Audio recordings of the composition' },
  { label: 'composition-book',     sourceType: 'composition', relationship: 'published_in',       targetType: 'book',         description: 'Books containing the composition' },
  { label: 'composition-category', sourceType: 'composition', relationship: 'categorized_as',     targetType: 'category',     description: 'Category/genre of the composition' },
  { label: 'saint-related',        sourceType: 'saint',       relationship: 'related_to_saint',   targetType: 'saint',        description: 'Related saints (guru, disciple, contemporary)' },
  { label: 'deity-festival',       sourceType: 'deity',       relationship: 'celebrated_in_festival', targetType: 'festival',  description: 'Festivals celebrating this deity' },
];

// ─── Edge Creation ──────────────────────────────────────────────────────────

export interface EdgeInput {
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;
  relationship: RelationshipType;
  weight?: number;
  metadata?: Record<string, unknown>;
}

// ─── Traversal ──────────────────────────────────────────────────────────────

export interface TraversalStep {
  /** Entities found at this depth */
  entityType: EntityType;
  entityId: string;
  /** How we got here */
  relationship: string;
  direction: 'outgoing' | 'incoming';
  /** Score weight */
  weight: number;
  /** Depth from origin (0 = origin) */
  depth: number;
}

export interface TraversalResult {
  originType: EntityType;
  originId: string;
  steps: TraversalStep[];
}
