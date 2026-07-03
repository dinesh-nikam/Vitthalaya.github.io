-- AlterTable: Add confidence column to entity_graph_edges
-- Confidence score 0.0–1.0: 1.0 = deterministic FK, lower = inferred/ML-derived
ALTER TABLE entity_graph_edges ADD COLUMN confidence FLOAT DEFAULT 1.0;

-- Index for filtering by confidence threshold
CREATE INDEX idx_entity_graph_edges_confidence ON entity_graph_edges (confidence);
