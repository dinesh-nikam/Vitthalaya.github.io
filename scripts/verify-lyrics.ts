import { db } from '../src/db/client';

async function main() {
  const samples = await db.composition.findMany({
    where: { source: 'Scale Test Data Generator' },
    select: {
      titleMarathi: true,
      fullText: true,
      type: true,
      saint: { select: { nameMarathi: true, slug: true } }
    },
    take: 8,
    orderBy: { createdAt: 'asc' }
  });

  samples.forEach((c, i) => {
    console.log(`\n=== #${i + 1} [${c.type}] ${c.saint?.nameMarathi ?? 'unknown'} ===`);
    console.log(`TITLE: ${c.titleMarathi}`);
    console.log(`LYRICS:\n${c.fullText}`);
    console.log('---');
  });

  // Check for the old typo 'name ' (English word in lyrics)
  const typoCheck = await db.composition.count({
    where: {
      source: 'Scale Test Data Generator',
      fullText: { contains: 'name ' }
    }
  });
  console.log(`\n✅ Typo check ('name ' in English): ${typoCheck} records (should be 0)`);

  // Check for index placeholders in signature line
  const indexCheck = await db.composition.count({
    where: {
      source: 'Scale Test Data Generator',
      fullText: { contains: '(क्रमांक' }
    }
  });
  console.log(`✅ Index in fullText check: ${indexCheck} records (should be 0)`);
}

main().catch(console.error);
