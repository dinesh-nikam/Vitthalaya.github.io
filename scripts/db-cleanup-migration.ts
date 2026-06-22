import { db } from '../src/db/client';

async function main() {
  console.log('--- STARTING DATABASE CLEANUP & MIGRATION ---');

  // Curated Saint IDs
  const TUKARAM_CURATED = '2cfaaf93-9c97-4475-bdfa-12b057f90035';
  const DNYANESHWAR_CURATED = '964e108d-303b-4bd9-8ab6-54ef22c86bb5';
  const NAMDEV_CURATED = 'd09b8618-6377-4bd7-8b9f-c7fd8e9bb43e';

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

    const categoryMapping = [
      { type: 'AARTI', catId: '47c2f281-eabc-4899-a177-b268a6a0c7ef', name: 'Aarti' },
      { type: 'aarti', catId: '47c2f281-eabc-4899-a177-b268a6a0c7ef', name: 'aarti' },
      { type: 'ABHANG', catId: 'fac86cbf-32f0-4263-9f27-15d4da25f6ed', name: 'Abhang' },
      { type: 'abhang', catId: 'fac86cbf-32f0-4263-9f27-15d4da25f6ed', name: 'abhang' },
      { type: 'अभंग', catId: 'fac86cbf-32f0-4263-9f27-15d4da25f6ed', name: 'अभंग' },
      { type: 'BHAJAN', catId: '23e7e7a3f68e4135bf87e6d154454d75', name: 'Bhajan' },
      { type: 'bhajan', catId: '23e7e7a3f68e4135bf87e6d154454d75', name: 'bhajan' },
      { type: 'GAULANI', catId: '07addb15db6f5462091945cb2ae8f2ad', name: 'Gaulani' },
      { type: 'gaulani', catId: '07addb15db6f5462091945cb2ae8f2ad', name: 'gaulani' },
      { type: 'HARIPATH', catId: '10e79e35-5923-4527-bd10-2165174ece02', name: 'Haripath' },
      { type: 'haripath', catId: '10e79e35-5923-4527-bd10-2165174ece02', name: 'haripath' },
      { type: 'STOTRA', catId: 'dc7834de9ef9c3e5cf8b9f6ca96aab3b', name: 'Stotra' },
      { type: 'stotra', catId: 'dc7834de9ef9c3e5cf8b9f6ca96aab3b', name: 'stotra' },
      { type: 'kirtan', catId: '6f49fd1800b29d93f08fa3c66ab16b11', name: 'kirtan' },
      { type: 'deviche_gane', catId: 'c5c97574f6cf09aca5073f04e8f972f8', name: 'deviche_gane' },
    ];

    for (const mapping of categoryMapping) {
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
    const VITTHAL_DEITY = 'cf8414c5-6298-42fa-b2f0-54c51e4c9ec2';
    const VITTHAL_CATEGORY = '531de1c1-7284-4ddc-aba3-4b5622aba3ea';

    const vitthalMapped = await tx.$executeRawUnsafe(
      `INSERT INTO composition_categories (composition_id, category_id)
       SELECT id, $1 FROM compositions
       WHERE deity_id = $2
       ON CONFLICT (composition_id, category_id) DO NOTHING`,
      VITTHAL_CATEGORY, VITTHAL_DEITY
    );
    console.log(`- Mapped ${vitthalMapped} Vitthal compositions to Vitthal category`);

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
