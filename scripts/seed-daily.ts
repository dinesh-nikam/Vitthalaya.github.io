/**
 * Seed the DailyFeature rotation for the /daily page.
 *
 * Every entry references a real DB record:
 *   - ABHANG       → authentic compositions where body is pure poetic verse (fullText), with canonical titles
 *   - SAINT        → every saint in the saints table
 *   - THOUGHT      → real opening lines from the composition corpus
 *   - FESTIVAL     → every festival in the festivals table
 *   - DID_YOU_KNOW → documented facts derived from saint/temple records
 *
 * Idempotent: each row uses a deterministic id (`daily-<slot>-<index>`), so
 * re-running replaces the pool without duplicating.
 *
 * Run: bun run seed:daily
 */
import { PrismaClient } from '@prisma/client';
import { extractCanonicalOpeningLine } from '../src/services/composition-reviewer.service';

const prisma = new PrismaClient();

const DAY_EPOCH = Date.UTC(2026, 0, 1); // rotation anchor

function featureId(slot: string, index: number): string {
  return `daily-${slot.toLowerCase()}-${index}`;
}

/** Clean a verse line into a short thought (max ~110 chars). */
function toThought(fullText: string | null): string | null {
  if (!fullText) return null;
  const lines = fullText
    .split(/\n+/)
    .map((l) => l.replace(/[॥।|\s]+$/g, '').trim())
    .filter((l) => l.length >= 12 && l.length <= 140);
  return lines[0] ?? null;
}

async function main() {
  console.log('Seeding DailyFeature rotation...');

  // ── ABHANG slot: quality compositions (authentic verse + linked saint) ──
  const abhangs = await prisma.composition.findMany({
    where: {
      saintId: { not: null },
      fullText: { not: '' },
      type: 'ABHANG',
    },
    select: {
      id: true,
      titleMarathi: true,
      titleTranslit: true,
      slug: true,
      fullText: true,
      meaning: true,
      saintId: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  // Deterministic shuffle so the same 40 don't always lead.
  const shuffledAbhangs = abhangs
    .map((a, i) => ({ a, key: (i * 31) % Math.max(abhangs.length, 1) }))
    .sort((x, y) => x.key - y.key)
    .map((x) => x.a)
    .slice(0, 40);

  console.log(`  ABHANG pool: ${shuffledAbhangs.length} (from ${abhangs.length} available)`);

  // ── THOUGHT slot: real verse lines from the corpus ──
  const thoughtCompositions = (
    await prisma.composition.findMany({
      where: { saintId: { not: null } },
      select: { id: true, fullText: true, titleTranslit: true, saintId: true },
      take: 3000,
    })
  ).filter((c) => c.fullText);
  const thoughts: Array<{
    id: string;
    title: string;
    body: string;
    saintId: string | null;
  }> = [];
  const seen = new Set<string>();
  for (const c of thoughtCompositions) {
    const body = toThought(c.fullText);
    if (!body || seen.has(body)) continue;
    seen.add(body);
    thoughts.push({ id: c.id, title: c.titleTranslit || 'अभंग', body, saintId: c.saintId });
    if (thoughts.length >= 30) break;
  }
  console.log(`  THOUGHT pool: ${thoughts.length} real verse lines`);

  // ── SAINT slot: all saints ──
  const saints = await prisma.saint.findMany({
    select: { id: true, nameMarathi: true, nameTranslit: true, slug: true, period: true },
    orderBy: { nameMarathi: 'asc' },
  });
  console.log(`  SAINT pool: ${saints.length}`);

  // ── FESTIVAL slot: all festivals ──
  const festivals = await prisma.festival.findMany({
    select: { id: true, nameMarathi: true, nameTranslit: true, dateRule: true },
    orderBy: { nameMarathi: 'asc' },
  });
  console.log(`  FESTIVAL pool: ${festivals.length}`);

  // ── DID_YOU_KNOW: documented facts derived from real records ──
  const didYouKnow: Array<{ title: string; body: string; saintId?: string; festivalId?: string }> = [];
  const saintsWithFacts = await prisma.saint.findMany({
    where: { biography: { not: null } },
    select: { id: true, nameMarathi: true, period: true, region: true, biography: true },
  });
  for (const s of saintsWithFacts) {
    const bio = (s.biography || '').replace(/\s+/g, ' ').trim();
    if (!bio) continue;
    // First sentence = a documented, factual claim about the saint.
    const sentence = bio.split(/[।.।]/)[0]?.trim();
    if (sentence && sentence.length > 20 && sentence.length < 200) {
      didYouKnow.push({
        title: s.nameMarathi,
        body: sentence,
        saintId: s.id,
      });
    }
  }
  // Temple facts.
  const temples = await prisma.temple.findMany({
    where: { description: { not: null } },
    select: { nameMarathi: true, description: true, location: true },
    take: 10,
  });
  for (const t of temples) {
    const desc = (t.description || '').replace(/\s+/g, ' ').trim();
    const sentence = desc.split(/[।.]/)[0]?.trim();
    if (sentence && sentence.length > 20 && sentence.length < 200) {
      didYouKnow.push({ title: t.nameMarathi, body: sentence });
    }
  }
  console.log(`  DID_YOU_KNOW pool: ${didYouKnow.length} documented facts`);

  // ── Upsert everything (deterministic ids) ──
  let upserted = 0;

  for (const [i, a] of shuffledAbhangs.entries()) {
    const canonicalTitle = extractCanonicalOpeningLine(a.fullText) || a.titleMarathi;
    await prisma.dailyFeature.upsert({
      where: { id: featureId('ABHANG', i) },
      update: {
        slot: 'ABHANG',
        rotationIndex: i,
        titleMarathi: canonicalTitle,
        bodyMarathi: a.fullText, // PURE SACRED VERSE POETRY
        compositionId: a.id,
        saintId: a.saintId,
        festivalId: null,
      },
      create: {
        id: featureId('ABHANG', i),
        slot: 'ABHANG',
        rotationIndex: i,
        titleMarathi: canonicalTitle,
        bodyMarathi: a.fullText, // PURE SACRED VERSE POETRY
        compositionId: a.id,
        saintId: a.saintId,
      },
    });
    upserted++;
  }

  for (const [i, t] of thoughts.entries()) {
    await prisma.dailyFeature.upsert({
      where: { id: featureId('THOUGHT', i) },
      update: {
        slot: 'THOUGHT',
        rotationIndex: i,
        titleMarathi: t.title,
        bodyMarathi: t.body,
        compositionId: t.id,
        saintId: t.saintId,
        festivalId: null,
      },
      create: {
        id: featureId('THOUGHT', i),
        slot: 'THOUGHT',
        rotationIndex: i,
        titleMarathi: t.title,
        bodyMarathi: t.body,
        compositionId: t.id,
        saintId: t.saintId,
      },
    });
    upserted++;
  }

  for (const [i, s] of saints.entries()) {
    await prisma.dailyFeature.upsert({
      where: { id: featureId('SAINT', i) },
      update: {
        slot: 'SAINT',
        rotationIndex: i,
        titleMarathi: s.nameMarathi,
        bodyMarathi: s.period || null,
        compositionId: null,
        saintId: s.id,
        festivalId: null,
      },
      create: {
        id: featureId('SAINT', i),
        slot: 'SAINT',
        rotationIndex: i,
        titleMarathi: s.nameMarathi,
        bodyMarathi: s.period || null,
        saintId: s.id,
      },
    });
    upserted++;
  }

  for (const [i, f] of festivals.entries()) {
    await prisma.dailyFeature.upsert({
      where: { id: featureId('FESTIVAL', i) },
      update: {
        slot: 'FESTIVAL',
        rotationIndex: i,
        titleMarathi: f.nameMarathi,
        bodyMarathi: f.dateRule || null,
        compositionId: null,
        saintId: null,
        festivalId: f.id,
      },
      create: {
        id: featureId('FESTIVAL', i),
        slot: 'FESTIVAL',
        rotationIndex: i,
        titleMarathi: f.nameMarathi,
        bodyMarathi: f.dateRule || null,
        festivalId: f.id,
      },
    });
    upserted++;
  }

  for (const [i, d] of didYouKnow.entries()) {
    await prisma.dailyFeature.upsert({
      where: { id: featureId('DID_YOU_KNOW', i) },
      update: {
        slot: 'DID_YOU_KNOW',
        rotationIndex: i,
        titleMarathi: d.title,
        bodyMarathi: d.body,
        compositionId: null,
        saintId: d.saintId ?? null,
        festivalId: d.festivalId ?? null,
      },
      create: {
        id: featureId('DID_YOU_KNOW', i),
        slot: 'DID_YOU_KNOW',
        rotationIndex: i,
        titleMarathi: d.title,
        bodyMarathi: d.body,
        saintId: d.saintId ?? null,
        festivalId: d.festivalId ?? null,
      },
    });
    upserted++;
  }

  // Remove stale entries (pool shrank between runs).
  const expectedIds = new Set<string>([
    ...shuffledAbhangs.map((_, i) => featureId('ABHANG', i)),
    ...thoughts.map((_, i) => featureId('THOUGHT', i)),
    ...saints.map((_, i) => featureId('SAINT', i)),
    ...festivals.map((_, i) => featureId('FESTIVAL', i)),
    ...didYouKnow.map((_, i) => featureId('DID_YOU_KNOW', i)),
  ]);
  const stale = await prisma.dailyFeature.findMany({ select: { id: true } });
  const staleIds = stale.filter((r) => !expectedIds.has(r.id)).map((r) => r.id);
  if (staleIds.length) {
    await prisma.dailyFeature.deleteMany({ where: { id: { in: staleIds } } });
    console.log(`  removed ${staleIds.length} stale entries`);
  }

  const total = await prisma.dailyFeature.count();
  console.log(`\nDone: ${total} daily features seeded (${upserted} upserted, anchor ${new Date(DAY_EPOCH).toISOString()})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
