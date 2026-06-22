/**
 * Knowledge Graph Builder
 *
 * Discovers relationships from existing database tables and creates
 * EntityGraphEdge entries for the knowledge graph.
 *
 * Usage: bun run scripts/build-graph.ts [--dry-run]
 *
 * Relationship mapping:
 *   Composition.saintId       → composed_by / composed
 *   Composition.deityId       → dedicated_to (self-inverse)
 *   Composition ↔ Festival    → related_to_festival / celebrates_deity
 *   Composition ↔ Category    → categorized_as (self-inverse)
 *   Saint.birthRegionId       → born_in / region_associated_saint
 *   SaintRelation             → related_to_saint (self-inverse)
 */

import { db } from '../src/db/client';
import { bulkImportEdges, deleteEdgesForEntity } from '../src/knowledge-graph/relationship-engine';
import type { EntityType, RelationshipType } from '../src/knowledge-graph/graph-ontology';

const DRY_RUN = process.argv.includes('--dry-run');

interface EdgeToCreate {
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;
  relationship: RelationshipType;
  weight?: number;
}

async function buildGraph(): Promise<void> {
  console.log('🔍 Knowledge Graph Builder');
  console.log(`   Dry run: ${DRY_RUN}`);
  console.log();

  const allEdges: EdgeToCreate[] = [];

  // ── 1. Composition ↔ Saint ──────────────────────────────────────────────
  console.log('1. Composition ↔ Saint...');
  const compositions = await db.composition.findMany({
    where: { saintId: { not: null } },
    select: { id: true, saintId: true },
  });
  for (const comp of compositions) {
    if (!comp.saintId) continue;
    allEdges.push(
      { sourceType: 'composition', sourceId: comp.id, targetType: 'saint', targetId: comp.saintId, relationship: 'composed_by' as RelationshipType },
      { sourceType: 'saint', sourceId: comp.saintId, targetType: 'composition', targetId: comp.id, relationship: 'composed' as RelationshipType },
    );
  }
  console.log(`   → ${compositions.length} composition-saint edges`);

  // ── 2. Composition ↔ Deity ──────────────────────────────────────────────
  console.log('2. Composition ↔ Deity...');
  const compDeities = await db.composition.findMany({
    where: { deityId: { not: null } },
    select: { id: true, deityId: true },
  });
  for (const comp of compDeities) {
    if (!comp.deityId) continue;
    allEdges.push(
      { sourceType: 'composition', sourceId: comp.id, targetType: 'deity', targetId: comp.deityId, relationship: 'dedicated_to' as RelationshipType },
    );
  }
  console.log(`   → ${compDeities.length} composition-deity edges`);

  // ── 3. Composition ↔ Festival ────────────────────────────────────────────
  console.log('3. Composition ↔ Festival...');
  const festComps = await db.festivalComposition.findMany({
    select: { compositionId: true, festivalId: true },
  });
  for (const fc of festComps) {
    allEdges.push(
      { sourceType: 'composition', sourceId: fc.compositionId, targetType: 'festival', targetId: fc.festivalId, relationship: 'related_to_festival' as RelationshipType },
      { sourceType: 'festival', sourceId: fc.festivalId, targetType: 'composition', targetId: fc.compositionId, relationship: 'contains_composition' as RelationshipType },
    );
  }
  console.log(`   → ${festComps.length} composition-festival edge pairs`);

  // ── 4. Composition ↔ Category ────────────────────────────────────────────
  console.log('4. Composition ↔ Category...');
  const catComps = await db.categoryComposition.findMany({
    select: { compositionId: true, categoryId: true },
  });
  for (const cc of catComps) {
    allEdges.push(
      { sourceType: 'composition', sourceId: cc.compositionId, targetType: 'category', targetId: cc.categoryId, relationship: 'categorized_as' as RelationshipType },
    );
  }
  console.log(`   → ${catComps.length} composition-category edges`);

  // ── 5. Saint ↔ Region (via region field) ──────────────────────────────
  // Region entity model not yet in schema; skipped.
  console.log('5. Saint ↔ Region... (skipped — no Region model)');

  // ── 6. Saint ↔ Related Saint ─────────────────────────────────────────────
  console.log('6. Saint ↔ Saint (relations)...');
  const saintRels = await db.saintRelation.findMany({
    select: { saintId: true, relatedSaintId: true, relationshipType: true },
  });
  for (const rel of saintRels) {
    allEdges.push(
      {
        sourceType: 'saint', sourceId: rel.saintId,
        targetType: 'saint', targetId: rel.relatedSaintId,
        relationship: 'related_to_saint' as RelationshipType,
        weight: rel.relationshipType === 'guru' ? 2.0 : rel.relationshipType === 'disciple' ? 1.5 : 1.0,
      },
    );
  }
  console.log(`   → ${saintRels.length} saint-saint edges`);

  // ── Summary & Import ────────────────────────────────────────────────────
  console.log();
  const totalEdges = allEdges.length;
  console.log(`📊 Total edges to create: ${totalEdges}`);

  // Count by relationship type
  const byRel = new Map<string, number>();
  for (const e of allEdges) {
    byRel.set(e.relationship, (byRel.get(e.relationship) || 0) + 1);
  }
  console.log('   By relationship:');
  for (const [rel, count] of [...byRel.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`     ${rel}: ${count}`);
  }

  if (DRY_RUN) {
    console.log('\n⚠️  Dry run — no changes made.');
    process.exit(0);
  }

  // Clear existing edges
  console.log('\n🧹 Clearing existing graph edges...');
  // Use raw SQL for efficient bulk delete
  await db.$executeRawUnsafe(`DELETE FROM entity_graph_edges`);
  console.log('   Done.');

  // Import in batches of 500
  console.log('📦 Importing edges...');
  const BATCH_SIZE = 500;
  for (let i = 0; i < allEdges.length; i += BATCH_SIZE) {
    const batch = allEdges.slice(i, i + BATCH_SIZE);
    await bulkImportEdges(batch);
    process.stdout.write(`   ${Math.min(i + BATCH_SIZE, allEdges.length)} / ${allEdges.length} edges imported\r`);
  }
  console.log(`\n   ✅ All ${allEdges.length} edges imported successfully.`);

  // Verify
  const count = await db.entityGraphEdge.count();
  console.log(`\n🔎 Verification: ${count} edges in database.`);

  await db.$disconnect();
}

buildGraph().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
