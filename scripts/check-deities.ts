import { db } from '../src/db/client';

async function main() {
  console.log('--- Checking Deities ---');
  const deities = await db.deity.findMany();
  deities.forEach((d: any) => {
    console.log(`ID: ${d.id}, Name: ${d.nameMarathi} (${d.nameTranslit})`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    if (typeof db.$disconnect === 'function') {
      await db.$disconnect();
    }
  });
