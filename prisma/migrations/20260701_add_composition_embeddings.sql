-- Migration: Add composition embeddings table for semantic search
-- This table stores 768-dimensional vector embeddings for each composition.
-- Uses pgvector extension for efficient similarity search.

-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the embeddings table
CREATE TABLE IF NOT EXISTS composition_embeddings (
  composition_id TEXT PRIMARY KEY,
  embedding vector(768),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Foreign key to compositions table
  CONSTRAINT fk_composition
    FOREIGN KEY (composition_id)
    REFERENCES compositions(id)
    ON DELETE CASCADE
);

-- Create index for efficient vector search using IVFFlat
-- IVFFlat is a good general-purpose index for datasets up to ~1M vectors
-- For larger datasets, consider HNSW index
CREATE INDEX IF NOT EXISTS idx_composition_embeddings_vector
  ON composition_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Create index for filtering by update time
CREATE INDEX IF NOT EXISTS idx_composition_embeddings_updated
  ON composition_embeddings (updated_at);

-- Create index for cascade deletes
CREATE INDEX IF NOT EXISTS idx_composition_embeddings_composition
  ON composition_embeddings (composition_id);

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL ON composition_embeddings TO your_app_user;
-- GRANT USAGE ON SCHEMA public TO your_app_user;
