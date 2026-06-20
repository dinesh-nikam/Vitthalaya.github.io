-- Digital Pandharpur — PostgreSQL Partitioning DDL for 10M+ Compositions
-- 
-- Performance optimization strategy:
-- 1. Partition "compositions" by LIST using the "type" field.
-- 2. Partition "canonical_source_mappings" by HASH using the "canonical_id" field (4 partitions).
-- 3. Set up indexes on partition tables for fast query routing.

-- ============================================================================
-- 1. Create Partitioned Compositions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS compositions_partitioned (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    title_marathi VARCHAR(200) NOT NULL,
    title_transliteration VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL, -- list partition key
    full_text TEXT NOT NULL,
    meaning TEXT,
    saint_id UUID,
    deity_id UUID,
    region VARCHAR(50),
    source_attribution TEXT,
    source_url TEXT,
    audio_links JSONB,
    is_verified BOOLEAN DEFAULT FALSE,
    canonical_id UUID,
    content_hash VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (id, type) -- Composite primary key required for partitioning
) PARTITION BY LIST (type);

-- Create Partitions for each Composition Type
CREATE TABLE compositions_abhang PARTITION OF compositions_partitioned FOR VALUES IN ('abhang');
CREATE TABLE compositions_bhajan PARTITION OF compositions_partitioned FOR VALUES IN ('bhajan');
CREATE TABLE compositions_aarti PARTITION OF compositions_partitioned FOR VALUES IN ('aarti');
CREATE TABLE compositions_stotra PARTITION OF compositions_partitioned FOR VALUES IN ('stotra');
CREATE TABLE compositions_haripath PARTITION OF compositions_partitioned FOR VALUES IN ('haripath');
CREATE TABLE compositions_gaulani PARTITION OF compositions_partitioned FOR VALUES IN ('gaulani');
CREATE TABLE compositions_bharud PARTITION OF compositions_partitioned FOR VALUES IN ('bharud');
CREATE TABLE compositions_kirtan PARTITION OF compositions_partitioned FOR VALUES IN ('kirtan');
CREATE TABLE compositions_powada PARTITION OF compositions_partitioned FOR VALUES IN ('powada');
CREATE TABLE compositions_default PARTITION OF compositions_partitioned DEFAULT;

-- Indexes on Partitioned Compositions
CREATE INDEX idx_comp_part_slug ON compositions_partitioned(slug);
CREATE INDEX idx_comp_part_saint ON compositions_partitioned(saint_id);
CREATE INDEX idx_comp_part_deity ON compositions_partitioned(deity_id);
CREATE INDEX idx_comp_part_canonical ON compositions_partitioned(canonical_id);
CREATE INDEX idx_comp_part_hash ON compositions_partitioned(content_hash);
CREATE INDEX idx_comp_part_created ON compositions_partitioned(created_at);

-- ============================================================================
-- 2. Create Partitioned Canonical Source Mappings Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS canonical_source_mappings_partitioned (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    canonical_id UUID NOT NULL, -- hash partition key
    composition_id UUID,
    source VARCHAR(255) NOT NULL,
    source_url TEXT NOT NULL,
    source_title VARCHAR(255) NOT NULL,
    source_text TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    confidence_score DOUBLE PRECISION NOT NULL,
    mapping_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (id, canonical_id)
) PARTITION BY HASH (canonical_id);

-- Create 4 Hash Partitions
CREATE TABLE canonical_source_mappings_p0 PARTITION OF canonical_source_mappings_partitioned FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE canonical_source_mappings_p1 PARTITION OF canonical_source_mappings_partitioned FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE canonical_source_mappings_p2 PARTITION OF canonical_source_mappings_partitioned FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE canonical_source_mappings_p3 PARTITION OF canonical_source_mappings_partitioned FOR VALUES WITH (MODULUS 4, REMAINDER 3);

-- Indexes on Partitioned Source Mappings
CREATE INDEX idx_csm_part_canonical ON canonical_source_mappings_partitioned(canonical_id);
CREATE INDEX idx_csm_part_composition ON canonical_source_mappings_partitioned(composition_id);
CREATE INDEX idx_csm_part_hash ON canonical_source_mappings_partitioned(content_hash);

-- ============================================================================
-- 3. Migration Instructions (to be run manually during maintenance window)
-- ============================================================================
--
-- -- Step 1: Copy existing data
-- INSERT INTO compositions_partitioned (id, title_marathi, title_transliteration, slug, type, full_text, meaning, saint_id, deity_id, region, source_attribution, audio_links, is_verified, canonical_id, content_hash, created_at, updated_at)
-- SELECT id, title_marathi, title_transliteration, slug, LOWER(type), full_text, meaning, saint_id, deity_id, region, source_attribution, audio_links, is_verified, canonical_id, content_hash, created_at, updated_at 
-- FROM compositions;
--
-- INSERT INTO canonical_source_mappings_partitioned (id, canonical_id, composition_id, source, source_url, source_title, source_text, content_hash, confidence_score, mapping_type, created_at)
-- SELECT id, canonical_id, composition_id, source, source_url, source_title, source_text, content_hash, confidence_score, mapping_type, created_at
-- FROM canonical_source_mappings;
--
-- -- Step 2: Swap tables
-- ALTER TABLE compositions RENAME TO compositions_old;
-- ALTER TABLE compositions_partitioned RENAME TO compositions;
--
-- ALTER TABLE canonical_source_mappings RENAME TO canonical_source_mappings_old;
-- ALTER TABLE canonical_source_mappings_partitioned RENAME TO canonical_source_mappings;
--
-- -- Step 3: Re-create foreign keys (defer until verified)
-- -- ALTER TABLE compositions ADD CONSTRAINT fk_compositions_saint FOREIGN KEY (saint_id) REFERENCES saints(id);
-- -- ALTER TABLE compositions ADD CONSTRAINT fk_compositions_deity FOREIGN KEY (deity_id) REFERENCES deities(id);
