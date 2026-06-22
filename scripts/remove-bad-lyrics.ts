import { db } from '../src/db/client';

async function main() {
  console.log('--- Removing compositions with bad data (YouTube metadata, not lyrics) ---\n');

  // Find YouTube sourced compositions (these have video descriptions not actual lyrics)
  const youtubeBad = await db.composition.findMany({
    where: {
      OR: [
        { source: 'YouTube' },
        { source: 'YouTube - Meenesh Juvekar' },
        { source: 'YouTube - Suman Music Bhakti' },
        // Also remove ones with clear YouTube metadata markers in their text
        { fullText: { contains: 'Stream & Download' } },
        { fullText: { contains: '#PRISMLiveStudio' } },
        { fullText: { contains: 'More\n' } },
        { fullText: { contains: '…...more' } },
        { fullText: { contains: 'Subscribe' } },
      ]
    },
    select: { id: true, titleMarathi: true, source: true }
  });

  console.log(`Found ${youtubeBad.length} compositions with YouTube metadata (not lyrics):`);
  youtubeBad.slice(0, 5).forEach(c => console.log(`  - ${c.titleMarathi?.substring(0, 60)} [${c.source}]`));
  if (youtubeBad.length > 5) console.log(`  ... and ${youtubeBad.length - 5} more`);

  const ids = youtubeBad.map((c: any) => c.id);

  if (ids.length > 0) {
    // Remove all dependent records first (in order)
    const deletedCatLinks = await db.categoryComposition.deleteMany({ where: { compositionId: { in: ids } } });
    console.log(`\nDeleted ${deletedCatLinks.count} category links`);

    const deletedFestLinks = await db.festivalComposition.deleteMany({ where: { compositionId: { in: ids } } });
    console.log(`Deleted ${deletedFestLinks.count} festival links`);

    const deletedEnrichResults = await db.aiEnrichmentResult.deleteMany({ where: { compositionId: { in: ids } } });
    console.log(`Deleted ${deletedEnrichResults.count} AI enrichment results`);

    const deletedEnrichJobs = await db.aiEnrichmentJob.deleteMany({ where: { compositionId: { in: ids } } });
    console.log(`Deleted ${deletedEnrichJobs.count} AI enrichment jobs`);

    const deletedCorrections = await db.correctionSuggestion.deleteMany({ where: { compositionId: { in: ids } } });
    console.log(`Deleted ${deletedCorrections.count} correction suggestions`);

    const deletedVersions = await db.compositionVersion.deleteMany({ where: { compositionId: { in: ids } } });
    console.log(`Deleted ${deletedVersions.count} composition versions`);

    const deletedVerifications = await db.verificationRecord.deleteMany({ where: { compositionId: { in: ids } } });
    console.log(`Deleted ${deletedVerifications.count} verification records`);

    // Now safe to remove the compositions themselves
    const deleted = await db.composition.deleteMany({ where: { id: { in: ids } } });
    console.log(`Deleted ${deleted.count} YouTube-metadata compositions`);
  }

  // Final count
  const remaining = await db.composition.count();
  console.log(`\n✅ Clean compositions remaining: ${remaining}`);

  const bySrc = await db.composition.groupBy({
    by: ['source'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  });
  console.log('\nBy source:');
  bySrc.forEach((s: any) => console.log(`  "${s.source}": ${s._count.id}`));
}

main().catch(console.error);
