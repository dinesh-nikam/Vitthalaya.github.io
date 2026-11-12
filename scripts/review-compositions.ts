#!/usr/bin/env bun
/**
 * Digital Pandharpur — Automated Composition & Daily Reviewer CLI
 *
 * Scans compositions and daily features for:
 * 1. Stories stored/rendered as abhang verses (STORY_IN_ABHANG).
 * 2. Embedded meaning ('अर्थ:' / 'भावार्थ:') inside fullText (EMBEDDED_MEANING).
 * 3. Generic scraper titles ('संत एकनाथ गाथा अभंग क्रमांक ८२', 'अभंग क्र. २७') (GENERIC_SCRAPER_TITLE).
 * 4. Misaligned saint references and Mudrika mismatches.
 *
 * Usage:
 *   bun run scripts/review-compositions.ts               # Audit mode (dry-run report)
 *   bun run scripts/review-compositions.ts --fix         # Automatically audit and fix all issues
 *   bun run scripts/review-compositions.ts --daily-only  # Review and fix daily features
 *   bun run scripts/review-compositions.ts --id <uuid>   # Review single composition
 *   bun run scripts/review-compositions.ts --limit 50    # Limit scan to 50 items
 */

import { PrismaClient } from '@prisma/client';
import {
  reviewAndFixCatalog,
  reviewAndFixDailyFeatures,
} from '../src/services/composition-reviewer.service';

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {
    fix: false,
    dailyOnly: false,
    id: undefined as string | undefined,
    limit: undefined as number | undefined,
    batchSize: 200,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--fix') {
      flags.fix = true;
    } else if (arg === '--daily-only') {
      flags.dailyOnly = true;
    } else if (arg === '--id' && args[i + 1]) {
      flags.id = args[++i];
    } else if (arg === '--limit' && args[i + 1]) {
      flags.limit = parseInt(args[++i], 10);
    } else if (arg === '--batch-size' && args[i + 1]) {
      flags.batchSize = parseInt(args[++i], 10);
    }
  }

  return flags;
}

async function main() {
  const flags = parseArgs();

  console.log('═'.repeat(65));
  console.log('  🔍 Digital Pandharpur — Composition Reviewer & Quality Gate');
  console.log('═'.repeat(65));
  console.log(`  Mode:        ${flags.fix ? '🔧 AUTOMATIC FIX MODE' : '👀 DRY-RUN AUDIT MODE'}`);
  if (flags.id) console.log(`  Target ID:   ${flags.id}`);
  if (flags.dailyOnly) console.log(`  Scope:       Daily features only`);
  if (flags.limit) console.log(`  Limit:       ${flags.limit}`);
  console.log('─'.repeat(65));

  // ── Step 1: Review Daily Features ──────────────────────────────────────────
  console.log('\n[1/2] Auditing Daily Features (slot: ABHANG)...');
  const dailyResult = await reviewAndFixDailyFeatures(prisma, { dryRun: !flags.fix });
  console.log(`  Scanned: ${dailyResult.scanned} daily abhang features`);
  console.log(`  Anomalies identified: ${dailyResult.fixed}`);
  for (const item of dailyResult.details.slice(0, 5)) {
    console.log(`    • [${item.id}] ${item.title} -> ${item.action}`);
  }
  if (dailyResult.details.length > 5) {
    console.log(`    ... and ${dailyResult.details.length - 5} more`);
  }

  if (flags.dailyOnly) {
    console.log('\n✅ Daily features audit complete.');
    await prisma.$disconnect();
    return;
  }

  // ── Step 2: Review Catalog Compositions ────────────────────────────────────
  console.log('\n[2/2] Auditing Catalog Compositions...');
  const catalogResult = await reviewAndFixCatalog({
    prisma,
    dryRun: !flags.fix,
    limit: flags.limit,
    batchSize: flags.batchSize,
    compositionId: flags.id,
    onProgress: ({ processed, total, fixed }) => {
      if (processed % 1000 === 0 || processed === total) {
        process.stdout.write(
          `\r  Progress: ${processed}/${total} scanned | Fixes applied: ${fixed} `,
        );
      }
    },
  });

  console.log('\n\n' + '═'.repeat(65));
  console.log('  📊 Catalog Review Summary');
  console.log('═'.repeat(65));
  console.log(`  Total scanned:           ${catalogResult.totalScanned}`);
  console.log(`  Total issues found:      ${catalogResult.issuesFoundCount}`);
  console.log(`  Fixes applied:           ${catalogResult.fixesAppliedCount}`);
  console.log('  Issues by category:');
  console.log(`    • STORY_IN_ABHANG:         ${catalogResult.issuesByType.STORY_IN_ABHANG}`);
  console.log(`    • EMBEDDED_MEANING:        ${catalogResult.issuesByType.EMBEDDED_MEANING}`);
  console.log(`    • GENERIC_SCRAPER_TITLE:   ${catalogResult.issuesByType.GENERIC_SCRAPER_TITLE}`);
  console.log(`    • MISALIGNED_REFERENCE:    ${catalogResult.issuesByType.MISALIGNED_REFERENCE}`);

  if (catalogResult.sampleFixes.length > 0) {
    console.log('\n  Sample Fixes:');
    for (const sample of catalogResult.sampleFixes.slice(0, 5)) {
      console.log(`    • ID: ${sample.id}`);
      console.log(`      Issues: ${sample.issues.join(', ')}`);
      if (sample.plan.newTitleMarathi) {
        console.log(`      Title:  ${sample.plan.newTitleMarathi}`);
      }
      if (sample.plan.newFullText) {
        console.log(`      Verse:  ${sample.plan.newFullText.slice(0, 60)}...`);
      }
      if (sample.plan.newMeaning) {
        console.log(`      Meaning: ${sample.plan.newMeaning.slice(0, 60)}...`);
      }
      console.log();
    }
  }

  if (!flags.fix && catalogResult.issuesFoundCount > 0) {
    console.log('💡 Tip: Run with `--fix` to automatically resolve these issues in the database:');
    console.log('   bun run scripts/review-compositions.ts --fix\n');
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('\n❌ Reviewer failed:', err);
  process.exit(1);
});
