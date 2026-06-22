import { db } from '../src/db/client';

async function main() {
  console.log('--- Checking Saint Distribution ---');
  
  const counts = await db.composition.groupBy({
    by: ['saintId'],
    _count: {
      _all: true
    }
  });

  const saints = await db.saint.findMany();
  const saintMap = new Map(saints.map((s: any) => [s.id, s]));

  console.log('Counts by Saint:');
  counts.forEach((c: any) => {
    const saint = c.saintId ? saintMap.get(c.saintId) : null;
    console.log(`- Saint ID: ${c.saintId}, Name: ${saint ? saint.nameMarathi : 'None'}, Slug: ${saint ? saint.slug : 'N/A'}, Count: ${c._count._all}`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    if (typeof db.$disconnect === 'function') {
      await db.$disconnect();
    }
  });
