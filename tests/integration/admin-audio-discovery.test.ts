/**
 * Integration test — GET /api/admin/audio (admin) dashboard truthfulness.
 *
 * Exercises the real route handler end-to-end:
 *   - admin authorization guard (requireAdmin is mocked; the route's own
 *     auth-path is covered by unit tests)
 *   - the discovery analytics block: source families summing to the true
 *     composition count, the OCR review queue, and canonical variant totals
 *   - the stats block: recordings / jobs / rights / corrections / matches /
 *     modelVersions counts, each recomputed independently
 *   - the low-confidence transcript list: exactly the rows matching the
 *     predicate, in the API's stated sort order
 *
 * Requires a real PostgreSQL DATABASE_URL (the SQLite shim used by the unit
 * suite does not expose the audio platform models). Skips otherwise.
 *
 * The truthfulness checks recompute every number independently with direct
 * db queries, then seed disposable fixtures via the shared
 * tests/fixtures/audio-fixture helper, assert the API shifts by exactly the
 * expected delta in every affected bucket, and confirm cleanup restores the
 * baseline — so a cached or hardcoded dashboard would fail the test.
 */

import { describe, test, expect, beforeAll, mock } from 'bun:test';
import { createAudioFixture, withFixtureLifecycle } from '../fixtures/audio-fixture';

const DB_URL = process.env.DATABASE_URL ?? '';
const isPostgres = DB_URL.startsWith('postgresql:') || DB_URL.startsWith('postgres:');

// Mock the admin guard BEFORE the route module loads (the route imports it
// statically). GET() then runs as an authenticated ADMIN.
mock.module('@/src/lib/require-admin', () => ({
  requireAdmin: async () => ({
    session: {
      userId: 'integration-test-admin',
      email: 'admin@integration.test',
      name: 'Integration Test Admin',
      role: 'ADMIN',
    },
  }),
}));

const describePostgres = describe.skipIf(!isPostgres);

// ─── Shared helpers ──────────────────────────────────────────────────────────

async function getDb() {
  const { db } = await import('@/src/db/client');
  return db;
}

async function getBody() {
  const { GET } = await import('@/app/api/admin/audio/route');
  const res = await GET();
  const body = await res.json();
  if (res.status !== 200 || !body.success) {
    throw new Error(`GET /api/admin/audio failed: ${res.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function getDiscovery() {
  return (await getBody()).discovery;
}

/** Full response minus the volatile generatedAt/success fields, so the
 *  lifecycle helper's default deep-equality restoration check is exact. */
async function getSnapshotBody() {
  const body = await getBody();
  const rest = { ...body };
  delete rest.generatedAt;
  delete rest.success;
  return rest;
}

function assertPostgresModels() {
  return beforeAll(async () => {
    // Fail fast (not skip) if the client can't reach the audio models — the
    // suite should never silently pass against a shim that lacks them.
    const db = await getDb();
    await db.audioProcessingJob.count();
  });
}

// ─── Discovery block ─────────────────────────────────────────────────────────

describePostgres('GET /api/admin/audio — discovery block (admin)', () => {
  assertPostgresModels();

  test('returns 200 for an admin with the discovery block present and well-formed', async () => {
    const body = await getBody();
    expect(body.success).toBe(true);

    const d = body.discovery;
    expect(d).toBeDefined();
    expect(d.compositionsBySource).toBeDefined();
    expect(typeof d.compositionsBySource.internetArchive).toBe('number');
    expect(typeof d.compositionsBySource.wikisource).toBe('number');
    expect(typeof d.compositionsBySource.other).toBe('number');
    expect(d.reviewQueue).toMatchObject({ total: expect.any(Number), ocr: expect.any(Number) });
    expect(d.variants).toMatchObject({ total: expect.any(Number), ocrVariant: expect.any(Number) });
    expect(Array.isArray(d.topSources)).toBe(true);
    expect(Array.isArray(d.variants.byReason)).toBe(true);
  });

  test('source families sum exactly to the true composition count', async () => {
    const db = await getDb();
    const d = await getDiscovery();
    const total = await db.composition.count();
    const sum = Object.values(d.compositionsBySource).reduce((a: number, b: number) => a + b, 0);
    expect(sum).toBe(total);
  });

  test('review queue is truthful: total = unreviewed rows, ocr = unreviewed OCR-sourced rows', async () => {
    const db = await getDb();
    const d = await getDiscovery();
    const [unreviewed, unreviewedOcr] = await Promise.all([
      db.composition.count({ where: { reviewed: false } }),
      db.composition.count({
        where: {
          reviewed: false,
          OR: [{ source: { contains: 'Internet Archive' } }, { source: { contains: 'archive.org' } }],
        },
      }),
    ]);
    expect(d.reviewQueue.total).toBe(unreviewed);
    expect(d.reviewQueue.ocr).toBe(unreviewedOcr);
    expect(d.reviewQueue.ocr).toBeLessThanOrEqual(d.reviewQueue.total);
  });

  test('variant totals are truthful and byReason sums to the total', async () => {
    const db = await getDb();
    const d = await getDiscovery();
    const [totalV, ocrV] = await Promise.all([
      db.compositionVersion.count(),
      db.compositionVersion.count({ where: { changeReason: { contains: 'OCR variant' } } }),
    ]);
    expect(d.variants.total).toBe(totalV);
    expect(d.variants.ocrVariant).toBe(ocrV);
    const reasonSum = d.variants.byReason.reduce((a: number, r: { reason: string; count: number }) => a + r.count, 0);
    expect(reasonSum).toBe(totalV);
  });

  test('topSources are real, non-empty source attributions with positive counts', async () => {
    const d = await getDiscovery();
    expect(d.topSources.length).toBeGreaterThan(0);
    for (const s of d.topSources) {
      expect(typeof s.source).toBe('string');
      expect(s.source.length).toBeGreaterThan(0);
      expect(s.count).toBeGreaterThan(0);
    }
  });

  test('full lifecycle: seeded fixtures shift every affected number by exactly +1, then cleanup restores baseline', async () => {
    await withFixtureLifecycle({
      getSnapshot: getDiscovery,
      seed: () => createAudioFixture('discovery'),
      assertAfter: (after, baseline) => {
        expect(after.compositionsBySource.internetArchive).toBe(baseline.compositionsBySource.internetArchive + 1);
        expect(after.reviewQueue.total).toBe(baseline.reviewQueue.total + 1);
        expect(after.reviewQueue.ocr).toBe(baseline.reviewQueue.ocr + 1);
        expect(after.variants.total).toBe(baseline.variants.total + 1);
        expect(after.variants.ocrVariant).toBe(baseline.variants.ocrVariant + 1);

        // The family sum still reconciles to the (now larger) composition count.
        const baseSum =
          baseline.compositionsBySource.internetArchive +
          baseline.compositionsBySource.wikisource +
          baseline.compositionsBySource.other;
        const afterSum =
          after.compositionsBySource.internetArchive +
          after.compositionsBySource.wikisource +
          after.compositionsBySource.other;
        expect(afterSum).toBe(baseSum + 1);
      },
    });
    // Restoration is the helper's default deep-equality against the baseline.
  });
});

// ─── Stats block + low-confidence list ───────────────────────────────────────

describePostgres('GET /api/admin/audio — stats block + low-confidence list (admin)', () => {
  assertPostgresModels();

  test('recordings stats reconcile to independent counts', async () => {
    const db = await getDb();
    const body = await getBody();
    const [total, completed, transcribing, failed, needsReview] = await Promise.all([
      db.uploadedFile.count({ where: { format: 'audio' } }),
      db.uploadedFile.count({ where: { format: 'audio', processingStatus: 'completed' } }),
      db.uploadedFile.count({ where: { format: 'audio', processingStatus: 'transcribing' } }),
      db.uploadedFile.count({
        where: { format: 'audio', processingStatus: { in: ['failed', 'transcription_failed', 'needs_audio_processing'] } },
      }),
      db.moderationQueue.count({ where: { sourceType: 'recording', status: 'pending' } }),
    ]);
    expect(body.stats.recordings.total).toBe(total);
    expect(body.stats.recordings.completed).toBe(completed);
    expect(body.stats.recordings.transcribing).toBe(transcribing);
    expect(body.stats.recordings.failed).toBe(failed);
    expect(body.stats.recordings.needsReview).toBe(needsReview);
  });

  test('jobs stats reconcile to independent counts', async () => {
    const db = await getDb();
    const body = await getBody();
    const [pending, processing, completed, failed] = await Promise.all([
      db.audioProcessingJob.count({ where: { status: 'pending' } }),
      db.audioProcessingJob.count({ where: { status: 'processing' } }),
      db.audioProcessingJob.count({ where: { status: 'completed' } }),
      db.audioProcessingJob.count({ where: { status: 'failed' } }),
    ]);
    expect(body.stats.jobs.pending).toBe(pending);
    expect(body.stats.jobs.processing).toBe(processing);
    expect(body.stats.jobs.completed).toBe(completed);
    expect(body.stats.jobs.failed).toBe(failed);
  });

  test('rights stats reconcile and byStatus sums to the total', async () => {
    const db = await getDb();
    const body = await getBody();
    const [total, withConsent, withPermission] = await Promise.all([
      db.rightsRecord.count(),
      db.rightsRecord.count({ where: { consentGranted: true } }),
      db.rightsRecord.count({ where: { publicationPermission: true } }),
    ]);
    expect(body.stats.rights.total).toBe(total);
    expect(body.stats.rights.withConsent).toBe(withConsent);
    expect(body.stats.rights.withPublicationPermission).toBe(withPermission);
    const byStatusSum = Object.values(body.stats.rights.byStatus).reduce((a: number, b: number) => a + b, 0);
    expect(byStatusSum).toBe(total);
  });

  test('corrections stats reconcile and status buckets sum to the total', async () => {
    const db = await getDb();
    const body = await getBody();
    const [pending, approved, rejected] = await Promise.all([
      db.transcriptCorrection.count({ where: { status: 'pending' } }),
      db.transcriptCorrection.count({ where: { status: 'approved' } }),
      db.transcriptCorrection.count({ where: { status: 'rejected' } }),
    ]);
    expect(body.stats.corrections.total).toBe(pending + approved + rejected);
    expect(body.stats.corrections.pending).toBe(pending);
    expect(body.stats.corrections.approved).toBe(approved);
    expect(body.stats.corrections.rejected).toBe(rejected);
  });

  test('matches stats reconcile to the composition-match rows', async () => {
    const db = await getDb();
    const body = await getBody();
    const total = await db.compositionMatch.count();
    const sum = Object.values(body.stats.matches).reduce((a: number, b: number) => a + b, 0);
    expect(sum).toBe(total);
  });

  test('modelVersions stat matches the returned list and the registry count (capped at 50)', async () => {
    const db = await getDb();
    const body = await getBody();
    const count = await db.modelVersion.count();
    expect(body.stats.modelVersions).toBe(body.modelVersions.length);
    expect(body.stats.modelVersions).toBe(Math.min(50, count));
  });

  test('low-confidence list is exactly the matching rows, sorted ascending by confidence', async () => {
    const db = await getDb();
    const body = await getBody();
    const expected = await db.uploadedFile.findMany({
      where: {
        processingStatus: 'completed',
        extractedText: { not: null },
        extractionConfidence: { not: null, lt: 0.5 },
      },
      orderBy: { extractionConfidence: 'asc' },
      take: 25,
      select: { id: true },
    });
    expect(body.lowConfidence.map((x: any) => x.id)).toEqual(expected.map((x) => x.id));
    for (const item of body.lowConfidence) {
      expect(typeof item.extractionConfidence).toBe('number');
      expect(item.extractionConfidence).toBeLessThan(0.5);
      expect(typeof item.originalName).toBe('string');
      expect(typeof item.extractedText).toBe('string');
    }
  });

  test('full lifecycle: stats fixtures shift every affected number by the exact delta, then cleanup restores baseline', async () => {
    await withFixtureLifecycle({
      getSnapshot: getSnapshotBody,
      seed: () => createAudioFixture('stats'),
      assertAfter: async (after, baseline, fx) => {
        // recordings: two new audio uploads, both completed; one pending-moderation recording
        expect(after.stats.recordings.total).toBe(baseline.stats.recordings.total + 2);
        expect(after.stats.recordings.completed).toBe(baseline.stats.recordings.completed + 2);
        expect(after.stats.recordings.needsReview).toBe(baseline.stats.recordings.needsReview + 1);

        // jobs: one new processing job
        expect(after.stats.jobs.processing).toBe(baseline.stats.jobs.processing + 1);

        // rights: one record with consent + publication permission
        expect(after.stats.rights.total).toBe(baseline.stats.rights.total + 1);
        expect(after.stats.rights.withConsent).toBe(baseline.stats.rights.withConsent + 1);
        expect(after.stats.rights.withPublicationPermission).toBe(baseline.stats.rights.withPublicationPermission + 1);
        expect(after.stats.rights.byStatus.USER_OWNED ?? 0).toBe((baseline.stats.rights.byStatus.USER_OWNED ?? 0) + 1);

        // corrections: one new pending correction
        expect(after.stats.corrections.total).toBe(baseline.stats.corrections.total + 1);
        expect(after.stats.corrections.pending).toBe(baseline.stats.corrections.pending + 1);

        // matches: one new candidate (seeded only if a composition exists)
        if (fx.matchId) {
          expect(after.stats.matches.candidate ?? 0).toBe((baseline.stats.matches.candidate ?? 0) + 1);
        }

        // low confidence: one new low-confidence transcript
        expect(after.stats.lowConfidence).toBe(baseline.stats.lowConfidence + 1);

        // modelVersions: capped at 50 regardless of the fixture
        const db = await getDb();
        expect(after.stats.modelVersions).toBe(Math.min(50, await db.modelVersion.count()));

        // The fixture rows appear in the corresponding lists (newest first).
        expect(after.recordings.some((r: any) => r.id === fx.uploadHighId)).toBe(true);
        expect(after.recordings.some((r: any) => r.id === fx.uploadLowId)).toBe(true);
        expect(after.processingQueue.some((j: any) => j.id === fx.jobId)).toBe(true);
        expect(after.lowConfidence.some((x: any) => x.id === fx.uploadLowId)).toBe(true);
        expect(after.corrections.some((c: any) => c.id === fx.correctionId)).toBe(true);
        expect(after.rightsRecords.some((r: any) => r.id === fx.rightsId)).toBe(true);
        expect(after.modelVersions.some((m: any) => m.id === fx.modelVersionId)).toBe(true);
      },
      // Restoration is the helper's default deep-equality against the baseline.
    });
  });
});
