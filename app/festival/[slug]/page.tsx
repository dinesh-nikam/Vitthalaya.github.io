import Link from 'next/link';
import { db } from '@/src/db/client';
import { getCurrentFestival, getFestivalsForYear } from '@/src/lib/festival-calculator';
import { Calendar, Music } from 'lucide-react';
import { festivalSchema, canonicalMetadata } from '@/src/lib/seo';

export const dynamic = 'force-dynamic';

export default async function FestivalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch festival and compositions from database
  const dbFestival = await db.festival.findFirst({
    where: {
      OR: [
        { nameTranslit: { equals: slug.replace(/-/g, ' '), mode: 'insensitive' } },
        { nameTranslit: { equals: slug, mode: 'insensitive' } },
      ],
    },
    include: {
      compositions: {
        include: {
          composition: true,
        },
      },
    },
  });

  const festival = dbFestival ? {
    nameMarathi: dbFestival.nameMarathi,
    nameTranslit: dbFestival.nameTranslit,
    dateRule: dbFestival.dateRule || dbFestival.monthDayRule,
    compositions: dbFestival.compositions.map((c) => {
      let audioLinks: string[] = [];
      if (c.composition.audioLinks) {
        try {
          audioLinks = typeof c.composition.audioLinks === 'string'
            ? JSON.parse(c.composition.audioLinks)
            : c.composition.audioLinks;
        } catch {
          audioLinks = [];
        }
      }
      return {
        id: c.composition.id,
        titleMarathi: c.composition.titleMarathi,
        titleTranslit: c.composition.titleTranslit,
        slug: c.composition.slug,
        type: c.composition.type,
        audioLinks,
      };
    }),
  } : null;

  // If not in DB, use calculator data
  const calculated = getCurrentFestival();
  if (calculated && calculated.name.toLowerCase().replace(/_/g, '-') === slug) {
    // Render with calculated data
    return renderCalculatedFestival({
      name: calculated.name,
      marathiName: calculated.marathiName,
      date: calculated.date,
      daysUntil: calculated.daysUntil,
    });
  }

  // Get festival info from calculator for upcoming status
  const allFestivals = getFestivalsForYear(new Date().getFullYear());
  const festInfo = allFestivals.find((f) => f.name.toLowerCase().replace(/_/g, '-') === slug);

  return renderFestivalFromDb(festival, festInfo);
}

function renderCalculatedFestival(festival: {
  name: string;
  marathiName: string;
  date: Date;
  daysUntil: number;
}) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <header className="mb-8 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gold/20 flex items-center justify-center">
          <Calendar className="w-10 h-10 text-gold" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-marathiHeading text-maroon mb-3">
          {festival.marathiName}
        </h1>
        <p className="text-lg text-muted-foreground mb-2">
          {festival.date.toLocaleDateString('mr-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
        <p className="text-sm text-saffron">
          {festival.daysUntil >= 0
            ? `${festival.daysUntil} दिवस उटपीठे`
            : 'आतापर्यंत सुरू झाला'}
        </p>
      </header>

      <div className="bg-card rounded-lg p-6 border border-saffron/10">
        <p className="font-marathi text-foreground leading-relaxed">
          हा सण वारकरी संप्रदायाशी संबंधित आहे. सणासाठी सायंकाली वारकरीचा मार्ग घ्यावा.
        </p>
      </div>
    </div>
  );
}

interface FestivalComposition {
  id: string;
  titleMarathi: string;
  titleTranslit: string;
  slug: string;
  type: string;
  audioLinks: string[];
}

function renderFestivalFromDb(
  festival: {
    nameMarathi: string;
    nameTranslit: string;
    dateRule?: string | null;
    compositions: FestivalComposition[];
  } | null,
  festInfo?: {
    date: Date;
    daysUntil: number;
    isUpcoming: boolean;
  }
) {
  if (!festival) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-marathiHeading text-maroon">
          सण सापडला नाही
        </h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* JSON-LD Structured Data - Festival + BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            festivalSchema(
              {
                nameMarathi: festival.nameMarathi,
                nameTranslit: festival.nameTranslit,
                slug: festival.nameTranslit.toLowerCase().replace(/\s+/g, '-'),
                date: festInfo?.date ?? null,
                compositionCount: festival.compositions.length,
              },
              [
                { name: '\u092E\u0941\u0916\u094D\u092F\u092A\u0943\u0937\u094D\u0920', path: '/' },
                { name: festival.nameMarathi, path: '/festival/' + festival.nameTranslit.toLowerCase().replace(/\s+/g, '-') },
              ],
            ),
          ),
        }}
      />

      {/* Header */}
      <header className="mb-12 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gold/20 flex items-center justify-center">
          <Calendar className="w-10 h-10 text-gold" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-marathiHeading text-maroon mb-3">
          {festival.nameMarathi}
        </h1>
        <p className="text-lg text-muted-foreground mb-4">
          {festival.nameTranslit}
        </p>
        {festInfo && (
          <p className="text-sm text-saffron">
            {festInfo.daysUntil >= 0 && festInfo.isUpcoming
              ? `${festInfo.daysUntil} दिवस उटपीठे`
              : 'आतापर्यंत सुरू झाला'}
          </p>
        )}
      </header>

      {/* Compositions for Festival */}
      <section aria-labelledby="festival-compositions">
        <h2 id="festival-compositions" className="font-marathiHeading text-2xl text-maroon mb-6">
          या सणासाठी साहित्य
        </h2>

        {festival.compositions.length === 0 ? (
          <div className="bg-card rounded-lg p-6 border border-saffron/10">
            <p className="text-muted-foreground">
              ह्या सणासाठी अजून कोणतेही साहित्य जोडलेले नाही.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {festival.compositions.map((composition) => (
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
                  <Music
                    className="w-5 h-5 text-saffron flex-shrink-0"
                    aria-label="ऑडियो उपलब्ध"
                  />
                )}
              </Link>
            ))}
          </div>
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
  const festival = await db.festival.findUnique({
    where: { nameTranslit: slug.replace('-', ' ') },
  });

  if (!festival) {
    const calculated = getCurrentFestival();
    if (calculated && calculated.name === slug.replace('-', '_')) {
      return {
        title: `${calculated.marathiName} - डिजिटल पंढरपूर`,
        description: `${calculated.marathiName} सण - डिजिटल पंढरपूर वर वाचा`,
        ...canonicalMetadata({ canonical: `/festival/${slug}` }),
      };
    }

    return {
      title: 'सण सापडला नाही - डिजिटल पंढरपूर',
      ...canonicalMetadata({ canonical: `/festival/${slug}` }),
    };
  }

  return {
    title: `${festival.nameMarathi} - डिजिटल पंढरपूर`,
    description: `डिजिटल पंढरपूर वर ${festival.nameMarathi} सणासाठी साहित्य वाचा`,
    openGraph: {
      title: festival.nameMarathi,
      description: `${festival.nameTranslit} सणासाठी साहित्य`,
      type: 'article',
      locale: 'mr_IN',
    },
    ...canonicalMetadata({
      canonical: `/festival/${festival.nameTranslit.toLowerCase().replace(/\s+/g, '-')}`,
    }),
  };
}