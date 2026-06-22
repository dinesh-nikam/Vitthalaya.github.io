import { db } from '../src/db/client';

async function main() {
  console.log('--- Cleaning up synthetic scale-test data ---');

  const cc = await db.categoryComposition.deleteMany({
    where: { composition: { source: 'Scale Test Data Generator' } }
  });
  console.log(`Deleted category mappings: ${cc.count}`);

  const c = await db.composition.deleteMany({
    where: { source: 'Scale Test Data Generator' }
  });
  console.log(`Deleted synthetic compositions: ${c.count}`);

  const remaining = await db.composition.count();
  console.log(`\n✅ Real curated compositions remaining: ${remaining}`);

  const byType = await db.composition.groupBy({
    by: ['type'],
    _count: { id: true }
  });
  console.log('\nBy type:');
  byType.forEach((t: any) => console.log(`  ${t.type}: ${t._count.id}`));

  const bySaint = await db.saint.findMany({
    include: { _count: { select: { compositions: true } } }
  });
  console.log('\nBy saint:');
  bySaint.forEach((s: any) => console.log(`  ${s.nameMarathi}: ${s._count.compositions}`));
}

main()
  .catch(console.error)
  .finally(async () => {
    if (typeof db.$disconnect === 'function') {
      await db.$disconnect();
    }
  });
