/**
 * Digital Pandharpur — Background Worker Runner CLI Daemon
 * Usage:
 *   bun run src/cli/worker-runner.ts [--run-once] [--interval 5000]
 */

import { processSearchSyncJobs, processAiEnrichmentJobs } from '../lib/workers';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const args = process.argv.slice(2);
  const runOnce = args.includes('--run-once');
  
  let intervalMs = 5000;
  const intervalIdx = args.indexOf('--interval');
  if (intervalIdx !== -1 && args[intervalIdx + 1]) {
    intervalMs = parseInt(args[intervalIdx + 1], 10) || 5000;
  }

  console.log(`[WorkerRunner] Initializing background workers...`);
  console.log(`[WorkerRunner] Mode: ${runOnce ? 'One-time execution' : 'Continuous daemon polling'}`);
  if (!runOnce) {
    console.log(`[WorkerRunner] Polling interval: ${intervalMs}ms`);
  }

  let running = true;

  // Signal handlers for clean termination
  const shutdown = () => {
    console.log('\n[WorkerRunner] Received termination signal. Shutting down gracefully...');
    running = false;
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    do {
      console.log(`[WorkerRunner] [${new Date().toISOString()}] Polling job queues...`);
      
      const searchSyncProcessed = await processSearchSyncJobs();
      if (searchSyncProcessed > 0) {
        console.log(`[WorkerRunner] Processed ${searchSyncProcessed} search sync jobs.`);
      }

      const aiEnrichProcessed = await processAiEnrichmentJobs();
      if (aiEnrichProcessed > 0) {
        console.log(`[WorkerRunner] Processed ${aiEnrichProcessed} AI enrichment jobs.`);
      }

      if (runOnce) {
        console.log('[WorkerRunner] Run-once execution complete. Exiting.');
        break;
      }

      if (running) {
        await sleep(intervalMs);
      }
    } while (running);
  } catch (err) {
    console.error('[WorkerRunner] Fatal error in worker daemon:', err);
    process.exit(1);
  }

  console.log('[WorkerRunner] Daemon stopped successfully.');
  process.exit(0);
}

main();
