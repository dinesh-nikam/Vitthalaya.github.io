import { db } from '@/src/db/client';
import Link from 'next/link';
import { ArrowRight, BookOpen, ChevronRight, Sparkles, Music, ScrollText, Flame, Sun, Bookmark } from 'lucide-react';
import { canonicalMetadata } from '@/src/lib/seo';
import '@/app/homepage.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'साहित्य श्रेणी : अभंग, आरती, हरिपाठ आणि इतर प्रकार | डिजिटल पंढरपूर',
  description: 'विठ्ठल भक्ती, देवीचे भजन, शिव स्तोत्रे, गणपती आरत्या, हरिपाठ आणि इतर प्रकारांनुसार भक्ती साहित्य वर्गीकरण.',
  ...canonicalMetadata({ canonical: '/category' }),
};

function getCategoryIcon(name: string) {
  const lowercaseName = name.toLowerCase();
  if (lowercaseName.includes('विठ्ठल') || lowercaseName.includes('vith') || lowercaseName.includes('पांडुरंग')) {
    return <Sparkles className="w-5 h-5 text-[var(--dp-gold)]" aria-hidden="true" />;
  }
  if (lowercaseName.includes('देवी') || lowercaseName.includes('devi') || lowercaseName.includes('शक्ती')) {
    return <Sun className="w-5 h-5 text-[var(--dp-gold)]" aria-hidden="true" />;
  }
  if (lowercaseName.includes('गणपती') || lowercaseName.includes('ganpati') || lowercaseName.includes('गजानन')) {
    return <Bookmark className="w-5 h-5 text-[var(--dp-gold)]" aria-hidden="true" />;
  }
  if (lowercaseName.includes('हरिपाठ') || lowercaseName.includes('haripath')) {
    return <ScrollText className="w-5 h-5 text-[var(--dp-gold)]" aria-hidden="true" />;
  }
  if (lowercaseName.includes('आरती') || lowercaseName.includes('aarti') || lowercaseName.includes('आरत्या')) {
    return <Flame className="w-5 h-5 text-[var(--dp-gold)]" aria-hidden="true" />;
  }
  if (lowercaseName.includes('भजन') || lowercaseName.includes('bhajan')) {
    return <Music className="w-5 h-5 text-[var(--dp-gold)]" aria-hidden="true" />;
  }
  return <BookOpen className="w-5 h-5 text-[var(--dp-gold)]" aria-hidden="true" />;
}

export default async function CategoryIndexPage() {
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

  const rootCategories = allCategories.filter((cat) => !cat.parentId);

  return (
    <div className="vitthalaya-shell min-h-screen py-10">
      <div className="vitthalaya-container max-w-5xl">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6" aria-label="ब्रेडक्रंब">
          <ol className="flex items-center gap-2 text-xs font-marathi text-[var(--dp-muted)]">
            <li>
              <Link href="/" className="hover:text-[var(--dp-gold)] transition-colors">
                मुख्यपृष्ठ
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li className="text-[var(--dp-ink)]">साहित्य श्रेणी</li>
          </ol>
        </nav>

        {/* Page Header */}
        <header className="mb-12 text-center max-w-3xl mx-auto">
          <p className="text-xs text-[var(--dp-gold)] font-marathi mb-2">
            वारकरी भक्ती वर्गीकरण
          </p>
          <h1 className="vitthalaya-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
            साहित्य श्रेणी संग्रह
          </h1>
          <p className="vitthalaya-prose text-sm sm:text-base text-[var(--dp-ink-dim)] leading-relaxed mb-6">
            वारकरी संप्रदायातील विविध भक्ती प्रकार, देव आणि संतांच्या रचनेनुसार वर्गीकृत संपूर्ण साहित्याचे दर्शन.
          </p>

          <div className="flex flex-wrap justify-center gap-6 text-xs font-marathi text-[var(--dp-muted)] py-3 px-6 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] max-w-md mx-auto">
            <span>मुख्य प्रकार: <strong className="text-[var(--dp-ink)]">{rootCategories.length}</strong></span>
            <span>एकूण उपश्रेण्या: <strong className="text-[var(--dp-ink)]">{allCategories.length - rootCategories.length}</strong></span>
          </div>
        </header>

        {/* Categories Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {rootCategories.map((category) => {
            const totalCompositions = category._count.compositions;

            return (
              <div
                key={category.id}
                className="vitthalaya-card rounded p-6 space-y-5 border border-[var(--dp-rule)] hover:border-[var(--dp-gold)] transition-colors"
              >
                {/* Category Main Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] flex items-center justify-center shrink-0">
                      {getCategoryIcon(category.nameMarathi)}
                    </div>
                    <div>
                      <Link
                        href={`/category/${category.slug}`}
                        className="vitthalaya-display text-xl font-bold text-[var(--dp-ink)] hover:text-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)]"
                      >
                        {category.nameMarathi}
                      </Link>
                      <p className="text-xs text-[var(--dp-muted)] font-marathi mt-0.5">
                        {category.nameTranslit}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-marathi text-[var(--dp-muted)] bg-[var(--dp-ground-well)] px-2.5 py-1 rounded border border-[var(--dp-rule)] shrink-0">
                    {totalCompositions} रचना
                  </span>
                </div>

                {category.description && (
                  <p className="text-xs text-[var(--dp-ink-dim)] font-marathi leading-relaxed">
                    {category.description}
                  </p>
                )}

                {/* Subcategories if present */}
                {category.children && category.children.length > 0 && (
                  <div className="pt-3 border-t border-[var(--dp-rule)] space-y-2">
                    <h2 className="text-xs font-semibold font-marathi text-[var(--dp-muted)]">
                      उप-श्रेण्या
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {category.children.map((child) => (
                        <Link
                          key={child.id}
                          href={`/category/${child.slug}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] hover:border-[var(--dp-gold)] text-xs text-[var(--dp-ink)] font-marathi transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
                        >
                          <span>{child.nameMarathi}</span>
                          <span className="text-[10px] text-[var(--dp-muted)]">({child._count.compositions})</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <Link
                    href={`/category/${category.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold font-marathi text-[var(--dp-gold)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
                  >
                    <span>सर्व रचना पहा</span>
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
