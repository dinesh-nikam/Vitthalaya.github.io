/**
 * Digital Pandharpur — T3 evaluation seed.
 *
 * Run once after deploy: `bun run eval:seed`
 *
 * 1. Seeds the frozen golden singing dataset from canonical catalog texts.
 * 2. Seeds the human-verified regression dataset from approved corrections
 *    (empty until moderators approve corrections — reported honestly).
 * 3. Registers the current production ASR (whisper-1) as the **baseline**
 *    active model. This is the model already deployed in production — it is
 *    not a new deployment. New models enter as `candidate` and can only be
 *    activated by an explicit admin action after a passing eval run.
 * 4. Runs a regression evaluation for whisper-1 over its approved
 *    corrections (inconclusive when none exist yet — never a fake pass).
 */

import { db } from '@/src/db/client';
import {
  seedGoldenDatasetsFromCatalog,
  seedRegressionDatasetFromApprovedCorrections,
} from '@/src/eval/datasets';
import { registerModel, getRegistry } from '@/src/eval/registry';
import { runEvaluation } from '@/src/eval/runner';

async function main() {
  const golden = await seedGoldenDatasetsFromCatalog();
  const regression = await seedRegressionDatasetFromApprovedCorrections();

  console.log('== Golden dataset ==');
  golden.created.forEach((c) => console.log(`  + ${c}`));
  golden.skipped.forEach((s) => console.log(`  ~ ${s}`));
  console.log('== Regression dataset ==');
  regression.created.forEach((c) => console.log(`  + ${c}`));
  regression.skipped.forEach((s) => console.log(`  ~ ${s}`));

  // Baseline: the already-deployed production ASR. forceActive is a seed-only
  // bootstrap that the admin API never exposes.
  const existing = await db.modelVersion.findFirst({
    where: { modelName: 'whisper', version: '1' },
    select: { id: true },
  });
  let baselineId: string;
  if (existing) {
    baselineId = existing.id;
    console.log('  ~ whisper-1 already registered.');
  } else {
    const model = await registerModel({
      modelName: 'whisper',
      modelType: 'asr',
      version: '1',
      provider: 'groq',
      config: { asrKey: 'whisper', note: 'Production baseline — deployed via audio-extractor (transcriptionMethod=whisper).' },
      notes: 'Baseline: current production ASR. Registered as active by seed script (already deployed, not a new deployment).',
      forceActive: true,
    });
    baselineId = model.id;
    console.log(`  + whisper-1 registered (active baseline, id=${model.id}).`);
  }

  // Honest regression run for the baseline over its approved corrections.
  const result = await runEvaluation({
    modelVersionId: baselineId,
    actorId: 'seed',
    mode: 'regression',
    notes: 'Seed-time regression run for baseline model.',
  });
  console.log(`== Baseline regression run ==`);
  console.log(
    `  status=${result.status} samples=${result.aggregate.samplesEvaluated} ` +
      `(skipped=${result.aggregate.samplesSkipped}) wer=${(result.aggregate.wer * 100).toFixed(1)}% cer=${(result.aggregate.cer * 100).toFixed(1)}%`
  );
  result.gate.reasons.forEach((r) => console.log(`    - ${r}`));

  console.log('== Registry ==');
  const registry = await getRegistry('asr');
  for (const m of registry) {
    console.log(`  ${m.modelName}@${m.version} [${m.status}] key=${m.versionKey}`);
  }

  await db.$disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
