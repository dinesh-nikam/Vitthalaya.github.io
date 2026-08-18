import { db } from '@/src/db/client';
import { VitthalayaPilgrimage } from '@/components/vitthalaya-pilgrimage';

export default async function HomePage() {
  const [saints, dbCategories, totalCompositions, totalBooks, byTypeRows] = await Promise.all([
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
    />
  );
}

export const dynamic = 'force-dynamic';
