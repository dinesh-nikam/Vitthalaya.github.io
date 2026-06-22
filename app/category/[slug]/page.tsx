import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/src/db/client';
import { ArrowLeft, ArrowRight, BookOpen, Layers } from 'lucide-react';
import { categorySchema, canonicalMetadata } from '@/src/lib/seo';

export const dynamic = 'force-dynamic';

function toDevanagariDigits(num: number): string {
  const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  const formatted = num.toString().padStart(2, '0');
  return formatted
    .split('')
    .map(digit => {
      const idx = parseInt(digit, 10);
      return isNaN(idx) ? digit : devanagariDigits[idx];
    })
    .join('');
}

const typeMap: Record<string, string> = {
  'abhang': 'अभंग',
  'aarti': 'आरती',
  'bhajan': 'भजन',
  'stotra': 'स्तोत्र',
  'haripath': 'हरिपाठ',
  'gaulani': 'गौळणी',
  'kirtan': 'कीर्तन',
  'deviche_gane': 'देवीचे गाणे',
};

function getMarathiType(type: string): string {
  const lower = type.toLowerCase();
  return typeMap[lower] || type;
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const sParams = await searchParams;
  let page = parseInt(sParams.page || '1', 10);
  if (isNaN(page) || page < 1) {
    page = 1;
  }
  const pageSize = 50;
  const skip = (page - 1) * pageSize;

  // Query category from database
  const dbCategory = await db.category.findUnique({
    where: { slug },
    include: {
      children: {
        include: {
          _count: {
            select: { compositions: true },
          },
        },
        orderBy: {
          nameMarathi: 'asc',
        },
      },
    },
  });

  if (!dbCategory) {
    notFound();
  }

  // Get total count of compositions in category
  const totalCompositions = await db.categoryComposition.count({
    where: { categoryId: dbCategory.id },
  });

  // Query paginated compositions
  const categoryCompositions = await db.categoryComposition.findMany({
    where: { categoryId: dbCategory.id },
    include: {
      composition: {
        include: {
          saint: {
            select: {
              nameMarathi: true,
            },
          },
        },
      },
    },
    take: pageSize,
    skip: skip,
    orderBy: {
      compositionId: 'asc',
    },
  });

  // Format compositions list
  const compositions = categoryCompositions.map((cc: any) => ({
    title: cc.composition.titleMarathi,
    slug: cc.composition.slug,
    saint: cc.composition.saint?.nameMarathi || 'अज्ञात संत',
    typeMarathi: getMarathiType(cc.composition.type),
  }));

  const subCategories = dbCategory.children.map((child: any) => ({
    name: child.nameMarathi,
    slug: child.slug,
    count: child._count.compositions,
  }));

  const totalPages = Math.ceil(totalCompositions / pageSize);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* JSON-LD Structured Data - Collection + BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            categorySchema(
              {
                nameMarathi: dbCategory.nameMarathi,
                nameTranslit: dbCategory.nameTranslit,
                slug: slug,
                description: dbCategory.description,
                parent: null,
                compositionCount: totalCompositions,
                children: subCategories.map((c) => ({
                  nameMarathi: c.name,
                  slug: c.slug,
                  count: c.count,
                })),
              },
              [
                { name: 'मुख्यपृष्ठ', path: '/' },
                { name: 'श्रेणी', path: '/category' },
                { name: dbCategory.nameMarathi, path: '/category/' + slug },
              ],
            ),
          ),
        }}
      />

      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="ब्रेडक्रंब">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-saffron">
              मुख्यपृष्ठ
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <Link href="/category" className="hover:text-saffron">
              श्रेणी
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li className="text-foreground">{dbCategory.nameMarathi}</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-10 glass-premium border border-saffron/15 rounded-2xl p-6 relative overflow-hidden shadow-sm saffron-glow">
        <div className="absolute -right-20 -top-20 w-40 h-40 rounded-full bg-saffron/5 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-marathiHeading text-maroon dark:text-saffron font-bold drop-shadow-sm mb-2">
              {dbCategory.nameMarathi}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-sans tracking-wide">
              {dbCategory.nameTranslit}
            </p>
          </div>
          <div className="flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-saffron/10 text-saffron border border-saffron/20 shadow-sm">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{totalCompositions} साहित्य उपलब्ध</span>
            </span>
          </div>
        </div>
        
        {dbCategory.description && (
          <p className="text-sm sm:text-base text-foreground/80 mt-5 leading-relaxed font-marathi border-t border-saffron/5 pt-4">
            {dbCategory.description}
          </p>
        )}
      </header>

      {/* Sub-categories if any */}
      {subCategories.length > 0 && (
        <section className="mb-10" aria-labelledby="subcategories">
          <h2 id="subcategories" className="font-marathiHeading text-lg text-maroon dark:text-saffron mb-4 font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-saffron animate-pulse" />
            उप-श्रेणी (Sub-categories)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {subCategories.map((child) => (
              <Link
                key={child.slug}
                href={`/category/${child.slug}`}
                className="group flex items-center justify-between rounded-xl glass-premium px-4 py-3.5 border border-saffron/15 hover:border-saffron/30 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-saffron"
              >
                <span className="font-marathi text-sm font-semibold text-foreground group-hover:text-saffron transition-colors">{child.name}</span>
                <span className="text-[10px] text-saffron bg-saffron/10 px-2 py-0.5 rounded-full font-bold font-sans border border-saffron/10">
                  +{child.count}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Compositions Grid */}
      <section aria-labelledby="compositions">
        <h2 id="compositions" className="font-marathiHeading text-lg text-maroon dark:text-saffron mb-4 font-bold">
          श्रेणी अंतर्गत भक्ती साहित्य (एकूण {totalCompositions})
        </h2>
        {compositions.length === 0 ? (
          <div className="bg-card rounded-xl p-6 border border-saffron/10 text-center">
            <p className="text-muted-foreground">सध्या या श्रेणीत कोणतेही साहित्य उपलब्ध नाही.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3.5">
              {compositions.map((comp, index) => {
                const indexStr = toDevanagariDigits(skip + index + 1);
                return (
                  <Link
                    key={comp.slug}
                    href={`/abhang/${comp.slug}`}
                    className="group flex items-center justify-between rounded-2xl glass-premium px-6 py-4.5 border border-saffron/15 hover:border-saffron/35 hover:shadow-md hover:shadow-saffron/5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-saffron relative overflow-hidden"
                  >
                    {/* Glow effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-saffron/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="flex items-center gap-4 min-w-0 z-10">
                      {/* Stylized index marker */}
                      <span className="font-marathiHeading text-lg font-bold text-saffron/60 group-hover:text-saffron transition-colors flex-shrink-0 w-8">
                        {indexStr}
                      </span>
                      
                      <div className="min-w-0">
                        <p className="font-marathi font-bold text-base sm:text-lg text-foreground group-hover:text-saffron transition-colors truncate">
                          {comp.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground font-marathi flex items-center gap-1">
                            <span>🙏</span> {comp.saint}
                          </span>
                          <span className="text-[10px] text-muted-foreground">•</span>
                          <span className="text-[10px] text-saffron bg-saffron/5 px-2 py-0.5 rounded-full font-bold border border-saffron/10">
                            {comp.typeMarathi}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 z-10 ml-4">
                      <span className="text-xs text-saffron font-bold opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 font-marathi">
                        वाचा
                      </span>
                      <ArrowRight className="w-5 h-5 text-saffron transform group-hover:translate-x-1 transition-transform duration-300" aria-hidden="true" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-saffron/10 pt-6 mt-8">
                <Link
                  href={page > 1 ? `?page=${page - 1}` : '#'}
                  className={`flex items-center gap-1 px-4 py-2 rounded-lg border border-saffron/20 text-sm font-semibold transition-all ${
                    page > 1 
                      ? 'hover:bg-saffron/10 text-foreground' 
                      : 'opacity-40 pointer-events-none text-muted-foreground'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" /> मागील (Prev)
                </Link>
                <span className="text-sm font-marathi font-semibold text-foreground/80">
                  पान {toDevanagariDigits(page)} / {toDevanagariDigits(totalPages)}
                </span>
                <Link
                  href={page < totalPages ? `?page=${page + 1}` : '#'}
                  className={`flex items-center gap-1 px-4 py-2 rounded-lg border border-saffron/20 text-sm font-semibold transition-all ${
                    page < totalPages 
                      ? 'hover:bg-saffron/10 text-foreground' 
                      : 'opacity-40 pointer-events-none text-muted-foreground'
                  }`}
                >
                  पुढील (Next) <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  
  const category = await db.category.findUnique({
    where: { slug },
    select: { nameMarathi: true, nameTranslit: true, description: true },
  });

  if (!category) {
    return {
      title: 'श्रेणी सापडली नाही - डिजिटल पंढरपूर',
    };
  }

  return {
    title: `${category.nameMarathi} संग्रह - भक्ती साहित्य | डिजिटल पंढरपूर`,
    description: category.description || `${category.nameMarathi} (${category.nameTranslit}) प्रकारातील मराठी भक्ती साहित्य, अभंग, आरत्या व भजन संग्रह.`,
    ...canonicalMetadata({ canonical: '/category/' + slug }),
    openGraph: {
      title: category.nameMarathi,
      description: category.description || `${category.nameTranslit} भक्ती साहित्य संग्रह`,
      locale: 'mr_IN',
    },
  };
}