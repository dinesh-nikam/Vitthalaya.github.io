/**
 * Digital Pandharpur — Discovery Scheduler
 *
 * Scheduled job runner that triggers discovery cycles at regular intervals.
 * Can run as a daemon (continuous) or one-shot.
 *
 * Usage:
 *   bun run src/discovery/scheduler.ts --daemon          # Continuous mode
 *   bun run src/discovery/scheduler.ts --run-once        # Single cycle
 *   bun run src/discovery/scheduler.ts --interval=12    # Custom interval (hours)
 */

import { DiscoveryWorker } from './discovery-worker';
import type { DiscoveryReport } from './types';

export interface SchedulerConfig {
  intervalHours: number;
  runOnStart: boolean;
}

export class DiscoveryScheduler {
  private running = false;
  private cycleInProgress = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastRunAt: Date | null = null;
  private nextRunAt: Date | null = null;
  private lastReport: DiscoveryReport | null = null;
  private cycleCount = 0;

  constructor(private config: SchedulerConfig = { intervalHours: 6, runOnStart: true }) {}

  /**
   * Start the scheduler. Idempotent — safe to call multiple times.
   * Runs immediately if runOnStart is true, then repeats at the configured interval.
   */
  async start(): Promise<void> {
    if (this.running) {
      console.log('[DiscoveryScheduler] Already running — call ignored');
      return;
    }

    this.running = true;
    console.log(`[DiscoveryScheduler] Starting — interval: ${this.config.intervalHours}h`);

    if (this.config.runOnStart) {
      // Fire-and-forget the first cycle
      this.runCycle().catch((err) => {
        console.error('[DiscoveryScheduler] Initial cycle failed:', err);
      });
    }

    this.scheduleNext();
  }

  /**
   * Stop the scheduler. Idempotent.
   */
  stop(): void {
    if (!this.running && !this.intervalId) return;
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[DiscoveryScheduler] Stopped');
  }

  /**
   * Run a single discovery cycle. Uses a mutex to prevent overlapping cycles.
   * If a cycle is already in progress, the call is a no-op and returns the last report.
   */
  async runCycle(): Promise<DiscoveryReport> {
    if (this.cycleInProgress) {
      console.warn(`[DiscoveryScheduler] Cycle #${this.cycleCount + 1} skipped — previous cycle still running`);
      return this.lastReport ?? {
        cycleId: 'skipped',
        startedAt: new Date(),
        completedAt: new Date(),
        durationMs: 0,
        sourcesChecked: 0,
        sourcesSucceeded: 0,
        sourcesFailed: 0,
        totalItemsFound: 0,
        totalItemsNew: 0,
        totalItemsErrored: 0,
        totalDuplicates: 0,
        perSource: [],
      };
    }

    this.cycleInProgress = true;
    this.cycleCount++;
    console.log(`[DiscoveryScheduler] Cycle #${this.cycleCount} starting...`);

    this.lastRunAt = new Date();
    try {
      const report = await DiscoveryWorker.runForAllActive('SCHEDULED', 3);

      this.lastReport = report;
      console.log(
        `[DiscoveryScheduler] Cycle #${this.cycleCount} complete — ` +
        `${report.totalItemsNew} new items from ${report.sourcesChecked} sources ` +
        `(${(report.durationMs / 1000).toFixed(1)}s)`
      );

      if (report.sourcesFailed > 0) {
        console.warn(
          `[DiscoveryScheduler] ${report.sourcesFailed} source(s) failed — ` +
          report.perSource
            .filter((s) => s.status === 'FAILED')
            .map((s) => `${s.sourceName}: ${s.error}`)
            .join('; ')
        );
      }

      return report;
    } finally {
      this.cycleInProgress = false;
    }
  }

  /**
   * Get scheduler status information.
   */
  getStatus(): {
    running: boolean;
    lastRunAt: Date | null;
    nextRunAt: Date | null;
    cycleCount: number;
    lastReport: DiscoveryReport | null;
    config: SchedulerConfig;
  } {
    return {
      running: this.running,
      lastRunAt: this.lastRunAt,
      nextRunAt: this.nextRunAt,
      cycleCount: this.cycleCount,
      lastReport: this.lastReport,
      config: this.config,
    };
  }

  // ─── Private ──────────────────────────────────────────────────

  private scheduleNext(): void {
    if (!this.running) return;

    const intervalMs = this.config.intervalHours * 60 * 60 * 1000;
    this.nextRunAt = new Date(Date.now() + intervalMs);

    console.log(`[DiscoveryScheduler] Next cycle at ${this.nextRunAt.toISOString()}`);

    this.intervalId = setInterval(async () => {
      if (!this.running) return;
      await this.runCycle();
    }, intervalMs);
  }
}

// ─── CLI Entry Point ──────────────────────────────────────────

// Run directly: bun run src/discovery/scheduler.ts [--daemon] [--run-once] [--interval=N]
if (import.meta.path === Bun.main) {
  const args = process.argv.slice(2);
  const isDaemon = args.includes('--daemon');
  const isRunOnce = args.includes('--run-once');
  const intervalArg = args.find((a) => a.startsWith('--interval='));
  const interval = intervalArg ? parseInt(intervalArg.split('=')[1], 10) : 6;

  const scheduler = new DiscoveryScheduler({
    intervalHours: interval,
    runOnStart: true,
  });

  if (isDaemon) {
    console.log('[DiscoveryScheduler] Daemon mode — Ctrl+C to stop');
    scheduler.start();
    // Keep process alive
    process.on('SIGINT', () => {
      scheduler.stop();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      scheduler.stop();
      process.exit(0);
    });
  } else if (isRunOnce) {
    scheduler.runCycle()
      .then((report) => {
        console.log('\n=== Discovery Report ===');
        console.log(JSON.stringify(report, null, 2));
        process.exit(0);
      })
      .catch((err) => {
        console.error('Cycle failed:', err);
        process.exit(1);
      });
  } else {
    console.log('Usage: bun run src/discovery/scheduler.ts --daemon | --run-once [--interval=N]');
    process.exit(1);
  }
}
