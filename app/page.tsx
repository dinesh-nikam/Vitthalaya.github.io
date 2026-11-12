import { db } from '@/src/db/client';
import { VitthalayaPilgrimage } from '@/components/vitthalaya-pilgrimage';

export default async function HomePage() {
  const [
    saints,
    dbCategories,
    totalCompositions,
    totalBooks,
    byTypeRows,
    featuredComposition,
    recentAudios,
  ] = await Promise.all([
    db.saint.findMany({
      orderBy: { nameMarathi: 'asc' },
      take: 8,
      select: {
        id: true,
        nameMarathi: true,
        nameTranslit: true,
        slug: true,
        period: true,
        biography: true,
        region: true,
      },
    }),
    db.category.findMany({
      take: 6,
      select: {
        slug: true,
        nameMarathi: true,
        _count: { select: { compositions: true } },
      },
    }),
    db.composition.count(),
    db.bookPublication.count(),
    db.composition.groupBy({ by: ['type'], _count: { _all: true } }),
    db.composition.findFirst({
      where: {
        fullText: { not: '' },
      },
      select: {
        id: true,
        titleMarathi: true,
        titleTranslit: true,
        slug: true,
        fullText: true,
        type: true,
        saint: {
          select: {
            id: true,
            nameMarathi: true,
            slug: true,
          },
        },
      },
    }),
    db.audio.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        titleMarathi: true,
        titleTranslit: true,
        duration: true,
        audioUrl: true,
        performer: true,
      },
    }),
  ]);

  // Category cards show REAL catalog size: where a category slug maps to a
  // composition type (abhang/aarti/haripath...) use the true per-type count;
  // curated categories without a type mapping keep their join-table count.
  const typeCount = new Map(byTypeRows.map((row) => [row.type.toLowerCase(), row._count._all]));
  const categories = dbCategories.map((category) => ({
    slug: category.slug,
    nameMarathi: category.nameMarathi,
    count: typeCount.get(category.slug.toLowerCase()) ?? category._count.compositions,
  }));

  return (
    <VitthalayaPilgrimage
      saints={saints}
      categories={categories}
      totalBooks={totalBooks}
      totalCompositions={totalCompositions}
      featuredComposition={featuredComposition}
      recentAudios={recentAudios}
    />
  );
}

export const dynamic = 'force-dynamic';
