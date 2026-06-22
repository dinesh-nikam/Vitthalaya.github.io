import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/src/db/client';
import { getCurrentFestival, getFestivalsForYear } from '@/src/lib/festival-calculator';
import { canonicalMetadata, festivalSchema } from '@/src/lib/seo';

export const dynamic = 'force-dynamic';
import { Calendar, Music, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  params: Promise<{ slug: string; year: string }>;
}

export default async function FestivalYearPage({ params }: Props) {
  const { slug, year: yearStr } = await params;
  const year = parseInt(yearStr, 10);

  if (isNaN(year) || year < 1900 || year > 2100) {
    notFound();
  }

  // Resolve festival name from slug
  const festival = await db.festival.findUnique({
    where: { nameTranslit: slug.replace(/-/g, ' ') },
    include: {
      compositions: {
        include: {
          composition: {
            select: {
              id: true,
              titleMarathi: true,
              titleTranslit: true,
              slug: true,
              type: true,
              audioLinks: true,
            },
          },
        },
      },
    },
  }) as {
    nameMarathi: string;
    nameTranslit: string;
    compositions: Array<{
      composition: {
        id: string;
        titleMarathi: string;
        titleTranslit: string;
        slug: string;
        type: string;
        audioLinks: string[];
      };
    }> | null;
  } | null;

  if (!festival) {
    notFound();
  }

  // Get festival calendar info for this year
  const yearData = getFestivalsForYear(year);
  const festInfo = yearData.find(
    (f) => f.name === slug.replace(/-/g, '_'),
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            festivalSchema(
              {
                nameMarathi: festival.nameMarathi,
                nameTranslit: festival.nameTranslit,
                slug: slug,
                date: festInfo?.date ?? null,
                compositionCount: festival.compositions?.length ?? 0,
              },
              [
                { name: 'मुख्यपृष्ठ', path: '/' },
                { name: festival.nameMarathi, path: `/festival/${slug}` },
                { name: `${year}`, path: `/festival/${slug}/${year}` },
              ],
            ),
          ),
        }}
      />

      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground" aria-label="ब्रेडक्रंब">
        <ol className="flex items-center gap-2">
          <li><Link href="/" className="hover:text-saffron">मुख्यपृष्ठ</Link></li>
          <li aria-hidden="true">›</li>
          <li><Link href={`/festival/${slug}`} className="hover:text-saffron">{festival.nameMarathi}</Link></li>
          <li aria-hidden="true">›</li>
          <li className="text-foreground font-medium">{year}</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-12 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gold/20 flex items-center justify-center">
          <Calendar className="w-10 h-10 text-gold" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-marathiHeading text-maroon mb-2">
          {festival.nameMarathi} {year}
        </h1>
        <p className="text-lg text-muted-foreground mb-4">
          {festival.nameTranslit} {year}
        </p>
        {festInfo?.date && (
          <p className="text-sm text-saffron mb-6">
            {festInfo.date.toLocaleDateString('mr-IN', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        )}

        {/* Year navigation */}
        <nav className="flex items-center justify-center gap-4" aria-label="वर्ष निवड">
          <Link
            href={`/festival/${slug}/${year - 1}`}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-lg border border-saffron/20 hover:bg-saffron/10 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {year - 1}
          </Link>
          <span className="text-sm font-medium text-maroon">{year}</span>
          <Link
            href={`/festival/${slug}/${year + 1}`}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-lg border border-saffron/20 hover:bg-saffron/10 transition-colors"
          >
            {year + 1}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </nav>
      </header>

      {/* Compositions for this festival */}
      <section aria-labelledby="festival-compositions">
        <h2 id="festival-compositions" className="font-marathiHeading text-2xl text-maroon mb-6">
          {festival.nameMarathi} साठी साहित्य
        </h2>

        {(festival.compositions ?? []).length === 0 ? (
          <div className="bg-card rounded-lg p-6 border border-saffron/10">
            <p className="text-muted-foreground">
              ह्या सणासाठी अजून कोणतेही साहित्य जोडलेले नाही.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {(festival.compositions ?? []).map((item) => {
              const composition = item.composition;
              return (
                <Link
                  key={composition.id}
                  href={`/abhang/${composition.slug}`}
                  className="flex items-center gap-4 rounded-lg bg-card p-5 border border-saffron/10 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-saffron"
                >
                  <div className="flex-1">
                    <p className="font-marathi font-medium text-foreground">
                      {composition.titleMarathi}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {composition.titleTranslit}
                    </p>
                  </div>
                  {composition.audioLinks && composition.audioLinks.length > 0 && (
                    <Music className="w-5 h-5 text-saffron flex-shrink-0" aria-label="ऑडियो उपलब्ध" />
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Back to main festival page */}
      <div className="mt-10 text-center">
        <Link
          href={`/festival/${slug}`}
          className="inline-flex items-center gap-2 text-sm text-saffron hover:underline"
        >
          {festival.nameMarathi} मुख्यपान वर जा
        </Link>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug, year } = await params;

  const festival = await db.festival.findUnique({
    where: { nameTranslit: slug.replace(/-/g, ' ') },
  }) as { nameMarathi: string; nameTranslit: string } | null;

  if (!festival) {
    return { title: 'सण सापडला नाही - डिजिटल पंढरपूर' };
  }

  return {
    title: `${festival.nameMarathi} ${year} - डिजिटल पंढरपूर`,
    description: `${festival.nameMarathi} ${year} — डिजिटल पंढरपूर वर ${festival.nameTranslit} सणासाठी साहित्य वाचा`,
    ...canonicalMetadata({ canonical: `/festival/${slug}/${year}` }),
    openGraph: {
      title: `${festival.nameMarathi} ${year}`,
      description: `${festival.nameTranslit} ${year} सणासाठी साहित्य`,
      type: 'article',
      locale: 'mr_IN',
    },
  };
}