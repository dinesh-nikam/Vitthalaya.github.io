/**
 * Digital Pandharpur — Background Worker Runner CLI Daemon
 * Usage:
 *   bun run src/cli/worker-runner.ts [--run-once] [--interval 5000] [--port 9091]
 */

import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { processSearchSyncJobs, processAiEnrichmentJobs, processAudioProcessingJobs } from '../lib/workers';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Stats tracking for observability
const stats = {
  startedAt: new Date().toISOString(),
  lastHeartbeat: new Date().toISOString(),
  cyclesCompleted: 0,
  processed: {
    searchSync: 0,
    aiEnrichment: 0,
    audioProcessing: 0,
  },
  lastErrors: [] as Array<{ at: string; error: string }>,
};

function updateHeartbeat(heartbeatPath: string) {
  stats.lastHeartbeat = new Date().toISOString();
  try {
    writeFileSync(heartbeatPath, JSON.stringify(stats, null, 2), 'utf8');
  } catch {
    // Non-critical if filesystem restricted
  }
}

async function main() {
  const args = process.argv.slice(2);
  const runOnce = args.includes('--run-once');

  let intervalMs = 5000;
  const intervalIdx = args.indexOf('--interval');
  if (intervalIdx !== -1 && args[intervalIdx + 1]) {
    intervalMs = parseInt(args[intervalIdx + 1], 10) || 5000;
  }

  let healthPort = process.env.WORKER_PORT ? parseInt(process.env.WORKER_PORT, 10) : 9091;
  const portIdx = args.indexOf('--port');
  if (portIdx !== -1 && args[portIdx + 1]) {
    healthPort = parseInt(args[portIdx + 1], 10) || 9091;
  }

  const heartbeatPath = process.env.WORKER_HEARTBEAT_PATH || join(tmpdir(), 'varkari-worker-heartbeat.json');

  console.log('[WorkerRunner] Initializing background workers...');
  console.log(`[WorkerRunner] Mode: ${runOnce ? 'One-time execution' : 'Continuous daemon polling'}`);
  if (!runOnce) {
    console.log(`[WorkerRunner] Polling interval: ${intervalMs}ms`);
    console.log(`[WorkerRunner] Heartbeat path: ${heartbeatPath}`);
  }

  let running = true;
  let server: any = null;

  // Start HTTP healthcheck server for Docker / K8s / ECS probes if running as daemon
  if (!runOnce) {
    try {
      // @ts-ignore: Bun.serve is native in Bun runtime
      if (typeof Bun !== 'undefined' && typeof Bun.serve === 'function') {
        server = Bun.serve({
          port: healthPort,
          fetch(req: Request) {
            const url = new URL(req.url);
            if (url.pathname === '/health' || url.pathname === '/live' || url.pathname === '/') {
              return Response.json({
                status: 'healthy',
                uptimeSeconds: Math.round(process.uptime()),
                ...stats,
              });
            }
            return new Response('Not Found', { status: 404 });
          },
        });
        console.log(`[WorkerRunner] Healthcheck probe listening on http://0.0.0.0:${healthPort}/health`);
      }
    } catch (err: any) {
      console.warn('[WorkerRunner] Could not bind health probe server (continuing without HTTP probe):', err?.message);
    }
  }

  // Signal handlers for clean termination
  const shutdown = () => {
    console.log('\n[WorkerRunner] Received termination signal. Shutting down gracefully...');
    running = false;
    if (server && typeof server.stop === 'function') {
      server.stop();
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    do {
      stats.cyclesCompleted++;
      updateHeartbeat(heartbeatPath);

      const searchSyncProcessed = await processSearchSyncJobs();
      if (searchSyncProcessed > 0) {
        stats.processed.searchSync += searchSyncProcessed;
        console.log(`[WorkerRunner] Processed ${searchSyncProcessed} search sync jobs.`);
      }

      const aiEnrichProcessed = await processAiEnrichmentJobs();
      if (aiEnrichProcessed > 0) {
        stats.processed.aiEnrichment += aiEnrichProcessed;
        console.log(`[WorkerRunner] Processed ${aiEnrichProcessed} AI enrichment jobs.`);
      }

      const audioProcessed = await processAudioProcessingJobs();
      if (audioProcessed > 0) {
        stats.processed.audioProcessing += audioProcessed;
        console.log(`[WorkerRunner] Processed ${audioProcessed} audio processing jobs.`);
      }

      if (runOnce) {
        console.log('[WorkerRunner] Run-once execution complete. Exiting.');
        break;
      }

      if (running) {
        await sleep(intervalMs);
      }
    } while (running);
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[WorkerRunner] Fatal error in worker daemon:', err);
    stats.lastErrors.push({ at: new Date().toISOString(), error: errorMsg });
    updateHeartbeat(heartbeatPath);
    process.exit(1);
  }

  console.log('[WorkerRunner] Daemon stopped successfully.');
  process.exit(0);
}

main();
