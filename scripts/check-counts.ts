import { db } from '../src/db/client';

async function main() {
  console.log('--- Database Verification ---');
  const compCount = await db.composition.count();
  console.log(`Total Compositions: ${compCount}`);

  const mappingCount = await db.categoryComposition.count();
  console.log(`Total Category Mappings: ${mappingCount}`);

  const activeCategories = await db.category.findMany({
    include: {
      _count: {
        select: { compositions: true }
      }
    }
  });
  console.log('\nCategories and their composition counts:');
  activeCategories.forEach((c: any) => {
    console.log(`- ${c.nameMarathi} (${c.slug}): ${c._count.compositions}`);
  });

  const activeSaints = await db.saint.findMany({
    include: {
      _count: {
        select: { compositions: true }
      }
    }
  });
  console.log('\nSaints and their composition counts:');
  activeSaints.forEach((s: any) => {
    console.log(`- ${s.nameMarathi} (${s.slug}): ${s._count.compositions}`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    if (typeof db.$disconnect === 'function') {
      await db.$disconnect();
    }
  });
