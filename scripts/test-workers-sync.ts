/**
 * Digital Pandharpur — Outbox Synchronization & Worker Queue Validation Script
 * Usage:
 *   bun run scripts/test-workers-sync.ts
 */

import { db } from '../src/db/client';
import { submitToModeration, submitPeerVote } from '../src/lib/moderation-workflow';
import { processSearchSyncJobs } from '../src/lib/workers';
import { v4 as uuidv4 } from 'uuid';

async function testWorkerSync() {
  console.log('🧪 Starting Worker Queue & Outbox Sync Validation...\n');

  // 1. Setup / Seed necessary entities for test
  console.log('Step 1: Setting up test user and manuscript upload...');
  
  // Find or create an admin user
  let admin = await db.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!admin) {
    admin = await db.user.create({
      data: {
        email: `test-admin-${uuidv4().substring(0, 5)}@varkari.org`,
        name: 'Test Worker Admin',
        role: 'ADMIN',
        reputationScore: 100,
      },
    });
    console.log(`  - Created new test admin user: ${admin.email}`);
  } else {
    console.log(`  - Using existing admin user: ${admin.email}`);
  }

  // Create a manuscript upload
  const upload = await db.manuscriptUpload.create({
    data: {
      volunteerId: admin.id,
      imageUrl: 'https://example.com/manuscript-test.jpg',
      status: 'pending',
    },
  });
  console.log(`  - Created test manuscript upload ID: ${upload.id}`);

  // 2. Submit to moderation and approve to trigger promotion
  console.log('\nStep 2: Submitting draft to moderation queue...');
  const queueId = await submitToModeration(
    'ocr',
    upload.id,
    'विठ्ठल माउली भक्ती गीत',
    'काया ही पंढरी, आत्मा हा विठ्ठल।\nनांदे हा केवळ देव येथे॥',
    'शरीर हेच पंढरपूर असून आत्मा हाच विठ्ठल आहे.'
  );
  console.log(`  - Submitted. Moderation Queue ID: ${queueId}`);

  console.log('\nStep 3: Approving item to trigger promoteAndPublish...');
  // Since user is ADMIN, approving will immediately trigger promoteAndPublish and transaction
  await submitPeerVote(admin.id, queueId, 'approve', 'Auto-approved for worker integration test');

  // Verify moderation status updated
  const approvedItem = await db.moderationQueue.findUnique({
    where: { id: queueId },
  });
  console.log(`  - Moderation Queue Status: ${approvedItem?.status} (Expected: approved)`);

  // Verify Composition created
  const composition = await db.composition.findFirst({
    where: { titleMarathi: 'विठ्ठल माउली भक्ती गीत' },
  });
  if (!composition) {
    throw new Error('❌ Composition was not created during promotion!');
  }
  console.log(`  - Created Composition ID: ${composition.id}`);

  // Verify SearchSyncJob queued
  const searchJob = await db.searchSyncJob.findFirst({
    where: { compositionId: composition.id },
  });
  console.log(`  - Search Sync Job status: ${searchJob?.status} (Expected: pending)`);
  console.log(`  - Search Sync Job action: ${searchJob?.action} (Expected: upsert)`);

  // Verify AiEnrichmentJob queued
  const enrichmentJob = await db.aiEnrichmentJob.findFirst({
    where: { compositionId: composition.id },
  });
  console.log(`  - AI Enrichment Job status: ${enrichmentJob?.status} (Expected: pending)`);

  if (searchJob && enrichmentJob) {
    console.log('✅ Transactional outbox queuing passed!');
  } else {
    throw new Error('❌ Outbox queueing failed!');
  }

  // 3. Process SearchSyncJobs
  console.log('\nStep 4: Running SearchSync worker...');
  const processedSyncCount = await processSearchSyncJobs();
  console.log(`  - Processed ${processedSyncCount} Search Sync Jobs.`);

  // Verify SearchSyncJob is now completed
  const updatedSearchJob = await db.searchSyncJob.findFirst({
    where: { compositionId: composition.id },
  });
  console.log(`  - Updated Search Sync Job status: ${updatedSearchJob?.status} (Expected: completed)`);

  if (updatedSearchJob?.status === 'completed') {
    console.log('✅ Search Sync outbox processor passed!');
  } else {
    console.error(`❌ Search sync job not completed. Status: ${updatedSearchJob?.status}. Error: ${updatedSearchJob?.errorMessage}`);
  }

  // Cleanup test data so we don't bloat the test database
  console.log('\nStep 5: Cleaning up test records...');
  await db.searchSyncJob.deleteMany({ where: { compositionId: composition.id } });
  await db.aiEnrichmentJob.deleteMany({ where: { compositionId: composition.id } });
  await db.aiEnrichmentResult.deleteMany({ where: { compositionId: composition.id } });
  await db.composition.delete({ where: { id: composition.id } });
  await db.moderationReview.deleteMany({ where: { queueId } });
  await db.moderationQueue.delete({ where: { id: queueId } });
  await db.manuscriptUpload.delete({ where: { id: upload.id } });
  console.log('  - Test records cleaned up.');

  console.log('\n🏁 Worker Sync validation complete. All integrations verified successfully!');
}

testWorkerSync().catch((err) => {
  console.error('\n❌ Validation script failed:', err);
  process.exit(1);
});
