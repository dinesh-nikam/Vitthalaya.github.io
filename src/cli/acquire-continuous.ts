#!/usr/bin/env bun
/**
 * Vitthalaya — Continuous Content Acquisition Engine CLI
 *
 * The single command to start the autonomous content acquisition pipeline.
 *
 * Usage:
 *   bun run acquire:continuous                    # Start continuous daemon
 *   bun run acquire:continuous --once             # Run single cycle, then exit
 *   bun run acquire:continuous --dry-run          # Dry run (no DB writes)
 *   bun run acquire:continuous --interval=12      # Custom crawl interval (hours)
 *   bun run acquire:continuous --discovery-interval=48  # Custom discovery interval
 *   bun run acquire:continuous --daemon           # Explicit daemon mode
 *
 * Architecture:
 *   ┌──────────────┐     ┌──────────────┐     ┌─────────────────┐
 *   │  Discovery    │ ──→ │  Crawl4AI     │ ──→ │  Content        │
 *   │  Engine v2    │     │  Scheduler    │     │  Pipeline       │
 *   └──────────────┘     └──────────────┘     └────────┬────────┘
 *                                                      │
 *               ┌──────────────────────────────────────┤
 *               │                                      │
 *               ▼                                      ▼
 *        ┌──────────────┐                      ┌─────────────────┐
 *        │  Search       │ ←────────────────── │  Moderation     │
 *        │  Index        │                      │  Queue          │
 *        └──────────────┘                      └─────────────────┘
 */

import { UnifiedScheduler } from '../crawl4ai/scheduler';
import type { SchedulerConfig } from '../crawl4ai/types';

interface ContinuousArgs {
  once: boolean;
  daemon: boolean;
  dryRun: boolean;
  crawlInterval: number;
  discoveryInterval: number;
  maxConcurrency: number;
  help: boolean;
}

function parseArgs(): ContinuousArgs {
  const args = process.argv.slice(2);

  return {
    once: args.includes('--once') || args.includes('-1'),
    daemon: args.includes('--daemon') || args.includes('-d'),
    dryRun: args.includes('--dry-run') || args.includes('--dry'),
    crawlInterval: parseArgInt(args, '--interval', '-i', 6),
    discoveryInterval: parseArgInt(args, '--discovery-interval', '-di', 24),
    maxConcurrency: parseArgInt(args, '--concurrency', '-c', 3),
    help: args.includes('--help') || args.includes('-h'),
  };
}

function parseArgInt(
  args: string[],
  long: string,
  short: string,
  defaultVal: number,
): number {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === long || args[i] === short) {
      const val = parseInt(args[i + 1], 10);
      if (!isNaN(val) && val > 0) return val;
    }
    if (args[i].startsWith(`${long}=`)) {
      const val = parseInt(args[i].split('=')[1], 10);
      if (!isNaN(val) && val > 0) return val;
    }
  }
  return defaultVal;
}

function showHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Vitthalaya — CRAWL4AI POWERED ACQUISITION ENGINE            ║
║  Digital Pandharpur Autonomous Content Acquisition Platform  ║
╚══════════════════════════════════════════════════════════════╝

USAGE:
  bun run acquire:continuous [options]

OPTIONS:
  --once, -1               Run a single cycle and exit
  --daemon, -d             Run as continuous daemon (default)
  --dry-run, --dry         Dry run — no database writes or live crawling
  --interval=N, -i N       Crawl cycle interval in hours (default: 6)
  --discovery-interval=N   Source discovery interval in hours (default: 24)
  --concurrency=N, -c N    Max concurrent crawling tasks (default: 3)
  --help, -h               Show this help message

EXAMPLES:
  bun run acquire:continuous              # Start continuous daemon
  bun run acquire:continuous --once       # Run single cycle
  bun run acquire:continuous --dry-run -1 # Preview mode, single cycle
  bun run acquire:continuous --interval=12 # 12-hour crawl cycle

ARCHITECTURE:
  1. SOURCE DISCOVERY — Search engines, sitemaps, public archives
  2. CRAWL4AI ENGINE — Playwright-powered intelligent crawling
  3. CONTENT EXTRACTION — AI-assisted semantic extraction
  4. QUALITY SCORING — Automated quality evaluation
  5. DEDUPLICATION — Canonical matching engine
  6. MODERATION QUEUE — Content approval workflow
  7. SEARCH INDEXING — Meilisearch + Knowledge Graph updates

PIPELINE:
  Discover → Crawl → Extract → Segment → Dedup → Score
  → Enrich → Moderate → Publish → Index

The acquisition engine automatically:
  • Discovers new public sources of Marathi devotional content DAILY
  • Crawls approved sources using intelligent extraction strategies
  • Extracts and segments compositions with AI assistance
  • Detects duplicates via canonical matching engine
  • Scores content quality for moderation triage
  • Submits to moderation workflow
  • Publishes approved content to search index
  • Updates knowledge graph relationships
  • Monitors crawler health with self-healing capabilities
  `);
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Vitthalaya — CRAWL4AI POWERED ACQUISITION ENGINE            ║');
  console.log('║  Digital Pandharpur Autonomous Content Acquisition Platform  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Mode:                ${args.dryRun ? '🟡 DRY RUN (Preview)' : '🟢 LIVE'}`);
  console.log(`  Cycle interval:      ${args.crawlInterval} hours`);
  console.log(`  Discovery interval:  ${args.discoveryInterval} hours`);
  console.log(`  Concurrency:         ${args.maxConcurrency}`);
  console.log(`  Time:                ${new Date().toISOString()}`);
  console.log('');

  const config: Partial<SchedulerConfig> = {
    crawlIntervalHours: args.crawlInterval,
    discoveryIntervalHours: args.discoveryInterval,
    maxConcurrency: args.maxConcurrency,
    runOnStart: true,
    dryRun: args.dryRun,
  };

  const scheduler = new UnifiedScheduler(config);

  if (args.once || !args.daemon) {
    // ─── Single Cycle Mode ─────────────────────────────────
    console.log('📡 Running single acquisition cycle...\n');

    try {
      const analytics = await scheduler.runOnce();

      console.log('\n══════════════════════════════════════════════');
      console.log('📊 ACQUISITION CYCLE REPORT');
      console.log('══════════════════════════════════════════════');
      console.log(`  Cycle ID:              ${analytics.cycleId}`);
      console.log(`  Duration:              ${(analytics.durationMs / 1000).toFixed(1)}s`);
      console.log(`  Sources checked:       ${analytics.totals.sourcesChecked}`);
      console.log(`  Sources succeeded:     ${analytics.totals.sourcesSucceeded}`);
      console.log(`  Sources failed:        ${analytics.totals.sourcesFailed}`);
      console.log(`  URLs crawled:          ${analytics.totals.urlsCrawled}`);
      console.log(`  Compositions found:    ${analytics.totals.compositionsExtracted}`);
      console.log(`  Duplicates skipped:    ${analytics.totals.duplicatesFound}`);
      console.log(`  Auto-approved:         ${analytics.totals.autoApproved}`);
      console.log(`  Sent to moderation:    ${analytics.totals.sentToModeration}`);
      console.log('══════════════════════════════════════════════\n');

      if (analytics.errors.length > 0) {
        console.log('⚠️  Errors:');
        for (const err of analytics.errors.slice(0, 10)) {
          console.log(`  ❌ ${err.sourceName}: ${err.error}`);
        }
      }

      process.exit(0);
    } catch (err) {
      console.error('\n❌ Acquisition cycle failed:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  } else {
    // ─── Continuous Daemon Mode ────────────────────────────
    console.log('🔄 Starting continuous acquisition daemon...');
    console.log(`  Press Ctrl+C to stop\n`);

    await scheduler.initialize();

    // Start event logging
    scheduler.onEvent((event) => {
      const ts = new Date(event.timestamp).toLocaleTimeString();
      console.log(`  [${ts}] ${event.type}: ${event.message}`);
    });

    // Start the scheduler
    await scheduler.start();

    // Handle graceful shutdown
    const shutdown = () => {
      console.log('\n\n⏹️  Shutting down acquisition engine...');
      scheduler.stop();
      console.log('✅ Acquisition engine stopped.');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Keep alive
    await new Promise(() => {});
  }
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
