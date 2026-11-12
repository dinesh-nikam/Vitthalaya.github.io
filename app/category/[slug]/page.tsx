import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/src/db/client';
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, User } from 'lucide-react';
import { categorySchema } from '@/src/lib/seo';
import '@/app/homepage.css';

export const dynamic = 'force-dynamic';

function toDevanagariDigits(num: number): string {
  const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  const formatted = num.toString().padStart(2, '0');
  return formatted
    .split('')
    .map((digit) => {
      const idx = parseInt(digit, 10);
      return isNaN(idx) ? digit : devanagariDigits[idx];
    })
    .join('');
}

const typeMap: Record<string, string> = {
  abhang: 'अभंग',
  aarti: 'आरती',
  bhajan: 'भजन',
  stotra: 'स्तोत्र',
  haripath: 'हरिपाठ',
  gaulani: 'गौळणी',
  kirtan: 'कीर्तन',
  deviche_gane: 'देवीचे गाणे',
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
  const rawSlug = await params;
  const slug = decodeURIComponent(rawSlug.slug);
  const sParams = await searchParams;
  let page = parseInt(sParams.page || '1', 10);
  if (isNaN(page) || page < 1) {
    page = 1;
  }
  const pageSize = 50;
  const skip = (page - 1) * pageSize;

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

  const totalCompositions = await db.categoryComposition.count({
    where: { categoryId: dbCategory.id },
  });

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

  const totalPages = Math.ceil(totalCompositions / pageSize);

  const compositions = categoryCompositions
    .map((cc) => cc.composition)
    .filter(Boolean)
    .map((comp) => ({
      title: comp.titleMarathi,
      slug: comp.slug,
      saint: comp.saint?.nameMarathi || 'वारकरी संत',
      type: comp.type,
      typeMarathi: getMarathiType(comp.type),
    }));

  const subCategories = dbCategory.children.map((child) => ({
    name: child.nameMarathi,
    slug: child.slug,
    count: child._count.compositions,
  }));

  return (
    <div className="vitthalaya-shell min-h-screen py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            categorySchema(
              {
                nameMarathi: dbCategory.nameMarathi,
                nameTranslit: dbCategory.nameTranslit,
                slug: dbCategory.slug,
                description: dbCategory.description || null,
                parent: dbCategory.parent
                  ? { nameMarathi: dbCategory.parent.nameMarathi, slug: dbCategory.parent.slug }
                  : null,
                compositionCount: totalCompositions,
                children: subCategories,
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
            <li>
              <Link href="/category" className="hover:text-[var(--dp-gold)] transition-colors">
                साहित्य श्रेणी
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li className="text-[var(--dp-ink)]">{dbCategory.nameMarathi}</li>
          </ol>
        </nav>

        {/* Header */}
        <header className="mb-10 vitthalaya-card rounded p-6 sm:p-8 border border-[var(--dp-rule)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs text-[var(--dp-gold)] font-marathi mb-1">
                साहित्य संकलन
              </p>
              <h1 className="vitthalaya-display text-2xl sm:text-3xl md:text-4xl font-bold mb-1">
                {dbCategory.nameMarathi}
              </h1>
              <p className="text-xs text-[var(--dp-muted)] font-marathi">
                {dbCategory.nameTranslit}
              </p>
            </div>
            <div className="shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-marathi bg-[var(--dp-ground-well)] text-[var(--dp-gold)] border border-[var(--dp-rule)]">
                <BookOpen size={13} aria-hidden="true" />
                <span>{totalCompositions} रचना उपलब्ध</span>
              </span>
            </div>
          </div>

          {dbCategory.description && (
            <p className="vitthalaya-prose text-sm text-[var(--dp-ink-dim)] mt-4 pt-4 border-t border-[var(--dp-rule)] leading-relaxed">
              {dbCategory.description}
            </p>
          )}
        </header>

        {/* Subcategories if present */}
        {subCategories.length > 0 && (
          <section className="mb-10" aria-labelledby="subcategories">
            <h2 id="subcategories" className="vitthalaya-display text-lg font-bold mb-3">
              उप-श्रेणी
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {subCategories.map((child) => (
                <Link
                  key={child.slug}
                  href={`/category/${child.slug}`}
                  className="vitthalaya-card rounded p-3 flex items-center justify-between border border-[var(--dp-rule)] hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
                >
                  <span className="font-marathi text-xs font-medium text-[var(--dp-ink)] truncate">{child.name}</span>
                  <span className="text-[10px] text-[var(--dp-muted)] bg-[var(--dp-ground-well)] px-1.5 py-0.5 rounded border border-[var(--dp-rule)] shrink-0 ml-2">
                    {child.count}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Compositions Listing */}
        <section aria-labelledby="compositions">
          <div className="flex items-center justify-between mb-4 border-b border-[var(--dp-rule)] pb-2">
            <h2 id="compositions" className="vitthalaya-display text-xl font-bold">
              श्रेणीतील भक्ती साहित्य ({totalCompositions})
            </h2>
            <span className="text-xs text-[var(--dp-muted)] font-marathi">
              पान {toDevanagariDigits(page)} / {toDevanagariDigits(totalPages || 1)}
            </span>
          </div>

          {compositions.length === 0 ? (
            <div className="vitthalaya-card rounded p-8 text-center border border-[var(--dp-rule)]">
              <p className="text-xs text-[var(--dp-muted)] font-marathi">
                सध्या या श्रेणीत कोणतेही साहित्य उपलब्ध नाही.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {compositions.map((comp, index) => {
                const indexStr = toDevanagariDigits(skip + index + 1);
                return (
                  <Link
                    key={comp.slug}
                    href={`/abhang/${comp.slug}`}
                    className="group vitthalaya-card rounded p-4 flex items-center justify-between border border-[var(--dp-rule)] hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-[var(--dp-gold)] font-marathi w-6 shrink-0 font-semibold">
                        {indexStr}
                      </span>
                      <div className="min-w-0">
                        <p className="vitthalaya-display text-base font-bold text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors truncate">
                          {comp.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--dp-muted)] font-marathi">
                          <span className="inline-flex items-center gap-1">
                            <User size={11} aria-hidden="true" />
                            {comp.saint}
                          </span>
                          <span>•</span>
                          <span>{comp.typeMarathi}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-4 flex items-center gap-1 text-xs font-semibold font-marathi text-[var(--dp-gold)]">
                      <span>वाचा</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <nav className="flex items-center justify-between border-t border-[var(--dp-rule)] pt-6 mt-8" aria-label="पृष्ठ नेव्हिगेशन">
              <Link
                href={page > 1 ? `?page=${page - 1}` : '#'}
                className={`vitthalaya-btn-secondary text-xs ${
                  page > 1 ? '' : 'opacity-40 pointer-events-none'
                }`}
                aria-disabled={page <= 1}
              >
                <ArrowLeft size={13} aria-hidden="true" />
                मागील पान
              </Link>
              <span className="text-xs font-marathi text-[var(--dp-muted)]">
                पान {toDevanagariDigits(page)} / {toDevanagariDigits(totalPages)}
              </span>
              <Link
                href={page < totalPages ? `?page=${page + 1}` : '#'}
                className={`vitthalaya-btn-secondary text-xs ${
                  page < totalPages ? '' : 'opacity-40 pointer-events-none'
                }`}
                aria-disabled={page >= totalPages}
              >
                पुढील पान
                <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
