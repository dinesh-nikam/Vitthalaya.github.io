/**
 * Digital Pandharpur — Background Workers Engine
 * Handles processing of SearchSyncJob and AiEnrichmentJob queues.
 */

import { db } from '../db/client';
import { upsertCompositionToIndex as upsertMeili, deleteCompositionFromIndex as deleteMeili } from './search-client';
import { upsertCompositionToIndex as upsertOS, deleteCompositionFromIndex as deleteOS } from './opensearch-client';
import { drainQueue } from '../ai-enrichment/queue';

/**
 * Processes pending search sync outbox jobs.
 * Connects transactional DB updates with search search backends.
 */
export async function processSearchSyncJobs(): Promise<number> {
  let processedCount = 0;

  while (true) {
    let job: any = null;

    try {
      // PostgreSQL atomic locking dequeue using SKIP LOCKED
      const rows = await db.$queryRawUnsafe(`
        UPDATE "search_sync_jobs"
        SET status = 'processing', attempts = attempts + 1, updated_at = NOW() AT TIME ZONE 'UTC'
        WHERE id = (
          SELECT id FROM "search_sync_jobs"
          WHERE status IN ('pending', 'failed') AND attempts < 3
          ORDER BY created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        RETURNING id, composition_id as "compositionId", action, status, attempts
      `) as any[];

      if (rows && rows.length > 0) {
        job = rows[0];
      }
    } catch {
      // Fallback simple locking for local development with SQLite/other DBs
      const pendingJob = await db.searchSyncJob.findFirst({
        where: {
          status: { in: ['pending', 'failed'] },
          attempts: { lt: 3 },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (pendingJob) {
        job = await db.searchSyncJob.update({
          where: { id: pendingJob.id },
          data: {
            status: 'processing',
            attempts: { increment: 1 },
          },
        });
      }
    }

    if (!job) {
      break;
    }

    try {
      const compositionId = job.compositionId;

      if (job.action === 'upsert') {
        // Sync to Meilisearch
        await upsertMeili(compositionId);
        // Sync to OpenSearch
        await upsertOS(compositionId);
      } else if (job.action === 'delete') {
        // Remove from Meilisearch
        await deleteMeili(compositionId);
        // Remove from OpenSearch
        await deleteOS(compositionId);
      }

      // Mark job as completed
      await db.searchSyncJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          errorMessage: null,
        },
      });

      processedCount++;
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[SearchSyncWorker] Error processing job ${job.id}:`, err);

      await db.searchSyncJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          errorMessage: errorMsg,
        },
      });
    }
  }

  return processedCount;
}

/**
 * Processes pending AI enrichment jobs in the background queue.
 */
export async function processAiEnrichmentJobs(): Promise<number> {
  try {
    return await drainQueue();
  } catch (err) {
    console.error('[AiEnrichmentWorker] Error draining queue:', err);
    throw err;
  }
}
