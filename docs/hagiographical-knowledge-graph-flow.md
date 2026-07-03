# Hagiographical Knowledge Graph (Hagiographical-Knowledge-Graph-Flow)

This document describes the design of the polymorphic hagiographical map of Vitthalaya, traversing relationships between Saints, Compositions, Deities, and Festivals.

---

## 1. Graph Edge Architecture

```
        ┌──────────────────────────────────────────────────┐
        │              EntityGraphEdge Table               │
        ├──────────────────────────────────────────────────┤
        │ • source_type (e.g. 'composition')               │
        │ • source_id   (UUID)                             │
        │ • target_type (e.g. 'deity')                     │
        │ • target_id   (UUID)                             │
        │ • relationship (e.g. 'dedicated_to')             │
        │ • weight      (Float, default 1.0)               │
        └────────────────────────┬─────────────────────────┘
                                 │
                   ┌─────────────┴─────────────┐
                   ▼                           ▼
            Forward Edge                 Backward Edge
        (source -> target)           (target -> source)
```

---

## 2. Codebase Reference & Implementations

### 2.1 Graph Ontology Specifications
File: [graph-ontology.ts](file:///c:/Users/Dinesh%20Nikam/Desktop/mirai/varkari/src/knowledge-graph/graph-ontology.ts)
- Defines entities including `saint`, `composition`, `deity`, `festival`, `temple`, `category`, and `region`.
- Maps inverse hagiographical associations using `INVERSE_RELATIONSHIP` (e.g., `composed` $\leftrightarrow$ `composed_by`, `born_in` $\leftrightarrow$ `region_associated_saint`).
- Standardizes canonical exploration paths (e.g. recommending compositions dedicated to Vitthal when viewing saint Tukaram).

### 2.2 Polymorphic Relationship Engine
File: [relationship-engine.ts](file:///c:/Users/Dinesh%20Nikam/Desktop/mirai/varkari/src/knowledge-graph/relationship-engine.ts)
- `createBidirectionalEdge(sourceType, sourceId, targetType, targetId, relationship)`: Saves the forward and corresponding inverse edge simultaneously (e.g. composition's author and saint's composition list).
- `traverseOneHop(...)`: SQL-based fast edge traversal querying incoming and outgoing union sets.
- `traverseMultiHop(...)`: Executes a Breadth-First Search (BFS) starting at any entity up to a depth of `maxDepth` (defaults to 2) to build local network neighborhoods.
- `findPath(source, target)`: Executes a bidirectional BFS to find the shortest hagiographical path linking any two nodes in the database.
- `buildEdgesForComposition(compositionId, tx)`: Auto-discovers relationships (saint, deity, category, festival) and writes graph edges dynamically during editorial promotion.

### 2.3 Visual Representation Compilation
File: [graph-builder-sqlite.ts](file:///c:/Users/Dinesh%20Nikam/Desktop/mirai/varkari/src/lib/graph-builder-sqlite.ts)
- `buildCompleteGraph()`: Direct SQLite compiler querying tables using `bun:sqlite` to export a JSON object containing `nodes` and `edges` for front-end rendering.

### 2.4 Re-Build CLI Daemon
File: [build-graph.ts](file:///c:/Users/Dinesh%20Nikam/Desktop/mirai/varkari/scripts/build-graph.ts)
- Executes a full graph synchronization by running `bun run scripts/build-graph.ts`. It wipes existing polymorphic rows and runs query mappings in batches of 500.
