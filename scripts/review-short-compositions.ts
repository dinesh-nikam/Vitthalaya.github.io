#!/usr/bin/env bun
/** Review and optionally delete short stub compositions. */
import { db } from '../src/db/client';

const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', X = '\x1b[0m', B = '\x1b[1m';

const MIN_LENGTH = 100; // Minimum meaningful text length

// Find all short compositions
const all = await db.composition.findMany({ orderBy: { fullText: 'asc' }, take: 500 });
const short = all.filter(c => (c.fullText?.length ?? 0) < MIN_LENGTH);

console.log(`${B}Compositions under ${MIN_LENGTH} chars: ${short.length}${X}\n`);

// Group by source
const bySource = new Map<string, typeof short>();
for (const c of short) {
  const src = c.source ?? '?';
  if (!bySource.has(src)) bySource.set(src, []);
  bySource.get(src)!.push(c);
}

console.log(`By source:\n`);
for (const [src, entries] of bySource) {
  console.log(`  ${src.substring(0, 60).padEnd(62)} ${entries.length}`);
}

// Show details
console.log(`\n${B}Details:${X}\n`);
for (const c of short) {
  const len = c.fullText?.length ?? 0;
  const flag = len < 30 ? R : Y;
  console.log(`  ${flag}${String(len).padStart(3)}${X} chars | ${(c.type ?? '?').padEnd(10)} | ${(c.titleMarathi ?? '').substring(0, 60)}`);
  console.log(`      src: ${(c.source ?? '?').substring(0, 70)}`);
  console.log(`      id:  ${c.id}`);
}

// Ask for confirmation before deleting
console.log(`\n${Y}Delete these ${short.length} compositions?${X}`);
console.log(`  Set DELETE=true env var to proceed.`);

if (process.env.DELETE === 'true') {
  let deleted = 0;
  for (const c of short) {
    // Cascade: delete related records first, then the composition
    await db.categoryComposition.deleteMany({ where: { compositionId: c.id } });
    await db.festivalComposition.deleteMany({ where: { compositionId: c.id } });
    await db.bookComposition.deleteMany({ where: { compositionId: c.id } });
    await db.collectionComposition.deleteMany({ where: { compositionId: c.id } });
    await db.aiEnrichmentJob.deleteMany({ where: { compositionId: c.id } });
    await db.aiEnrichmentResult.deleteMany({ where: { compositionId: c.id } });
    await db.correctionSuggestion.deleteMany({ where: { compositionId: c.id } });
    await db.compositionVersion.deleteMany({ where: { compositionId: c.id } });
    await db.verificationRecord.deleteMany({ where: { compositionId: c.id } });
    await db.composition.delete({ where: { id: c.id } });
    deleted++;
  }
  const total = await db.composition.count();
  console.log(`\n${G}Deleted ${deleted} compositions. Total DB: ${total}${X}`);
} else {
  console.log(`\n${C}Dry run. Set DELETE=true to actually delete.${X}`);
}

await db.$disconnect();
