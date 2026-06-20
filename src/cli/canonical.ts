#!/usr/bin/env bun
/**
 * Digital Pandharpur — Canonical Batch Processing CLI
 *
 * Usage:
 *   bun run canonical --action=backfill       # Create canonical records for all compositions
 *   bun run canonical --action=dedup          # Run dedup across all compositions
 *   bun run canonical --action=reconcile      # Full reconciliation pass
 *   bun run canonical --action=stats          # Show canonical stats
 *
 * Options:
 *   --dry-run          Don't write to DB (default: true for backfill/dedup)
 *   --type=ABHANG      Limit to specific composition type
 *   --limit=100        Max compositions to process
 *   --min-confidence=0.60  Minimum confidence threshold
 *   --verbose          Detailed logging
 *   --force            Actually write to DB (override dry-run)
 */

import { parseArgs } from 'util';
import { canonicalEngine } from '../canonical/canonical-engine';
import {
  getCompositionSummaries,
  getAllCanonicalRecords,
  getCanonicalStats,
  createCanonicalRecord,
  mergeIntoCanonical,
} from '../db/canonical';
import { CONFIDENCE_THRESHOLDS } from '../canonical/types';
import type { BatchConfig, BatchStats, CandidateGroup } from '../canonical/types';

// ─── CLI Parser ─────────────────────────────────────────────────────────────

interface CLIOptions {
  action: 'backfill' | 'dedup' | 'reconcile' | 'stats';
  dryRun: boolean;
  type?: string;
  limit: number;
  minConfidence: number;
  verbose: boolean;
  force: boolean;
}

function parseCLI(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    action: 'stats',
    dryRun: true,
    limit: Infinity,
    minConfidence: CONFIDENCE_THRESHOLDS.SUGGESTED,
    verbose: false,
    force: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--action=')) options.action = arg.split('=')[1] as any;
    if (arg.startsWith('--type=')) options.type = arg.split('=')[1];
    if (arg.startsWith('--limit=')) options.limit = parseInt(arg.split('=')[1], 10);
    if (arg.startsWith('--min-confidence=')) options.minConfidence = parseFloat(arg.split('=')[1]);
    if (arg === '--verbose') options.verbose = true;
    if (arg === '--force') { options.dryRun = false; options.force = true; }
    if (arg === '--dry-run') options.dryRun = true;
    if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: bun run canonical [options]

Actions:
  --action=backfill    Create canonical records for unmapped compositions
  --action=dedup       Find and merge duplicates across compositions
  --action=reconcile   Full reconciliation: backfill + dedup
  --action=stats       Show canonical system statistics (default)

Options:
  --dry-run            Preview without DB writes (default: true)
  --force              Actually write to DB (overrides dry-run)
  --type=ABHANG        Filter by composition type
  --limit=100          Max compositions to process
  --min-confidence=0.60  Minimum confidence threshold
  --verbose            Detailed per-item logging
  --help               Show this help
      `);
      process.exit(0);
    }
  }

  return options;
}

// ─── Actions ────────────────────────────────────────────────────────────────

async function actionBackfill(options: CLIOptions): Promise<void> {
  console.log(`\n📦 Canonical Backfill ${options.dryRun ? '(DRY RUN)' : ''}`);
  console.log('─'.repeat(60));

  const compositions = await getCompositionSummaries({
    skipCanonicalized: true,
    type: options.type,
    limit: options.limit,
  });

  console.log(`Unmapped compositions: ${compositions.length}`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const comp of compositions) {
    if (options.verbose) {
      console.log(`  [${created + skipped + errors + 1}/${compositions.length}] ${comp.title.slice(0, 50)}`);
    }

    try {
      if (!options.dryRun) {
        await createCanonicalRecord(comp.id);
      }
      created++;
    } catch (err) {
      console.error(`  ✗ Error: ${err instanceof Error ? err.message : String(err)}`);
      errors++;
    }

    if (created + skipped + errors >= options.limit) break;
  }

  console.log('─'.repeat(60));
  console.log(`Created: ${created} | Skipped: ${skipped} | Errors: ${errors}`);
}

async function actionDedup(options: CLIOptions): Promise<void> {
  console.log(`\n🔍 Canonical Dedup ${options.dryRun ? '(DRY RUN)' : ''}`);
  console.log('─'.repeat(60));

  const [compositions, canonicalRecords] = await Promise.all([
    getCompositionSummaries({
      skipCanonicalized: true,
      type: options.type,
      limit: options.limit,
    }),
    getAllCanonicalRecords({ type: options.type }),
  ]);

  console.log(`Unmapped compositions: ${compositions.length}`);
  console.log(`Existing canonical records: ${canonicalRecords.length}`);

  if (canonicalRecords.length === 0) {
    console.log('No canonical records exist yet. Run backfill first.');
    return;
  }

  const config: BatchConfig = {
    types: options.type ? [options.type] : undefined,
    minConfidence: options.minConfidence,
    limit: options.limit,
    skipCanonicalized: true,
    dryRun: options.dryRun,
    verbose: options.verbose,
  };

  const startTime = Date.now();
  let autoMerged = 0;
  let suggested = 0;
  let noMatch = 0;
  let errors = 0;

  for (let i = 0; i < compositions.length; i++) {
    const comp = compositions[i];
    if (options.verbose) {
      console.log(`  [${i + 1}/${compositions.length}] ${comp.title.slice(0, 50)}`);
    }

    try {
      const bestMatch = canonicalEngine.findBestMatch(comp, canonicalRecords);

      if (!bestMatch) {
        noMatch++;
        continue;
      }

      if (bestMatch.autoMerge) {
        autoMerged++;
        if (options.verbose) {
          console.log(`    → AUTO-MERGE (${(bestMatch.confidence * 100).toFixed(1)}%) → ${bestMatch.canonicalRecordId}`);
        }
        if (!options.dryRun) {
          await mergeIntoCanonical(
            comp.id,
            bestMatch.canonicalRecordId!,
            bestMatch.confidence,
            'auto_merge',
            'duplicate'
          );
        }
      } else {
        suggested++;
        if (options.verbose) {
          console.log(`    → SUGGESTED (${(bestMatch.confidence * 100).toFixed(1)}%) → ${bestMatch.canonicalRecordId}`);
        }
        if (!options.dryRun) {
          await mergeIntoCanonical(
            comp.id,
            bestMatch.canonicalRecordId!,
            bestMatch.confidence,
            'suggested_merge',
            'suspected'
          );
        }
      }
    } catch (err) {
      console.error(`  ✗ Error: ${err instanceof Error ? err.message : String(err)}`);
      errors++;
    }
  }

  const durationMs = Date.now() - startTime;

  console.log('─'.repeat(60));
  console.log(`Auto-merged:  ${autoMerged}`);
  console.log(`Suggested:    ${suggested}`);
  console.log(`No match:     ${noMatch}`);
  console.log(`Errors:       ${errors}`);
  console.log(`Duration:     ${(durationMs / 1000).toFixed(1)}s`);
}

async function actionReconcile(options: CLIOptions): Promise<void> {
  console.log(`\n🔄 Full Reconciliation ${options.dryRun ? '(DRY RUN)' : ''}`);
  console.log('─'.repeat(60));

  // Phase 1: Backfill — create canonical for everything
  await actionBackfill(options);

  // Phase 2: Dedup within canonicalized compositions
  console.log('\n── Phase 2: Dedup among existing canonical records ──');

  const canonicalRecords = await getAllCanonicalRecords({ type: options.type });
  console.log(`Canonical records to reconcile: ${canonicalRecords.length}`);

  // For reconciliation, we compare canonical records against each other
  // to find canonical records that should themselves be merged
  let merged = 0;
  let checked = 0;

  for (let i = 0; i < canonicalRecords.length; i++) {
    const record = canonicalRecords[i];
    // Compare against other canonical records of same type
    const others = canonicalRecords.filter((_, idx) => idx > i);

    if (others.length === 0) break;
    checked++;

    if (options.verbose) {
      console.log(`  [${i + 1}] ${record.title.slice(0, 50)} (${record.id.slice(0, 8)}...)`);
    }

    // Use the engine to find matches (treat canonical as composition)
    const comp = {
      id: record.id,
      title: record.title,
      fullText: record.canonicalText,
      type: record.type,
      saintId: record.saintId,
      source: undefined,
    };
    // We check by composing temporarily
    // Actually we need to compare canonical vs canonical — reuse the matching
    for (const other of others) {
      const otherComp = {
        id: other.id,
        title: other.title,
        fullText: other.canonicalText,
        type: other.type,
        saintId: other.saintId,
        source: undefined,
      };

      const matches = canonicalEngine.findMatches(comp, [other]);
      if (matches.length > 0 && matches[0].autoMerge) {
        merged++;
        if (options.verbose) {
          console.log(`    → CANONICAL MERGE: ${other.id.slice(0, 8)}... (${(matches[0].confidence * 100).toFixed(1)}%)`);
        }
      }
    }
  }

  console.log('─'.repeat(60));
  console.log(`Canonical records checked: ${checked}`);
  console.log(`Potential canonical merges: ${merged}`);
  console.log('Note: Canonical-record-to-canonical-record merges require manual review.');
}

async function actionStats(): Promise<void> {
  const stats = await getCanonicalStats();

  console.log('\n📊 Canonical System Statistics');
  console.log('─'.repeat(60));
  console.log(`Total canonical records:    ${stats.totalRecords}`);
  console.log(`Mapped compositions:        ${stats.totalMappedCompositions}`);
  console.log(`Unmapped compositions:      ${stats.totalUnmappedCompositions}`);
  console.log(`Auto-merged mappings:       ${stats.autoMergedCount}`);
  console.log(`Pending review mappings:    ${stats.pendingReviewCount}`);
  console.log('');

  if (Object.keys(stats.typeBreakdown).length > 0) {
    console.log('By type:');
    for (const [type, count] of Object.entries(stats.typeBreakdown)) {
      console.log(`  ${type.padEnd(15)} ${count}`);
    }
  }

  // Show reconciliation health
  if (stats.totalRecords > 0) {
    const healthPct = ((stats.autoMergedCount / stats.totalMappedCompositions) * 100).toFixed(1);
    console.log(`\nHealth: ${healthPct}% of mappings auto-merged`);
    if (stats.pendingReviewCount > 0) {
      console.log(`⚠  ${stats.pendingReviewCount} mappings need review`);
    }
  } else {
    console.log('\n⚠  No canonical records exist yet. Run backfill first:');
    console.log('   bun run canonical --action=backfill --force');
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const options = parseCLI();

  switch (options.action) {
    case 'backfill':
      await actionBackfill(options);
      break;
    case 'dedup':
      await actionDedup(options);
      break;
    case 'reconcile':
      await actionReconcile(options);
      break;
    case 'stats':
      await actionStats();
      break;
    default:
      console.error(`Unknown action: ${options.action}`);
      process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
