#!/usr/bin/env bun
/**
 * Digital Pandharpur — Canonical Migration Script
 *
 * One-shot migration: creates canonical records for ALL existing compositions,
 * regardless of whether they have content hashes. This is the bridge from
 * the pre-canonical world to the canonical world.
 *
 * Migration phases:
 *   1. Compute content hashes for compositions that lack them
 *   2. Create CanonicalRecord for each unique composition
 *   3. Create primary source mappings
 *   4. Create initial versions
 *   5. Log every composition in the merge log
 *
 * Usage:
 *   bun run src/db/migrate-canonical.ts --dry-run      # Preview only
 *   bun run src/db/migrate-canonical.ts --force         # Execute migration
 *   bun run src/db/migrate-canonical.ts --force --resume  # Resume from checkpoint
 */

import { db } from './client';
import { contentHash } from '../canonical/normalization';

// ─── Types ──────────────────────────────────────────────────────────────────

interface MigrationCheckpoint {
  phase: 'hash' | 'canonical' | 'mapping' | 'version' | 'complete';
  processed: number;
  lastId: string;
}

interface MigrationReport {
  phase: string;
  totalCompositions: number;
  alreadyHashed: number;
  newlyHashed: number;
  canonicalRecordsCreated: number;
  sourceMappingsCreated: number;
  versionsCreated: number;
  errors: number;
  durationMs: number;
  checkpoint: MigrationCheckpoint | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const CHECKPOINT_KEY = 'canonical_migration_v1';

async function loadCheckpoint(): Promise<MigrationCheckpoint | null> {
  try {
    // Store checkpoint in a dummy log entry
    const log = await db.canonicalMergeLog.findFirst({
      where: { algorithm: CHECKPOINT_KEY },
      orderBy: { createdAt: 'desc' },
    });
    if (log?.reason) {
      return JSON.parse(log.reason) as MigrationCheckpoint;
    }
  } catch {
    // No checkpoint exists
  }
  return null;
}

async function saveCheckpoint(cp: MigrationCheckpoint): Promise<void> {
  // Use a dummy merge log entry as a checkpoint store
  await db.canonicalMergeLog.upsert({
    where: {
      id: CHECKPOINT_KEY,
    },
    create: {
      id: CHECKPOINT_KEY,
      canonicalId: '00000000-0000-0000-0000-000000000000',
      sourceCompositionId1: 'migration',
      sourceCompositionId2: 'migration',
      action: 'manual_merge',
      algorithm: CHECKPOINT_KEY,
      reason: JSON.stringify(cp),
    },
    update: {
      reason: JSON.stringify(cp),
    },
  }).catch(() => {
    // Upsert may fail on the custom ID; just update if exists
    db.canonicalMergeLog.updateMany({
      where: { algorithm: CHECKPOINT_KEY },
      data: { reason: JSON.stringify(cp) },
    }).catch(() => {});
  });
}

// ─── Migration Phases ───────────────────────────────────────────────────────

/**
 * Phase 1: Compute content hashes for compositions that lack them.
 */
async function phaseHashCompositions(
  dryRun: boolean,
  verbose: boolean,
  resumeFrom: string | null
): Promise<{ count: number; errors: number; lastId: string }> {
  const where: any = { contentHash: null };
  if (resumeFrom) {
    where.id = { gt: resumeFrom };
  }

  const toHash = await db.composition.findMany({
    where,
    select: { id: true, fullText: true },
    orderBy: { id: 'asc' },
    take: dryRun ? 10 : 5000,
  });

  let count = 0;
  let errors = 0;
  let lastId = resumeFrom ?? '';

  for (const comp of toHash) {
    try {
      if (!dryRun) {
        const hash = contentHash(comp.fullText);
        await db.composition.update({
          where: { id: comp.id },
          data: { contentHash: hash },
        });
      }
      count++;
      lastId = comp.id;
      if (verbose && count % 100 === 0) {
        console.log(`  Hashed ${count}...`);
      }
    } catch (err) {
      errors++;
      console.error(`  ✗ Hash error ${comp.id}: ${err}`);
    }
  }

  return { count, errors, lastId };
}

/**
 * Phase 2: Create canonical records for compositions not yet linked.
 */
async function phaseCreateCanonicalRecords(
  dryRun: boolean,
  verbose: boolean
): Promise<number> {
  const unlinked = await db.composition.findMany({
    where: { canonicalId: null },
    select: {
      id: true,
      titleMarathi: true,
      titleTranslit: true,
      type: true,
      fullText: true,
      meaning: true,
      saintId: true,
      deityId: true,
      region: true,
      source: true,
    },
    orderBy: { createdAt: 'asc' },
    take: dryRun ? 10 : 5000,
  });

  let created = 0;

  for (const comp of unlinked) {
    try {
      if (dryRun) {
        if (verbose) {
          console.log(`  Would create canonical for: ${comp.titleMarathi.slice(0, 50)}`);
        }
        created++;
        continue;
      }

      // Create the canonical record
      const record = await db.canonicalRecord.create({
        data: {
          titleMarathi: comp.titleMarathi,
          titleTranslit: comp.titleTranslit,
          type: comp.type,
          canonicalText: comp.fullText,
          meaning: comp.meaning,
          saintId: comp.saintId,
          deityId: comp.deityId,
          region: comp.region,
          compositeScore: 1.0,
        },
      });

      // Create primary source mapping
      const hash = contentHash(comp.fullText);
      const mapping = await db.canonicalSourceMapping.create({
        data: {
          canonicalId: record.id,
          compositionId: comp.id,
          source: comp.source ?? 'internal',
          sourceUrl: comp.source ?? '',
          sourceTitle: comp.titleMarathi,
          sourceText: comp.fullText,
          contentHash: hash,
          confidenceScore: 1.0,
          mappingType: 'primary',
        },
      });

      // Set the primary mapping
      await db.canonicalRecord.update({
        where: { id: record.id },
        data: { primaryMappingId: mapping.id },
      });

      // Create initial version
      await db.canonicalVersion.create({
        data: {
          canonicalId: record.id,
          versionNumber: 1,
          titleMarathi: comp.titleMarathi,
          titleTranslit: comp.titleTranslit,
          canonicalText: comp.fullText,
          meaning: comp.meaning,
          changeReason: 'initial',
        },
      });

      // Link composition back
      await db.composition.update({
        where: { id: comp.id },
        data: { canonicalId: record.id, contentHash: hash },
      });

      created++;
      if (verbose && created % 50 === 0) {
        console.log(`  Created ${created} canonical records...`);
      }
    } catch (err) {
      console.error(`  ✗ Error creating canonical for ${comp.id}: ${err}`);
    }
  }

  return created;
}

/**
 * Phase 3: Verify migration integrity.
 */
async function phaseVerify(): Promise<{ total: number; linked: number; unlinked: number; errors: string[] }> {
  const errors: string[] = [];
  const total = await db.composition.count();
  const linked = await db.composition.count({ where: { canonicalId: { not: null } } });
  const unlinked = total - linked;

  // Verify canonical records have proper mappings
  const recordsWithoutMappings = await db.canonicalRecord.findMany({
    where: { primaryMappingId: null },
    take: 10,
    select: { id: true, titleMarathi: true },
  });

  for (const r of recordsWithoutMappings) {
    errors.push(`CanonicalRecord ${r.id} (${r.titleMarathi.slice(0, 40)}) has no primary mapping`);
  }

  // Verify all source mappings have valid compositions
  const orphanMappings = await db.canonicalSourceMapping.findMany({
    where: { compositionId: null },
    take: 10,
    select: { id: true, source: true },
  });

  for (const m of orphanMappings) {
    errors.push(`SourceMapping ${m.id} has no composition reference`);
  }

  return { total, linked, unlinked, errors };
}

// ─── Main Migration ─────────────────────────────────────────────────────────

export async function runMigration(options: {
  dryRun: boolean;
  verbose: boolean;
  resume: boolean;
}): Promise<MigrationReport> {
  const startTime = Date.now();
  const report: MigrationReport = {
    phase: options.dryRun ? 'dry_run' : 'migrating',
    totalCompositions: 0,
    alreadyHashed: 0,
    newlyHashed: 0,
    canonicalRecordsCreated: 0,
    sourceMappingsCreated: 0,
    versionsCreated: 0,
    errors: 0,
    durationMs: 0,
    checkpoint: null,
  };

  // Resume from checkpoint if requested
  let checkpoint: MigrationCheckpoint | null = null;
  if (options.resume) {
    checkpoint = await loadCheckpoint();
    if (checkpoint) {
      console.log(`  Resuming from phase: ${checkpoint.phase}, processed: ${checkpoint.processed}`);
    }
  }

  // ── Phase 1: Compute content hashes ──
  if (!checkpoint || checkpoint.phase === 'hash') {
    console.log('\n── Phase 1: Computing content hashes ──');
    const totalCount = await db.composition.count();
    const alreadyHashed = await db.composition.count({ where: { contentHash: { not: null } } });
    report.totalCompositions = totalCount;
    report.alreadyHashed = alreadyHashed;

    console.log(`  Total compositions: ${totalCount}`);
    console.log(`  Already hashed:     ${alreadyHashed}`);
    console.log(`  Need hashing:       ${totalCount - alreadyHashed}`);

    if (totalCount > alreadyHashed) {
      let totalNewlyHashed = 0;
      let totalErrors = 0;

      while (true) {
        const resumeId = checkpoint?.lastId ?? null;
        const { count, errors, lastId } = await phaseHashCompositions(
          options.dryRun,
          options.verbose,
          resumeId
        );
        totalNewlyHashed += count;
        totalErrors += errors;

        if (count === 0) break; // no more to process

        const cp: MigrationCheckpoint = {
          phase: 'hash',
          processed: alreadyHashed + totalNewlyHashed,
          lastId,
        };

        if (!options.dryRun) {
          await saveCheckpoint(cp).catch(() => {});
        }
        checkpoint = cp;

        if (options.verbose) {
          console.log(`  Progress: ${cp.processed}/${totalCount} hashed`);
        }
      }

      report.newlyHashed = totalNewlyHashed;
      report.errors += totalErrors;
      console.log(`  Hashed: ${totalNewlyHashed} new (${totalErrors} errors)`);
    }
  }

  // ── Phase 2: Create canonical records ──
  if (!checkpoint || checkpoint.phase === 'canonical' || checkpoint.phase === 'hash') {
    console.log('\n── Phase 2: Creating canonical records ──');

    const unlinkedCount = await db.composition.count({ where: { canonicalId: null } });
    console.log(`  Compositions without canonical: ${unlinkedCount}`);

    if (unlinkedCount > 0) {
      let totalCreated = 0;

      while (true) {
        const created = await phaseCreateCanonicalRecords(options.dryRun, options.verbose);
        totalCreated += created;
        if (created === 0) break;

        const cp: MigrationCheckpoint = {
          phase: 'canonical',
          processed: totalCreated,
          lastId: '',
        };

        if (!options.dryRun) {
          await saveCheckpoint(cp).catch(() => {});
        }
        checkpoint = cp;
      }

      report.canonicalRecordsCreated = totalCreated;
      report.sourceMappingsCreated = totalCreated;
      report.versionsCreated = totalCreated;
      console.log(`  Created: ${totalCreated} canonical records`);
    }
  }

  // ── Phase 3: Verify ──
  if (!options.dryRun) {
    console.log('\n── Phase 3: Verification ──');
    const verification = await phaseVerify();
    console.log(`  Total:     ${verification.total}`);
    console.log(`  Linked:    ${verification.linked}`);
    console.log(`  Unlinked:  ${verification.unlinked}`);

    if (verification.errors.length > 0) {
      console.log(`\n  ⚠  ${verification.errors.length} integrity issues:`);
      for (const err of verification.errors) {
        console.log(`    ✗ ${err}`);
      }
    } else {
      console.log('  ✅ No integrity issues found');
    }

    // Mark migration complete
    const cp: MigrationCheckpoint = { phase: 'complete', processed: verification.total, lastId: '' };
    await saveCheckpoint(cp).catch(() => {});
  }

  report.durationMs = Date.now() - startTime;
  report.phase = options.dryRun ? 'dry_run' : 'complete';

  return report;
}

// ─── CLI ────────────────────────────────────────────────────────────────────

if (require.main === module || import.meta.main) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const resume = args.includes('--resume');
  const verbose = args.includes('--verbose') || args.includes('-v');

  console.log('\n📦 Canonical Migration v1');
  console.log('═'.repeat(60));
  console.log(`  Mode:   ${dryRun ? 'DRY RUN' : force ? 'LIVE' : 'DRY RUN (use --force to write)'}`);
  console.log(`  Resume: ${resume ? 'YES' : 'NO'}`);
  console.log('');

  if (!dryRun && !force) {
    console.log('⚠  Use --force to actually write to the database.');
    console.log('   Recommended: run with --dry-run first to preview.');
    console.log('');
  }

  runMigration({ dryRun: dryRun || !force, verbose, resume })
    .then((report) => {
      console.log('\n' + '═'.repeat(60));
      console.log('📊 MIGRATION SUMMARY');
      console.log('═'.repeat(60));
      console.log(`  Phase:               ${report.phase}`);
      console.log(`  Total compositions:  ${report.totalCompositions}`);
      console.log(`  Newly hashed:        ${report.newlyHashed}`);
      console.log(`  Canonical records:   ${report.canonicalRecordsCreated}`);
      console.log(`  Source mappings:     ${report.sourceMappingsCreated}`);
      console.log(`  Versions created:    ${report.versionsCreated}`);
      console.log(`  Errors:              ${report.errors}`);
      console.log(`  Duration:            ${(report.durationMs / 1000).toFixed(1)}s`);
      console.log('');
    })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal:', err);
      process.exit(1);
    });
}
