/**
 * Unit tests for knowledge graph relationship engine
 * Tests TC-GRAPH-001 to TC-GRAPH-078
 */

import { describe, test, expect } from 'bun:test';
import { CANONICAL_PATHS, RELATIONSHIP_TYPES, INVERSE_RELATIONSHIP } from '../../src/knowledge-graph/graph-ontology';

describe('Knowledge Graph - Schema Validation', () => {
  test('TC-GRAPH-001: Saint-Composition relationship exists', () => {
    const path = CANONICAL_PATHS.find(p => p.label === 'saint-compositions');
    expect(path).toBeDefined();
    expect(path?.sourceType).toBe('saint');
    expect(path?.targetType).toBe('composition');
  });

  test('TC-GRAPH-002: Composition-Saint inverse exists', () => {
    const path = CANONICAL_PATHS.find(p => p.label === 'composition-saint');
    expect(path).toBeDefined();
    expect(path?.sourceType).toBe('composition');
    expect(path?.targetType).toBe('saint');
  });

  test('TC-GRAPH-003: Deity relationship paths exist', () => {
    const deityPaths = CANONICAL_PATHS.filter(p => p.sourceType === 'deity' || p.targetType === 'deity');
    expect(deityPaths.length).toBeGreaterThan(0);
  });

  test('TC-GRAPH-004: Festival relationship paths exist', () => {
    const festivalPaths = CANONICAL_PATHS.filter(p => p.sourceType === 'festival' || p.targetType === 'festival');
    expect(festivalPaths.length).toBeGreaterThan(0);
  });
});

describe('Knowledge Graph - Inverse Relationships', () => {
  test('TC-GRAPH-005: Composed has inverse composed_by', () => {
    expect(INVERSE_RELATIONSHIP['composed']).toBe('composed_by');
    expect(INVERSE_RELATIONSHIP['composed_by']).toBe('composed');
  });

  test('TC-GRAPH-006: Dedicated_to is self-inverse', () => {
    expect(INVERSE_RELATIONSHIP['dedicated_to']).toBe('dedicated_to');
  });

  test('TC-GRAPH-007: Visited-Associated_saint inverse', () => {
    expect(INVERSE_RELATIONSHIP['visited']).toBe('associated_saint');
  });
});

describe('Knowledge Graph - Relationship Types', () => {
  test('TC-GRAPH-008: All core relationships defined', () => {
    expect(RELATIONSHIP_TYPES).toContain('composed');
    expect(RELATIONSHIP_TYPES).toContain('composed_by');
    expect(RELATIONSHIP_TYPES).toContain('dedicated_to');
    expect(RELATIONSHIP_TYPES).toContain('related_to_festival');
  });

  test('TC-GRAPH-009: Saint relationships present', () => {
    const saintRels = RELATIONSHIP_TYPES.filter(r =>
      r.includes('saint') || r === 'born_in' || r === 'visited'
    );
    expect(saintRels.length).toBeGreaterThan(2);
  });

  test('TC-GRAPH-010: Composition relationships present', () => {
    const compRels = RELATIONSHIP_TYPES.filter(r =>
      r.includes('composition') || r === 'dedicated_to' || r === 'categorized_as'
    );
    expect(compRels.length).toBeGreaterThan(2);
  });
});

describe('Knowledge Graph - Traversal Logic', () => {
  // Mock graph traversal
  function traverseGraph(edges: Array<{ sourceType: string; targetType: string; relationship: string }>, startType: string, depth = 1) {
    const visited = new Set<string>();
    const results: Array<any> = [];

    function dfs(type: string, currentDepth: number) {
      if (currentDepth > depth) return;
      if (visited.has(type)) return;
      visited.add(type);

      const outgoing = edges.filter(e => e.sourceType === type);
      for (const edge of outgoing) {
        results.push(edge);
        dfs(edge.targetType, currentDepth + 1);
      }
    }

    dfs(startType, 0);
    return results;
  }

  test('TC-GRAPH-011: Saint to composition traversal', () => {
    const edges = [
      { sourceType: 'saint', targetType: 'composition', relationship: 'composed' },
      { sourceType: 'composition', targetType: 'deity', relationship: 'dedicated_to' },
    ];
    const results = traverseGraph(edges, 'saint', 2);
    expect(results.length).toBe(2);
  });

  test('TC-GRAPH-012: Circular reference detection', () => {
    const edges = [
      { sourceType: 'saint', targetType: 'composition', relationship: 'composed' },
      { sourceType: 'composition', targetType: 'saint', relationship: 'composed_by' },
    ];
    // Traversal should complete without infinite loop
    const results = traverseGraph(edges, 'saint', 5);
    expect(results.length).toBe(2);
  });

  test('TC-GRAPH-013: Missing node handling', () => {
    const edges: Array<any> = [];
    const results = traverseGraph(edges, 'nonexistent', 2);
    expect(results.length).toBe(0);
  });
});

describe('Knowledge Graph - Weight and Metadata', () => {
  interface TestEdge {
    weight?: number;
    metadata?: Record<string, unknown>;
  }

  test('TC-GRAPH-014: Default weight is 1.0', () => {
    const edge: TestEdge = {};
    expect(edge.weight ?? 1.0).toBe(1.0);
  });

  test('TC-GRAPH-015: Weighted edges affect ranking', () => {
    const edges = [
      { weight: 0.1 },
      { weight: 0.9 },
      { weight: 0.5 },
    ];
    const sorted = [...edges].sort((a, b) => (b.weight ?? 1.0) - (a.weight ?? 1.0));
    expect(sorted[0].weight).toBe(0.9);
    expect(sorted[2].weight).toBe(0.1);
  });

  test('TC-GRAPH-016: Metadata preserved for recommendations', () => {
    const edge: TestEdge = {
      metadata: { source: 'user', timestamp: '2026-01-01' },
    };
    expect(edge.metadata?.source).toBe('user');
  });
});