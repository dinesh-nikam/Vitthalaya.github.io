/**
 * Knowledge Graph Builder for Digital Pandharpur (SQLite version)
 * Builds relationship graph: Saint ↔ Abhang ↔ Deity ↔ Festival
 * Uses dynamic import to avoid Next.js build-time resolution of bun:sqlite.
 */

import type { Database as DatabaseType } from 'bun:sqlite';

const DEFAULT_DB_PATH = 'data/varkari.db';

// Lazy-loaded database - only loaded at runtime when needed
let dbInstance: DatabaseType | null = null;

function getDatabase(): DatabaseType {
  if (!dbInstance) {
    // Dynamic require to avoid Next.js build-time resolution
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const Database = require('bun:sqlite').Database as typeof DatabaseType;
    dbInstance = new Database(process.env.DATABASE_PATH || DEFAULT_DB_PATH);
  }
  return dbInstance;
}

export interface GraphNode {
  id: string;
  type: 'saint' | 'composition' | 'deity' | 'festival' | 'category';
  name: string;
  marathiName?: string;
  slug?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'composed' | 'worships' | 'celebrates' | 'belongs_to';
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Build complete graph for visualization
 */
export function buildCompleteGraph(): KnowledgeGraph {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
  const db = getDatabase() as any;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const visited = new Set<string>();

  // Get all saints
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const saints = db.query(
    'SELECT id, name_marathi, name_transliteration FROM saints'
  ).all() as { id: string; name_marathi: string; name_transliteration: string }[];

  for (const saint of saints) {
    const nodeId = `saint-${saint.id}`;
    if (visited.has(nodeId)) continue;

    // Generate slug from transliteration
    const slug = saint.name_transliteration
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');

    nodes.push({
      id: nodeId,
      type: 'saint',
      name: saint.name_marathi,
      marathiName: saint.name_marathi,
      slug,
    });
    visited.add(nodeId);

    // Add compositions by this saint
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const comps = db
      .query(
        `SELECT id, title_marathi, slug, deity_id, type
         FROM compositions
         WHERE saint_id = ? AND is_verified = 1
         LIMIT 10`
      )
      .all(saint.id) as { id: string; title_marathi: string; slug: string; deity_id: string | null; type: string }[];

    for (const comp of comps) {
      const compNodeId = `comp-${comp.id}`;
      if (visited.has(compNodeId)) continue;

      nodes.push({
        id: compNodeId,
        type: 'composition',
        name: comp.title_marathi,
        marathiName: comp.title_marathi,
        slug: comp.slug,
      });
      visited.add(compNodeId);

      // Add edge: saint -> composition
      edges.push({ source: nodeId, target: compNodeId, type: 'composed' });

      // Add deity connection
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (comp.deity_id) {
        const deity = db
          .query('SELECT id, name_marathi FROM deities WHERE id = ?')
          .get(comp.deity_id) as { id: string; name_marathi: string } | undefined;

        if (deity) {
          const deityNodeId = `deity-${deity.id}`;
          if (!visited.has(deityNodeId)) {
            nodes.push({
              id: deityNodeId,
              type: 'deity',
              name: deity.name_marathi,
              marathiName: deity.name_marathi,
            });
            visited.add(deityNodeId);
          }
          edges.push({ source: compNodeId, target: deityNodeId, type: 'worships' });
        }
      }
    }
  }

  // Add festivals
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const festivals = db
    .query(
      `SELECT f.id, f.name_marathi, COUNT(fc.composition_id) as comp_count
       FROM festivals f
       LEFT JOIN composition_festivals fc ON f.id = fc.festival_id
       GROUP BY f.id`
    )
    .all() as { id: string; name_marathi: string; comp_count: number }[];

  for (const fest of festivals) {
    if (fest.comp_count === 0) continue;

    const festNodeId = `fest-${fest.id}`;
    if (!visited.has(festNodeId)) {
      nodes.push({
        id: festNodeId,
        type: 'festival',
        name: fest.name_marathi,
        marathiName: fest.name_marathi,
      });
      visited.add(festNodeId);
    }
  }

  return { nodes, edges };
}

// For CLI testing
if (require.main === module) {
  const graph = buildCompleteGraph();
  console.log(`Nodes: ${graph.nodes.length}`);
  console.log(`Edges: ${graph.edges.length}`);
  console.log('Node types:', [...new Set(graph.nodes.map(n => n.type))].join(', '));
}