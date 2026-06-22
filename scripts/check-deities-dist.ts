import { db } from '../src/db/client';

async function main() {
  console.log('--- Checking Deity Distribution in Compositions ---');
  const counts = await db.composition.groupBy({
    by: ['deityId'],
    _count: {
      _all: true
    }
  });

  const deities = await db.deity.findMany();
  const deityMap = new Map(deities.map((d: any) => [d.id, d]));

  counts.forEach((c: any) => {
    const deity = c.deityId ? deityMap.get(c.deityId) : null;
    console.log(`- Deity: ${deity ? deity.nameMarathi : 'None'}, ID: ${c.deityId}, Count: ${c._count._all}`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    if (typeof db.$disconnect === 'function') {
      await db.$disconnect();
    }
  });
