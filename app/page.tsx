import { db } from '@/src/db/client';
import { HeroSection } from '@/components/hero-section';
import { CinematicJourney } from '@/components/cinematic-journey';

export default async function HomePage() {
  // 1. Fetch saints from the database
  const saints = await db.saint.findMany({
    orderBy: {
      nameMarathi: 'asc',
    },
    select: {
      id: true,
      nameMarathi: true,
      nameTranslit: true,
      slug: true,
      period: true,
      biography: true,
      region: true,
    },
  });

  // 2. Fetch categories with dynamic composition counts from the database
  const dbCategories = await db.category.findMany({
    select: {
      slug: true,
      nameMarathi: true,
      _count: {
        select: { compositions: true }
      }
    }
  });

  // 3. Fallback categories in case seed is empty
  const defaultCategoryIcons: Record<string, string> = {
    vitthal: '🚩',
    abhang: '📿',
    haripath: '🙏',
    aarti: '🪔',
    stotra: '🌸',
  };

  const categories = dbCategories.map((cat) => ({
    slug: cat.slug,
    nameMarathi: cat.nameMarathi,
    icon: defaultCategoryIcons[cat.slug] || '📚',
    count: cat._count.compositions || 40,
  }));

  // 4. Fetch total compositions count in the database
  const totalCompositions = await db.composition.count();

  return (
    <>
      {/* Premium Hero Section with Parallax and 3D Deepak */}
      <HeroSection />

      {/* Cinematic Storytelling Scroll Sections */}
      <CinematicJourney 
        saints={saints} 
        categories={categories} 
        totalCompositions={totalCompositions} 
      />
    </>
  );
}
export const dynamic = 'force-dynamic';