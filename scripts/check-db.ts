import { db } from '../src/db/client';

async function main() {
  console.log('--- Checking Saint Details ---');
  
  const saints = await db.saint.findMany();
  saints.forEach((s: any) => {
    console.log(`\nID: ${s.id}`);
    console.log(`Name: ${s.nameMarathi} (${s.nameTranslit})`);
    console.log(`Slug: ${s.slug}`);
    console.log(`Period: ${s.period}`);
    console.log(`Region: ${s.region}`);
    console.log(`Biography (length): ${s.biography ? s.biography.length : 0}`);
    console.log(`Image: ${s.imageUrl}`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    if (typeof db.$disconnect === 'function') {
      await db.$disconnect();
    }
  });
