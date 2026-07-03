import { db } from '@/src/db/client';
import { VitthalayaPilgrimage } from '@/components/vitthalaya-pilgrimage';

export default async function HomePage() {
  const [saints, dbCategories, totalCompositions, totalBooks] = await Promise.all([
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
  ]);

  const categories = dbCategories.map((category) => ({
    slug: category.slug,
    nameMarathi: category.nameMarathi,
    count: category._count.compositions,
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
