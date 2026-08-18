/**
 * Digital Pandharpur — Golden evaluation datasets.
 *
 * Datasets are frozen before they can gate a model, and every sample's
 * reference text is rights-cleared and human-verified: either canonical
 * catalog text (public-domain devotional compositions) or an *approved*
 * TranscriptCorrection (the moderator gate from T2). Unconsented user
 * recordings are never used as golden references.
 */

import { db } from '@/src/db/client';

export interface GoldenSampleInput {
  sampleLabel: string;
  referenceText: string;
  sourceCompositionId?: string | null;
  audioUrl?: string | null;
}

/** A scored pair: golden reference vs a model's hypothesis (for regression). */
export interface RegressionSample {
  sampleLabel: string;
  reference: string;
  hypothesis: string;
}

export interface CreateDatasetInput {
  name: string;
  description?: string | null;
  datasetType: string; // asr | marathi | singing | enhancement
  version: string;
  samples: GoldenSampleInput[];
  /** Golden sets are frozen at creation so later edits cannot move the goalposts. */
  status?: 'frozen' | 'active';
}

/** Composition types that are sung devotional repertoire (T3 golden focus). */
export const SINGING_COMPOSITION_TYPES = ['abhang', 'bhajan', 'aarti', 'stotra', 'haripath', 'kirtan'];

/**
 * The live dataset that grows as moderators approve TranscriptCorrections.
 * Unlike the frozen golden sets, this one stays `active` and gains a sample
 * per approved correction — real human-verified training/eval data.
 */
export const APPROVED_CORRECTIONS_DATASET_NAME =
  'Approved Human-Verified Corrections — Live';

/** Human-readable sample label for an approved correction. */
export function correctionSampleLabel(opts: {
  uploadName: string | null | undefined;
  modelVersion: string | null | undefined;
  correctionId: string;
}): string {
  const src = opts.uploadName?.trim() || `रेकॉर्डिंग ${opts.correctionId.slice(0, 8)}`;
  return opts.modelVersion ? `${src} (${opts.modelVersion})` : src;
}

/**
 * Write one approved correction into the live eval dataset as a golden
 * sample (reference = approved correctedText; hypothesis provenance = the
 * verbatim originalAsr). Idempotent per correction via the unique
 * `sourceCorrectionId`, so re-approvals never duplicate samples.
 */
export async function appendApprovedCorrection(input: {
  correctionId: string;
  originalAsr: string;
  correctedText: string;
  modelVersion?: string | null;
  audioUrl?: string | null;
  uploadName?: string | null;
}): Promise<void> {
  // `name` is not unique in the schema, so locate the live dataset explicitly.
  let live = await db.evaluationDataset.findFirst({
    where: { name: APPROVED_CORRECTIONS_DATASET_NAME },
    select: { id: true, sampleCount: true },
  });
  if (!live) {
    live = await db.evaluationDataset.create({
      data: {
        name: APPROVED_CORRECTIONS_DATASET_NAME,
        description:
          'Live golden set: one sample per moderator-approved TranscriptCorrection. ' +
          'Reference = approved corrected text; hypotheses are the verbatim original ASR. ' +
          'Consumed by the T3 eval loop (regression + golden modes).',
        datasetType: 'asr',
        version: '1.0',
        status: 'active',
        sampleCount: 0,
      },
      select: { id: true, sampleCount: true },
    });
  }

  const sample = await db.evaluationSample.upsert({
    where: { sourceCorrectionId: input.correctionId },
    create: {
      datasetId: live.id,
      sampleLabel: correctionSampleLabel({
        uploadName: input.uploadName,
        modelVersion: input.modelVersion,
        correctionId: input.correctionId,
      }),
      referenceText: input.correctedText.trim(),
      sourceCorrectionId: input.correctionId,
      audioUrl: input.audioUrl ?? null,
      sortOrder: live.sampleCount,
    },
    update: {
      referenceText: input.correctedText.trim(),
      audioUrl: input.audioUrl ?? null,
    },
    select: { id: true },
  });

  // Keep sampleCount in sync only when this was a brand-new sample.
  if (sample.id) {
    const count = await db.evaluationSample.count({ where: { datasetId: live.id } });
    await db.evaluationDataset.update({
      where: { id: live.id },
      data: { sampleCount: count },
    });
  }
}

export async function createGoldenDataset(input: CreateDatasetInput) {
  return db.$transaction(async (tx) => {
    const dataset = await tx.evaluationDataset.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        datasetType: input.datasetType,
        version: input.version,
        status: input.status ?? 'frozen',
        sampleCount: input.samples.length,
        samples: {
          create: input.samples.map((s, i) => ({
            sampleLabel: s.sampleLabel,
            referenceText: s.referenceText,
            sourceCompositionId: s.sourceCompositionId ?? null,
            audioUrl: s.audioUrl ?? null,
            sortOrder: i,
          })),
        },
      },
      include: { samples: { orderBy: { sortOrder: 'asc' } } },
    });
    return dataset;
  });
}

export async function getDatasetWithSamples(id: string) {
  return db.evaluationDataset.findUnique({
    where: { id },
    include: { samples: { orderBy: { sortOrder: 'asc' } } },
  });
}

export async function listDatasets(datasetType?: string) {
  return db.evaluationDataset.findMany({
    where: datasetType ? { datasetType } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { samples: { select: { id: true, sampleLabel: true, referenceText: true }, orderBy: { sortOrder: 'asc' } } },
  });
}

/**
 * Seed a golden singing dataset from the canonical catalog. Only compositions
 * that already carry canonical full text are used — the references are the
 * human-verified catalog texts, not generated content.
 */
export async function seedGoldenDatasetsFromCatalog(): Promise<{ created: string[]; skipped: string[] }> {
  const compositions = await db.composition.findMany({
    where: {
      fullText: { not: null },
      type: { in: SINGING_COMPOSITION_TYPES },
    },
    select: {
      id: true,
      titleTranslit: true,
      titleMarathi: true,
      type: true,
      fullText: true,
      saint: { select: { nameTranslit: true, nameMarathi: true } },
    },
    take: 200,
  });

  const withText = compositions.filter(
    (c) => typeof c.fullText === 'string' && c.fullText.trim().length > 0
  );

  const created: string[] = [];
  const skipped: string[] = [];

  const existing = await db.evaluationDataset.findFirst({
    where: { name: 'Golden Marathi Singing — Catalog Abhangs' },
    select: { id: true },
  });

  if (existing) {
    return { created: [], skipped: ['Golden Marathi Singing — Catalog Abhangs already exists.'] };
  }

  if (withText.length === 0) {
    return {
      created: [],
      skipped: ['No catalog compositions with canonical full text found — nothing to seed.'],
    };
  }

  // Cap at a reasonable golden size; sorted by type then title for stability.
  const samples: GoldenSampleInput[] = withText.slice(0, 30).map((c) => {
    const saint = c.saint?.nameTranslit || c.saint?.nameMarathi || null;
    return {
      sampleLabel: `${c.titleMarathi || c.titleTranslit || 'रचना'}${saint ? ` — ${saint}` : ''} (${c.type})`,
      referenceText: (c.fullText as string).trim(),
      sourceCompositionId: c.id,
    };
  });

  await createGoldenDataset({
    name: 'Golden Marathi Singing — Catalog Abhangs',
    description:
      'Frozen golden set derived from canonical catalog texts (rights-cleared public-domain devotional compositions). ' +
      'Reference transcripts are the human-verified catalog full texts.',
    datasetType: 'singing',
    version: '1.0',
    samples,
  });

  created.push(`Golden Marathi Singing — Catalog Abhangs (${samples.length} samples)`);
  return { created, skipped };
}

/**
 * Materialize a regression sample set for a model from *approved*
 * TranscriptCorrections — the human-verified corrected text is the reference,
 * the model's verbatim original ASR is the hypothesis. Real data, real gates.
 */
export async function materializeRegressionSamples(
  versionKey: string,
  limit = 200
): Promise<RegressionSample[]> {
  const corrections = await db.transcriptCorrection.findMany({
    where: {
      status: 'approved',
      modelVersion: versionKey,
      // correctedText/originalAsr are non-nullable String columns — no null filter needed.
    },
    select: {
      id: true,
      originalAsr: true,
      correctedText: true,
      upload: { select: { originalName: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });

  return corrections.map((c) => ({
    sampleLabel: c.upload?.originalName || `Correction ${c.id.slice(0, 8)}`,
    reference: (c.correctedText as string).trim(),
    hypothesis: (c.originalAsr as string).trim(),
  }));
}

/** Frozen dataset of all approved corrections (any model) for the regression suite. */
export async function seedRegressionDatasetFromApprovedCorrections(): Promise<{ created: string[]; skipped: string[] }> {
  const existing = await db.evaluationDataset.findFirst({
    where: { name: 'Golden Human-Verified Regression — Approved Corrections' },
    select: { id: true },
  });
  if (existing) {
    return { created: [], skipped: ['Golden Human-Verified Regression — Approved Corrections already exists.'] };
  }

  const corrections = await db.transcriptCorrection.findMany({
    where: { status: 'approved' },
    select: { id: true, originalAsr: true, correctedText: true, modelVersion: true, upload: { select: { originalName: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });

  if (corrections.length === 0) {
    return { created: [], skipped: ['No approved corrections yet — the regression dataset will be seeded once moderators approve corrections.'] };
  }

  await createGoldenDataset({
    name: 'Golden Human-Verified Regression — Approved Corrections',
    description:
      'Frozen regression set: each sample pairs a model\u2019s verbatim original ASR (hypothesis) with the moderator-approved corrected text (reference).',
    datasetType: 'asr',
    version: '1.0',
    samples: corrections.map((c) => ({
      sampleLabel: `${c.upload?.originalName || 'रेकॉर्डिंग'} (${c.modelVersion ?? 'unknown'})`,
      referenceText: (c.correctedText as string).trim(),
    })),
  });

  return { created: ['Golden Human-Verified Regression — Approved Corrections'], skipped: [] };
}
