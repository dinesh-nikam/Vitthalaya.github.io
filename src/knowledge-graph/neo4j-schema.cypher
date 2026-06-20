/**
 * Digital Pandharpur — Neo4j Knowledge Graph Schema
 *
 * Alternative native graph database schema using Neo4j.
 * Use this when graph traversal performance (especially multi-hop)
 * becomes a bottleneck in PostgreSQL.
 *
 * Deploy:
 *   1. Install Neo4j (or use AuraDB)
 *   2. Run: cypher-shell -f src/knowledge-graph/neo4j-schema.cypher
 *   3. Import data via the relationship-engine Neo4j adapter
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. CONSTRAINTS (uniqueness + index optimization)
// ═══════════════════════════════════════════════════════════════════════════

CREATE CONSTRAINT saint_id IF NOT EXISTS FOR (n:Saint) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT saint_slug IF NOT EXISTS FOR (n:Saint) REQUIRE n.slug IS UNIQUE;

CREATE CONSTRAINT composition_id IF NOT EXISTS FOR (n:Composition) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT composition_slug IF NOT EXISTS FOR (n:Composition) REQUIRE n.slug IS UNIQUE;

CREATE CONSTRAINT deity_id IF NOT EXISTS FOR (n:Deity) REQUIRE n.id IS UNIQUE;

CREATE CONSTRAINT festival_id IF NOT EXISTS FOR (n:Festival) REQUIRE n.id IS UNIQUE;

CREATE CONSTRAINT temple_id IF NOT EXISTS FOR (n:Temple) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT temple_slug IF NOT EXISTS FOR (n:Temple) REQUIRE n.slug IS UNIQUE;

CREATE CONSTRAINT category_id IF NOT EXISTS FOR (n:Category) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT category_slug IF NOT EXISTS FOR (n:Category) REQUIRE n.slug IS UNIQUE;

CREATE CONSTRAINT region_id IF NOT EXISTS FOR (n:Region) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT region_slug IF NOT EXISTS FOR (n:Region) REQUIRE n.slug IS UNIQUE;

CREATE CONSTRAINT audio_id IF NOT EXISTS FOR (n:Audio) REQUIRE n.id IS UNIQUE;

CREATE CONSTRAINT book_id IF NOT EXISTS FOR (n:Book) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT book_slug IF NOT EXISTS FOR (n:Book) REQUIRE n.slug IS UNIQUE;
CREATE CONSTRAINT book_isbn IF NOT EXISTS FOR (n:Book) REQUIRE n.isbn IS UNIQUE;

// ═══════════════════════════════════════════════════════════════════════════
// 2. INDEXES (for property-based lookups)
// ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX saint_name_marathi IF NOT EXISTS FOR (n:Saint) ON (n.nameMarathi);
CREATE INDEX composition_type IF NOT EXISTS FOR (n:Composition) ON (n.type);
CREATE INDEX deity_name IF NOT EXISTS FOR (n:Deity) ON (n.nameMarathi);
CREATE INDEX temple_name IF NOT EXISTS FOR (n:Temple) ON (n.nameMarathi);
CREATE INDEX region_name IF NOT EXISTS FOR (n:Region) ON (n.nameMarathi);
CREATE INDEX audio_title IF NOT EXISTS FOR (n:Audio) ON (n.titleMarathi);

// ═══════════════════════════════════════════════════════════════════════════
// 3. RELATIONSHIP TYPES (declared for documentation — Neo4j creates on use)
// ═══════════════════════════════════════════════════════════════════════════
//
// :COMPOSED         Saint → Composition
// :COMPOSED_BY      Composition → Saint
// :DEDICATED_TO     Composition → Deity (also Temple → Deity)
// :WORSHIPPED_AT    Deity → Temple
// :WORSHIPPED_BY    Saint → Deity
// :VISITED          Saint → Temple
// :BORN_IN          Saint → Region
// :LOCATED_IN       Temple → Region
// :HELD_AT          Festival → Temple
// :CELEBRATES       Festival → Deity
// :CELEBRATED_IN    Deity → Festival
// :RECORDED_IN      Composition → Audio
// :RECORDING_OF     Audio → Composition
// :PUBLISHED_IN     Composition → Book
// :CONTAINS         Book → Composition
// :CATEGORIZED_AS   Composition → Category
// :ORIGINATES_FROM  Composition → Region
// :RELATED_TO       Saint → Saint
// :ASSOCIATED_WITH  Deity → Region | Temple → Saint

// ═══════════════════════════════════════════════════════════════════════════
// 4. EXAMPLE QUERIES (for reference)
// ═══════════════════════════════════════════════════════════════════════════

// ── 4a. All compositions by Tukaram ──
// MATCH (s:Saint {slug: 'tukaram'})-[:COMPOSED]->(c:Composition)
// RETURN c.titleMarathi, c.type
// ORDER BY c.titleMarathi

// ── 4b. Full path: saint → composition → deity → temple → region ──
// MATCH path = (s:Saint {slug: 'tukaram'})-[:COMPOSED]->(c:Composition)
//   -[:DEDICATED_TO]->(d:Deity)-[:WORSHIPPED_AT]->(t:Temple)-[:LOCATED_IN]->(r:Region)
// RETURN path LIMIT 20

// ── 4c. Recommendations: "saints related to Tukaram" ──
// MATCH (s:Saint {slug: 'tukaram'})-[:RELATED_TO]-(related:Saint)
// RETURN related.nameMarathi, related.period

// ── 4d. Temples visited by a saint ──
// MATCH (s:Saint {nameMarathi: 'एकनाथ'})-[:VISITED]->(t:Temple)
// RETURN t.nameMarathi, t.location

// ── 4e. Compositions for Ashadhi Ekadashi ──
// MATCH (f:Festival {slug: 'ashadhi-ekadashi'})<-[:RELATED_TO_FESTIVAL]-(c:Composition)
// RETURN c.titleMarathi ORDER BY c.titleMarathi

// ── 4f. Multi-hop: what festivals are associated with Tukaram's compositions? ──
// MATCH (s:Saint {slug: 'tukaram'})-[:COMPOSED]->(c:Composition)
//   -[:RELATED_TO_FESTIVAL]->(f:Festival)
// RETURN f.nameMarathi, count(c) AS compositionCount
// ORDER BY compositionCount DESC

// ── 4g. Regional clusters: all entities in Pandharpur ──
// MATCH (r:Region {slug: 'pandharpur'})<-[:LOCATED_IN|BORN_IN|ORIGINATES_FROM]-(entity)
// RETURN labels(entity) AS type, entity.nameMarathi

// ── 4h. Book contents: all compositions in a book ──
// MATCH (b:Book {slug: 'sri-tukaram-gatha'})-[:CONTAINS]->(c:Composition)
// RETURN c.titleMarathi ORDER BY c.titleMarathi

// ── 4i. Audio for a specific composition ──
// MATCH (c:Composition {slug: 'kaya-hi-pandhari'})<-[:RECORDING_OF]-(a:Audio)
// RETURN a.titleMarathi, a.performer, a.audioUrl

// ═══════════════════════════════════════════════════════════════════════════
// 5. MIGRATION FROM POSTGRESQL (bulk insert pattern)
// ═══════════════════════════════════════════════════════════════════════════
//
// -- Saints
// LOAD CSV WITH HEADERS FROM 'file:///saints.csv' AS row
// CREATE (s:Saint {
//   id: row.id,
//   nameMarathi: row.name_marathi,
//   nameTranslit: row.name_transliteration,
//   slug: row.slug,
//   period: row.period,
//   biography: row.biography,
//   region: row.region
// });
//
// -- Relationships (from entity_graph_edges)
// LOAD CSV WITH HEADERS FROM 'file:///edges.csv' AS row
// MATCH (source {id: row.source_id})
// MATCH (target {id: row.target_id})
// CALL apoc.create.relationship(source, row.relationship, {}, target)
// YIELD rel
// RETURN count(*);
