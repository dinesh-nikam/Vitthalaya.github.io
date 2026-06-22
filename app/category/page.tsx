import { db } from '@/src/db/client';
import Link from 'next/link';
import { ArrowRight, BookOpen, Layers } from 'lucide-react';
import { canonicalMetadata } from '@/src/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'साहित्य श्रेणी - अभंग, आरती, हरिपाठ आणि इतर प्रकार | डिजिटल पंढरपूर',
  description: 'विठ्ठल भक्ती, देवीचे भजन, शिव स्तोत्रे, गणपती आरत्या, हरिपाठ आणि इतर प्रकारांनुसार भक्ती साहित्य ब्राउझ करा.',
  ...canonicalMetadata({ canonical: '/category' }),
};

// Helper function to return a theme icon based on name
function getCategoryIcon(name: string): string {
  const lowercaseName = name.toLowerCase();
  if (lowercaseName.includes('विठ्ठल') || lowercaseName.includes('vith') || lowercaseName.includes('पांडुरंग')) return '🚩';
  if (lowercaseName.includes('देवी') || lowercaseName.includes('devi') || lowercaseName.includes('शक्ती')) return '🙏';
  if (lowercaseName.includes('शिव') || lowercaseName.includes('shiv') || lowercaseName.includes('महादेव')) return 'ॐ';
  if (lowercaseName.includes('गणपती') || lowercaseName.includes('ganpati') || lowercaseName.includes('गजानन')) return '🌸';
  if (lowercaseName.includes('हरिपाठ') || lowercaseName.includes('haripath')) return '📿';
  if (lowercaseName.includes('आरती') || lowercaseName.includes('aarti') || lowercaseName.includes('आरत्या')) return '🪔';
  if (lowercaseName.includes('भजन') || lowercaseName.includes('bhajan')) return '🎶';
  if (lowercaseName.includes('स्तोत्र') || lowercaseName.includes('stotra')) return '📜';
  if (lowercaseName.includes('अभंग') || lowercaseName.includes('abhang')) return '✍️';
  return '📚';
}

export default async function CategoryIndexPage() {
  // Fetch all categories with parent and composition count
  const allCategories = await db.category.findMany({
    include: {
      _count: {
        select: { compositions: true },
      },
      children: {
        include: {
          _count: {
            select: { compositions: true },
          },
        },
      },
    },
    orderBy: {
      nameMarathi: 'asc',
    },
  });

  // Separate root categories (those without a parent) from subcategories
  // Since we fetch recursively, we can filter for root categories
  const rootCategories = allCategories.filter(cat => !cat.parentId);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="ब्रेडक्रंब">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-saffron">
              मुख्यपृष्ठ
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li className="text-foreground">श्रेणी</li>
        </ol>
      </nav>

      {/* Page Header */}
      <header className="mb-10 space-y-3 relative pb-6 border-b border-saffron/10">
        <h1 className="text-3xl sm:text-4xl font-marathiHeading text-maroon dark:text-saffron font-bold tracking-wide drop-shadow-sm">
          साहित्य श्रेणी <span className="text-saffron animate-pulse">📿</span>
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-3xl font-marathi leading-relaxed">
          वारकरी संप्रदायातील भक्ती प्रकार, देव आणि संतांच्या विविध साहित्य प्रकारांनुसार संपूर्ण साहित्याचे वर्गीकरण.
        </p>
      </header>

      {/* Root Categories Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {rootCategories.map((category) => {
          const icon = getCategoryIcon(category.nameMarathi);
          const totalCompositions = category._count.compositions;

          return (
            <div
              key={category.id}
              className="group glass-premium rounded-2xl border border-saffron/15 p-6 space-y-5 shadow-sm hover:shadow-md hover:shadow-saffron/5 hover-card-premium transition-all duration-500 relative overflow-hidden"
            >
              {/* Card background glowing gradient */}
              <div className="absolute -right-20 -top-20 w-40 h-40 rounded-full bg-saffron/5 blur-3xl pointer-events-none group-hover:bg-saffron/10 transition-colors" />

              {/* Category main header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Glowing Icon Frame */}
                  <div className="w-14 h-14 bg-gradient-to-br from-saffron/10 to-saffron/5 text-saffron border border-saffron/20 rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:from-saffron/20 group-hover:to-saffron/10 transition-all duration-300">
                    {icon}
                  </div>
                  <div>
                    <Link href={`/category/${category.slug}`} className="hover:text-saffron transition-colors">
                      <h2 className="font-marathiHeading text-xl text-maroon dark:text-saffron font-bold leading-snug">
                        {category.nameMarathi}
                      </h2>
                    </Link>
                    <p className="text-xs text-muted-foreground font-sans tracking-wide">
                      {category.nameTranslit}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-saffron/10 text-saffron border border-saffron/20 shadow-sm">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{totalCompositions} साहित्य</span>
                  </span>
                </div>
              </div>

              {/* Description */}
              {category.description && (
                <p className="text-sm text-foreground/80 leading-relaxed font-marathi border-t border-saffron/5 pt-3">
                  {category.description}
                </p>
              )}

              {/* Subcategories (children) */}
              {category.children && category.children.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-saffron/5">
                  <h3 className="text-xs font-bold text-foreground/60 flex items-center gap-1.5 uppercase tracking-wider">
                    <Layers className="w-3.5 h-3.5 text-saffron" />
                    <span>उप-श्रेण्या</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {category.children.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/category/${sub.slug}`}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-background/40 hover:bg-saffron/10 border border-saffron/5 hover:border-saffron/30 transition-all font-marathi text-foreground/90 group/sub"
                      >
                        <span className="truncate group-hover/sub:text-saffron transition-colors font-semibold">
                          {sub.nameMarathi}
                        </span>
                        <span className="text-[10px] bg-saffron/10 text-saffron px-1.5 py-0.5 rounded font-sans font-bold">
                          {sub._count.compositions}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* View all button */}
              <div className="flex justify-end pt-3 border-t border-saffron/5">
                <Link
                  href={`/category/${category.slug}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-saffron group/btn hover:underline"
                >
                  <span>संग्रह उघडा</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover/btn:translate-x-1 transition-transform duration-300" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
