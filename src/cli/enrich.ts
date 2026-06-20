#!/usr/bin/env bun
/**
 * Digital Pandharpur — AI Enrichment CLI
 *
 * CLI interface for the AI enrichment pipeline.
 *
 * Usage:
 *   bun run enrich --action=status                    Show queue stats
 *   bun run enrich --action=enqueue --limit=50        Enqueue pending compositions
 *   bun run enrich --action=process --concurrency=3   Process queue with 3 workers
 *   bun run enrich --action=pipeline --limit=100      Full pipeline: enqueue + process
 *   bun run enrich --action=retry                     Retry all failed jobs
 *   bun run enrich --action=review                    List pending reviews
 *   bun run enrich --action=trigger --composition=<id> Trigger single composition
 *   bun run enrich --help
 */

import { parseArgs } from 'util';

import {
  enqueueComposition,
  enqueueBatch,
  getQueueStats,
  retryFailedJobs,
  runBatchPipeline,
  getPendingReviews,
  processReview,
  printProviderStatus,
} from '../ai-enrichment';

// ─── Types ──────────────────────────────────────────────────────────────────

type CliAction = 'status' | 'enqueue' | 'process' | 'pipeline' | 'retry' | 'review' | 'trigger' | 'providers';

interface CliArgs {
  action: CliAction;
  limit: number;
  concurrency: number;
  type: string | undefined;
  composition: string | undefined;
  'dry-run': boolean;
  verbose: boolean;
  help: boolean;
}

// ─── Argument Parsing ──────────────────────────────────────────────────────

function parseCliArgs(): CliArgs {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      action: { type: 'string', short: 'a', default: 'status' },
      limit: { type: 'string', short: 'l', default: '100' },
      concurrency: { type: 'string', short: 'c', default: '1' },
      type: { type: 'string', short: 't' },
      composition: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      verbose: { type: 'boolean', short: 'v', default: false },
      help: { type: 'boolean', default: false },
    },
    allowPositionals: false,
  });

  return {
    action: (values.action as CliAction) ?? 'status',
    limit: parseInt(values.limit as string, 10) || 100,
    concurrency: parseInt(values.concurrency as string, 10) || 1,
    type: values.type as string | undefined,
    composition: values.composition as string | undefined,
    'dry-run': (values['dry-run'] as boolean) ?? false,
    verbose: (values.verbose as boolean) ?? false,
    help: (values.help as boolean) ?? false,
  };
}

// ─── Help ──────────────────────────────────────────────────────────────────

function showHelp(): void {
  console.log(`
╔══════════════════════════════════════════════╗
║  Digital Pandharpur — AI Enrichment CLI     ║
╚══════════════════════════════════════════════╝

Usage: bun run enrich [options]

Actions:
  --action=status                Show queue statistics (default)
  --action=enqueue               Enqueue pending compositions
  --action=process               Process the enrichment queue
  --action=pipeline              Full pipeline: enqueue + process
  --action=retry                 Retry all failed jobs
  --action=review                List pending reviews
  --action=trigger               Enqueue a single composition
  --action=providers             Show available free LLM providers

Options:
  -l, --limit <number>           Max compositions to enqueue (default: 100)
  -c, --concurrency <number>     Number of concurrent workers (default: 1)
  -t, --type <type>              Filter by composition type
      --composition <id>         Composition ID (for --action=trigger)
      --dry-run                  Dry run (no DB changes)
  -v, --verbose                  Verbose logging
      --help                     Show this help message

Examples:
  bun run enrich --action=status
  bun run enrich --action=enqueue --limit=200
  bun run enrich --action=process --concurrency=3
  bun run enrich --action=pipeline --limit=100 --concurrency=3
  bun run enrich --action=trigger --composition=<uuid>
  bun run enrich --action=review --limit=20
`);
}

// ─── Format helpers ────────────────────────────────────────────────────────

function fmt(num: number): string {
  return num.toString().padStart(4);
}

// ─── Actions ───────────────────────────────────────────────────────────────

async function actionStatus(): Promise<void> {
  const stats = await getQueueStats();

  const bar = (n: number, total: number, w = 20): string => {
    const filled = total > 0 ? Math.round((n / total) * w) : 0;
    return '█'.repeat(filled) + '░'.repeat(w - filled);
  };

  console.log(`\n📊 AI Enrichment Queue Status`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Pending:      ${fmt(stats.pending)}  ${bar(stats.pending, stats.total)}`);
  console.log(`  Processing:   ${fmt(stats.processing)}`);
  console.log(`  Completed:    ${fmt(stats.completed)}  ${bar(stats.completed, stats.total)}`);
  console.log(`  Failed:       ${fmt(stats.failed)}`);
  console.log(`  Needs Review: ${fmt(stats.needsReview)}`);
  console.log(`  ───────────────────────`);
  console.log(`  Total:        ${fmt(stats.total)}`);
  console.log();
}

async function actionEnqueue(args: CliArgs): Promise<void> {
  console.log(`\n📥 Enqueuing compositions...`);
  if (args['dry-run']) console.log(`  🟡 DRY RUN — no changes will be made`);

  const enqueued = await enqueueBatch({
    limit: args.limit,
    type: args.type,
    skipEnriched: true,
    dryRun: args['dry-run'],
  });

  if (args['dry-run']) {
    console.log(`  Would enqueue: ${enqueued} compositions`);
  } else {
    console.log(`  Enqueued: ${enqueued} compositions`);
  }

  if (enqueued > 0) {
    const stats = await getQueueStats();
    console.log(`  Queue now has ${stats.pending} pending jobs`);
  }
  console.log();
}

async function actionProcess(args: CliArgs): Promise<void> {
  const stats = await getQueueStats();
  if (stats.pending === 0) {
    console.log(`\n✓ Queue is empty. Nothing to process.\n`);
    return;
  }

  console.log(`\n⚙️  Processing queue with ${args.concurrency} worker(s)...`);
  console.log(`  ${stats.pending} pending jobs`);

  const startTime = Date.now();

  const { processWithConcurrency } = await import('../ai-enrichment');
  const processed = await processWithConcurrency(args.concurrency, {
    onProgress(stats: { processed: number; total: number; failed?: number }) {
      // Progress callback - can add logging here
    },
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const after = await getQueueStats();

  console.log(`  Processed: ${processed} jobs in ${duration}s`);
  console.log(`  Remaining: ${after.pending} pending, ${after.failed} failed`);
  console.log();
}

async function actionPipeline(args: CliArgs): Promise<void> {
  console.log(`\n🔁 AI Enrichment Pipeline`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━`);

  if (args['dry-run']) console.log(`  🟡 DRY RUN — no LLM calls will be made`);

  const startTime = Date.now();

  const result = await runBatchPipeline({
    limit: args.limit,
    type: args.type,
    skipEnriched: true,
    concurrency: args.concurrency,
    dryRun: args['dry-run'],
    retryFailed: true,
    onProgress: (p) => {
      if (args.verbose) {
        process.stdout.write(`\r  Progress: ${p.processed}/${p.total}`);
      }
    },
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`  Enqueued:     ${result.enqueued}`);
  console.log(`  Processed:    ${result.processed}`);
  console.log(`  Failed:       ${result.failed}`);
  console.log(`  Duration:     ${duration}s`);
  console.log(`  Pending:      ${result.pendingBefore} → ${result.pendingAfter}`);
  console.log();
}

async function actionRetry(): Promise<void> {
  console.log(`\n🔄 Retrying failed jobs...`);
  const count = await retryFailedJobs();
  if (count > 0) {
    console.log(`  Retried ${count} failed jobs`);
    const stats = await getQueueStats();
    console.log(`  Queue now has ${stats.pending} pending jobs`);
  } else {
    console.log(`  No failed jobs to retry`);
  }
  console.log();
}

async function actionReview(args: CliArgs): Promise<void> {
  const reviews = await getPendingReviews({ limit: args.limit });

  if (reviews.length === 0) {
    console.log(`\n✓ No pending reviews.\n`);
    return;
  }

  console.log(`\n📝 Pending Reviews (${reviews.length})`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  for (const r of reviews) {
    const confidence = r.confidenceSummary ?? '?';
    const summary = r.summary ? r.summary.slice(0, 60) + '...' : '(no summary)';
    console.log(`  • [${r.type}] ${r.title}`);
    console.log(`    Confidence: ${confidence} | ${summary}`);
    console.log(`    Result ID: ${r.resultId}`);
    console.log();
  }
}

async function actionTrigger(args: CliArgs): Promise<void> {
  if (!args.composition) {
    console.error('❌ --composition <id> is required for --action=trigger');
    process.exit(1);
  }

  console.log(`\n🎯 Triggering enrichment for composition ${args.composition}...`);
  const job = await enqueueComposition(args.composition);

  console.log(`  Job ID:    ${job.id}`);
  console.log(`  Status:    ${job.status}`);

  if (job.status === 'completed') {
    console.log(`  ℹ️  Already enriched`);
  } else if (job.status === 'pending') {
    console.log(`  ℹ️  Queued for processing`);
  }
  console.log();
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseCliArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  const actionMap: Record<CliAction, () => Promise<void>> = {
    status: () => actionStatus(),
    enqueue: () => actionEnqueue(args),
    process: () => actionProcess(args),
    pipeline: () => actionPipeline(args),
    retry: () => actionRetry(),
    review: () => actionReview(args),
    trigger: () => actionTrigger(args),
    providers: async () => { printProviderStatus(); },
  };

  const actionFn = actionMap[args.action];
  if (!actionFn) {
    console.error(`❌ Unknown action: "${args.action}"`);
    console.error(`   Valid actions: ${Object.keys(actionMap).join(', ')}`);
    process.exit(1);
  }

  try {
    await actionFn();
  } catch (err) {
    console.error(`❌ Error:`, err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
