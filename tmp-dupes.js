const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Find duplicates by title_transliteration
  const dupes = await p.$queryRaw`
    SELECT title_transliteration, COUNT(*)::int as cnt
    FROM composition
    GROUP BY title_transliteration
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
    LIMIT 50
  `;

  console.log('=== DUPLICATE TITLES (by title_transliteration) ===');
  let totalExtra = 0;
  for (const row of dupes) {
    console.log(`  "${row.title_transliteration}" → ${row.cnt} copies`);
    totalExtra += row.cnt - 1;
  }
  console.log(`\nFound ${dupes.length} duplicate groups, ${totalExtra} extra rows`);

  // Also find duplicates by slug
  const slugDupes = await p.$queryRaw`
    SELECT slug, COUNT(*)::int as cnt
    FROM composition
    GROUP BY slug
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
    LIMIT 50
  `;

  console.log('\n=== DUPLICATE SLUGS ===');
  let totalSlugExtra = 0;
  for (const row of slugDupes) {
    console.log(`  "${row.slug}" → ${row.cnt} copies`);
    totalSlugExtra += row.cnt - 1;
  }
  console.log(`\nFound ${slugDupes.length} duplicate slug groups, ${totalSlugExtra} extra rows`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => p['$disconnect']());
