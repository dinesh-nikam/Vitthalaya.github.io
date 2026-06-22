import { db } from '../src/db/client';

async function main() {
  console.log('=== SAMPLE OF REAL COMPOSITIONS IN DATABASE ===\n');

  // Show 3 samples from each type
  const types = ['ABHANG', 'AARTI', 'STOTRA', 'HARIPATH', 'BHAJAN', 'GAULANI'];

  for (const type of types) {
    const samples = await db.composition.findMany({
      where: { type: { in: [type, type.toLowerCase()] } },
      select: {
        titleMarathi: true,
        fullText: true,
        type: true,
        source: true,
        saint: { select: { nameMarathi: true } },
      },
      take: 2,
    });

    if (samples.length > 0) {
      console.log(`\n━━━ ${type} (${samples.length} shown) ━━━`);
      samples.forEach((c, i) => {
        console.log(`\n[${i + 1}] ${c.titleMarathi}`);
        console.log(`    संत: ${c.saint?.nameMarathi ?? 'अज्ञात'}`);
        console.log(`    स्रोत: ${c.source ?? 'unknown'}`);
        console.log(`    ---`);
        console.log(c.fullText.substring(0, 300) + (c.fullText.length > 300 ? '...' : ''));
      });
    }
  }

  console.log('\n\n=== SUMMARY ===');
  const total = await db.composition.count();
  console.log(`Total real compositions: ${total}`);

  const sources = await db.composition.groupBy({
    by: ['source'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  });
  console.log('\nBy source:');
  sources.forEach((s: any) => console.log(`  "${s.source}": ${s._count.id}`));
}

main().catch(console.error);
