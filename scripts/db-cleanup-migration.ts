import { db } from '../src/db/client';

async function main() {
  console.log('--- STARTING DATABASE CLEANUP & MIGRATION ---');

  // Curated Saint IDs
  const TUKARAM_CURATED = '4dbae91c-b434-434f-975d-8e4a8aa74a9b';
  const DNYANESHWAR_CURATED = '0ffe900b-dff0-4d94-ad27-ad43b08f5ca1';
  const NAMDEV_CURATED = '3657990a-f0af-4661-b9f3-6de714af3571';

  // Duplicate Saint IDs to merge and delete
  const TUKARAM_DUP = '1afd754a22f10ac44eeaf52f6837b9fd';
  const DNYANESHWAR_DUP = '86cf3a8bd359e76315a3d07418989a53';
  const NAMDEV_DUP = '0c691d7bad524980d6a3f68ea91d116a';

  await db.$transaction(async (tx: any) => {
    // 1. Remap saint_id on compositions
    console.log('Remapping compositions to curated saint records...');
    
    const tukaramComps = await tx.$executeRawUnsafe(
      `UPDATE compositions SET saint_id = $1 WHERE saint_id = $2`,
      TUKARAM_CURATED, TUKARAM_DUP
    );
    console.log(`- Remapped ${tukaramComps} compositions to Tukaram Maharaj`);

    const dnyaneshwarComps = await tx.$executeRawUnsafe(
      `UPDATE compositions SET saint_id = $1 WHERE saint_id = $2`,
      DNYANESHWAR_CURATED, DNYANESHWAR_DUP
    );
    console.log(`- Remapped ${dnyaneshwarComps} compositions to Dnyaneshwar Maharaj`);

    const namdevComps = await tx.$executeRawUnsafe(
      `UPDATE compositions SET saint_id = $1 WHERE saint_id = $2`,
      NAMDEV_CURATED, NAMDEV_DUP
    );
    console.log(`- Remapped ${namdevComps} compositions to Namdev Maharaj`);

    // 2. Remap saint_id on canonical_records
    console.log('\nRemapping canonical_records to curated saint records...');
    
    const tukaramCanonical = await tx.$executeRawUnsafe(
      `UPDATE canonical_records SET saint_id = $1 WHERE saint_id = $2`,
      TUKARAM_CURATED, TUKARAM_DUP
    );
    console.log(`- Remapped ${tukaramCanonical} canonical records to Tukaram Maharaj`);

    const dnyaneshwarCanonical = await tx.$executeRawUnsafe(
      `UPDATE canonical_records SET saint_id = $1 WHERE saint_id = $2`,
      DNYANESHWAR_CURATED, DNYANESHWAR_DUP
    );
    console.log(`- Remapped ${dnyaneshwarCanonical} canonical records to Dnyaneshwar Maharaj`);

    const namdevCanonical = await tx.$executeRawUnsafe(
      `UPDATE canonical_records SET saint_id = $1 WHERE saint_id = $2`,
      NAMDEV_CURATED, NAMDEV_DUP
    );
    console.log(`- Remapped ${namdevCanonical} canonical records to Namdev Maharaj`);

    // 3. Clean up saint relationships involving duplicates
    console.log('\nCleaning up saint relationships...');
    const deletedRels = await tx.$executeRawUnsafe(
      `DELETE FROM saint_relationships WHERE saint_id IN ($1, $2, $3) OR related_saint_id IN ($1, $2, $3)`,
      TUKARAM_DUP, DNYANESHWAR_DUP, NAMDEV_DUP
    );
    console.log(`- Deleted ${deletedRels} relationship records referencing duplicate saints`);

    // 4. Delete the duplicate saint records
    console.log('\nDeleting duplicate placeholder saint records...');
    
    const deletedSaints = await tx.$executeRawUnsafe(
      `DELETE FROM saints WHERE id IN ($1, $2, $3)`,
      TUKARAM_DUP, DNYANESHWAR_DUP, NAMDEV_DUP
    );
    console.log(`- Deleted ${deletedSaints} duplicate saint records`);

    // 5. Bulk map compositions to categories based on type and deityId
    console.log('\nBulk mapping compositions to categories...');
    const dbCategories = await tx.category.findMany();
    
    const findCategory = (slugName: string) => {
      const lower = slugName.toLowerCase();
      const match = dbCategories.find((c: any) => 
        c.slug.toLowerCase() === lower || 
        c.nameTranslit.toLowerCase() === lower
      );
      return match?.id;
    };

    const categoryMapping = [
      { type: 'AARTI', catId: findCategory('aarti'), name: 'Aarti' },
      { type: 'aarti', catId: findCategory('aarti'), name: 'aarti' },
      { type: 'ABHANG', catId: findCategory('abhang'), name: 'Abhang' },
      { type: 'abhang', catId: findCategory('abhang'), name: 'abhang' },
      { type: 'अभंग', catId: findCategory('abhang'), name: 'अभंग' },
      { type: 'BHAJAN', catId: findCategory('bhajan') || findCategory('abhang'), name: 'Bhajan' },
      { type: 'bhajan', catId: findCategory('bhajan') || findCategory('abhang'), name: 'bhajan' },
      { type: 'GAULANI', catId: findCategory('gaulani') || findCategory('abhang'), name: 'Gaulani' },
      { type: 'gaulani', catId: findCategory('gaulani') || findCategory('abhang'), name: 'gaulani' },
      { type: 'HARIPATH', catId: findCategory('haripath'), name: 'Haripath' },
      { type: 'haripath', catId: findCategory('haripath'), name: 'haripath' },
      { type: 'STOTRA', catId: findCategory('stotra') || findCategory('aarti'), name: 'Stotra' },
      { type: 'stotra', catId: findCategory('stotra') || findCategory('aarti'), name: 'stotra' },
      { type: 'kirtan', catId: findCategory('kirtan') || findCategory('abhang'), name: 'kirtan' },
      { type: 'deviche_gane', catId: findCategory('deviche_gane') || findCategory('deviche-gane') || findCategory('aarti'), name: 'deviche_gane' },
    ];

    for (const mapping of categoryMapping) {
      if (!mapping.catId) {
        console.log(`- Skipping type '${mapping.type}': category not found in DB`);
        continue;
      }
      const inserted = await tx.$executeRawUnsafe(
        `INSERT INTO composition_categories (composition_id, category_id)
         SELECT id, $1 FROM compositions
         WHERE type = $2
         ON CONFLICT (composition_id, category_id) DO NOTHING`,
        mapping.catId, mapping.type
      );
      console.log(`- Mapped ${inserted} compositions of type '${mapping.type}' to category ID '${mapping.catId}'`);
    }

    // 6. Map Vitthal deity compositions to vitthal category
    console.log('\nMapping Vitthal compositions to Vitthal category...');
    const vitthalDeityRecord = await tx.deity.findFirst({ where: { nameTranslit: 'Vitthal' } });
    const VITTHAL_DEITY = vitthalDeityRecord?.id;
    const VITTHAL_CATEGORY = findCategory('vitthal');

    if (VITTHAL_DEITY && VITTHAL_CATEGORY) {
      const vitthalMapped = await tx.$executeRawUnsafe(
        `INSERT INTO composition_categories (composition_id, category_id)
         SELECT id, $1 FROM compositions
         WHERE deity_id = $2
         ON CONFLICT (composition_id, category_id) DO NOTHING`,
        VITTHAL_CATEGORY, VITTHAL_DEITY
      );
      console.log(`- Mapped ${vitthalMapped} Vitthal compositions to Vitthal category`);
    } else {
      console.log(`- Warning: Vitthal deity or category not found. Deity: ${!!VITTHAL_DEITY}, Category: ${!!VITTHAL_CATEGORY}`);
    }

    console.log('\nChecking final stats...');
    const totalComps = await tx.composition.count();
    console.log(`Total Compositions: ${totalComps}`);

    const activeSaints = await tx.saint.findMany({ select: { nameMarathi: true, slug: true } });
    console.log('Active Saints:');
    activeSaints.forEach((s: any) => {
      console.log(`- ${s.nameMarathi} (${s.slug})`);
    });

    const activeCategories = await tx.category.findMany({
      include: {
        _count: {
          select: { compositions: true }
        }
      }
    });
    console.log('Categories & Compositions count:');
    activeCategories.forEach((c: any) => {
      console.log(`- ${c.nameMarathi} (${c.slug}): ${c._count.compositions}`);
    });
  });

  console.log('\n--- DATABASE CLEANUP & MIGRATION COMPLETED SUCCESSFULLY ---');
}

main()
  .catch(console.error)
  .finally(async () => {
    if (typeof db.$disconnect === 'function') {
      await db.$disconnect();
    }
  });
