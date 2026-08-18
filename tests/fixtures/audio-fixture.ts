/**
 * Shared audio-platform DB fixtures + lifecycle helper for admin API
 * integration tests.
 *
 * `createAudioFixture` seeds a disposable set of rows covering every model the
 * /api/admin/audio dashboard reads (composition + version for the discovery
 * block; user + uploads + job + rights + correction + match + moderation +
 * model version for the stats block). `destroyAudioFixture` removes them in
 * dependency order (guarded — a partial seed cleans up cleanly).
 *
 * `withFixtureLifecycle` encodes the truthfulness pattern used across admin
 * endpoint tests:
 *
 *     baseline → seed fixture → assert exact deltas → cleanup →
 *     assert baseline restored
 *
 * so a cached or hardcoded API response fails the test.
 */

import { expect } from 'bun:test';
import { db } from '@/src/db/client';

export type AudioFixtureScope = 'discovery' | 'stats' | 'full';

export interface AudioFixture {
  scope: AudioFixtureScope;
  /** discovery scope */
  compositionId: string | null;
  versionId: string | null;
  /** stats scope */
  userId: string | null;
  uploadHighId: string | null;
  uploadLowId: string | null;
  jobId: string | null;
  rightsId: string | null;
  correctionId: string | null;
  /** null when no composition exists to reference at seed time */
  matchId: string | null;
  moderationId: string | null;
  modelVersionId: string | null;
}

const STAMP = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const FIXTURE_SOURCE = 'Internet Archive — API Test Fixture';
const FIXTURE_REASON = 'OCR variant (API test fixture)';

/**
 * Seed a disposable fixture. Scope selects which rows are created:
 *   - 'discovery': unreviewed OCR-sourced composition + OCR variant version
 *   - 'stats':     user + two audio uploads (high- and low-confidence),
 *                  processing job, rights record, pending correction,
 *                  candidate match, pending-recording moderation row,
 *                  model version
 *   - 'full' (default): everything
 */
export async function createAudioFixture(scope: AudioFixtureScope = 'full'): Promise<AudioFixture> {
  const fx: AudioFixture = {
    scope,
    compositionId: null,
    versionId: null,
    userId: null,
    uploadHighId: null,
    uploadLowId: null,
    jobId: null,
    rightsId: null,
    correctionId: null,
    matchId: null,
    moderationId: null,
    modelVersionId: null,
  };

  try {
    if (scope === 'discovery' || scope === 'full') {
      const stamp = STAMP();
      const comp = await db.composition.create({
        data: {
          titleMarathi: 'API टेस्ट रचना',
          titleTranslit: 'api-test-fixture',
          slug: `api-test-fixture-${stamp}`,
          type: 'ABHANG',
          fullText: 'फिक्स्चर मजकूर — एकनाथ म्हणे विठ्ठल ।',
          source: FIXTURE_SOURCE,
          reviewed: false,
        },
      });
      fx.compositionId = comp.id;
      const version = await db.compositionVersion.create({
        data: {
          compositionId: comp.id,
          versionNumber: 1,
          titleMarathi: comp.titleMarathi,
          titleTranslit: comp.titleTranslit,
          fullText: comp.fullText,
          changeReason: FIXTURE_REASON,
        },
      });
      fx.versionId = version.id;
    }

    if (scope === 'stats' || scope === 'full') {
      const stamp = STAMP();

      const user = await db.user.create({
        data: { email: `stats-fixture-${stamp}@integration.test`, name: 'Stats Fixture' },
      });
      fx.userId = user.id;

      const uploadHigh = await db.uploadedFile.create({
        data: {
          userId: user.id,
          originalName: `stats-fixture-high-${stamp}.webm`,
          mimeType: 'audio/webm',
          sizeBytes: 2048,
          format: 'audio',
          storagePath: `test/fixtures/${stamp}/high.webm`,
          processingStatus: 'completed',
          extractedText: 'फिक्स्चर उच्च आत्मविश्वास मजकूर',
          extractionConfidence: 0.9,
        },
      });
      fx.uploadHighId = uploadHigh.id;

      const uploadLow = await db.uploadedFile.create({
        data: {
          userId: user.id,
          originalName: `stats-fixture-low-${stamp}.webm`,
          mimeType: 'audio/webm',
          sizeBytes: 2048,
          format: 'audio',
          storagePath: `test/fixtures/${stamp}/low.webm`,
          processingStatus: 'completed',
          extractedText: 'फिक्स्चर कमी आत्मविश्वास मजकूर',
          extractionConfidence: 0.0,
        },
      });
      fx.uploadLowId = uploadLow.id;

      const job = await db.audioProcessingJob.create({
        data: { uploadId: uploadHigh.id, kind: 'audio_file', status: 'processing' },
      });
      fx.jobId = job.id;

      const rights = await db.rightsRecord.create({
        data: {
          uploadedFileId: uploadHigh.id,
          userId: user.id,
          rightsStatus: 'USER_OWNED',
          consentGranted: true,
          publicationPermission: true,
          source: 'record',
        },
      });
      fx.rightsId = rights.id;

      const correction = await db.transcriptCorrection.create({
        data: {
          uploadedFileId: uploadHigh.id,
          authorId: user.id,
          originalAsr: 'फिक्स्चर मूळ एएसआर',
          correctedText: 'फिक्स्चर सुधारित मजकूर',
          canonicalText: 'फिक्स्चर कॅनॉनिकल मजकूर',
          confidence: 0.6,
          errorType: 'vocabulary',
          modelVersion: 'fixture-asr@0',
          status: 'pending',
        },
      });
      fx.correctionId = correction.id;

      // Only link a match when the catalog has a composition to reference.
      const anyComposition = await db.composition.findFirst({ select: { id: true } });
      if (anyComposition) {
        const match = await db.compositionMatch.create({
          data: {
            uploadedFileId: uploadHigh.id,
            compositionId: anyComposition.id,
            score: 0.85,
            method: 'verse',
            status: 'candidate',
          },
        });
        fx.matchId = match.id;
      }

      const moderation = await db.moderationQueue.create({
        data: {
          sourceType: 'recording',
          sourceId: uploadHigh.id,
          uploadedFileId: uploadHigh.id,
          draftTitle: 'फिक्स्चर रेकॉर्डिंग',
          draftText: 'फिक्स्चर मसुदा मजकूर',
          status: 'pending',
        },
      });
      fx.moderationId = moderation.id;

      const modelVersion = await db.modelVersion.create({
        data: { modelName: 'fixture-asr', modelType: 'asr', version: stamp, provider: 'custom' },
      });
      fx.modelVersionId = modelVersion.id;
    }

    return fx;
  } catch (err) {
    // Never leak a partially-seeded fixture on failure.
    await destroyAudioFixture(fx);
    throw err;
  }
}

/** Remove the fixture rows in dependency order (safe to call multiple times). */
export async function destroyAudioFixture(fx: AudioFixture): Promise<void> {
  const del = (id: string | null, model: string) =>
    id ? db[model].delete({ where: { id } }).catch(() => {}) : Promise.resolve();

  await del(fx.moderationId, 'moderationQueue');
  await del(fx.correctionId, 'transcriptCorrection');
  await del(fx.rightsId, 'rightsRecord');
  await del(fx.jobId, 'audioProcessingJob');
  await del(fx.matchId, 'compositionMatch');
  await del(fx.uploadHighId, 'uploadedFile');
  await del(fx.uploadLowId, 'uploadedFile');
  await del(fx.modelVersionId, 'modelVersion');
  await del(fx.userId, 'user');
  await del(fx.versionId, 'compositionVersion');
  await del(fx.compositionId, 'composition');
}

export interface LifecycleOptions<T> {
  /** Captures the API response snapshot to assert against. */
  getSnapshot: () => Promise<T>;
  /** Seeds the fixture (delegates to createAudioFixture by default). */
  seed?: () => Promise<AudioFixture>;
  /** Asserts the exact deltas introduced by the seeded rows. */
  assertAfter: (after: T, baseline: T, fixture: AudioFixture) => Promise<void> | void;
  /** Asserts the post-cleanup state; defaults to deep equality with baseline. */
  assertRestored?: (restored: T, baseline: T) => Promise<void> | void;
}

/**
 * The shared truthfulness lifecycle:
 *
 *   baseline → seed → assert exact deltas → cleanup →
 *   assert baseline restored
 *
 * Cleanup runs in a `finally` so a failing delta assertion can never leave
 * fixture rows behind, and the default restoration check is a deep-equality
 * against the baseline (a cached or hardcoded response fails both legs).
 */
export async function withFixtureLifecycle<T>(opts: LifecycleOptions<T>): Promise<void> {
  const baseline = await opts.getSnapshot();
  const fixture = await (opts.seed ?? (() => createAudioFixture('full')))();
  try {
    const after = await opts.getSnapshot();
    await opts.assertAfter(after, baseline, fixture);
  } finally {
    await destroyAudioFixture(fixture);
  }
  const restored = await opts.getSnapshot();
  if (opts.assertRestored) {
    await opts.assertRestored(restored, baseline);
  } else {
    expect(restored).toEqual(baseline);
  }
}
