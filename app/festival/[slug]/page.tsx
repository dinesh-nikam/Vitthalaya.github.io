import Link from 'next/link';
import { db } from '@/src/db/client';
import { getCurrentFestival, getFestivalsForYear } from '@/src/lib/festival-calculator';
import { Calendar, Music } from 'lucide-react';

export default async function FestivalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Try to fetch from database first
  let festival = await db.festival.findUnique({
    where: { nameTranslit: slug.replace('-', ' ') },
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
  });

  // If not in DB, use calculator data
  if (!festival) {
    const calculated = getCurrentFestival();
    if (calculated && calculated.name === slug.replace('-', '_')) {
      // Render with calculated data
      return renderCalculatedFestival(calculated);
    }
  }

  // Get festival info from calculator for upcoming status
  const allFestivals = getFestivalsForYear(new Date().getFullYear());
  const festInfo = allFestivals.find((f) => f.name === slug.replace('-', '_'));

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
            : 'आतापर्यंत सुरू झाला`}
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

function renderFestivalFromDb(
  festival: {
    nameMarathi: string;
    nameTranslit: string;
    dateRule?: string | null;
    compositions: {
      composition: {
        id: string;
        titleMarathi: string;
        titleTranslit: string;
        slug: string;
        type: string;
        audioLinks: string[];
      };
    }[];
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
            {festival.compositions.map(({ composition }) => (
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
    return {
      title: 'सण सापडला नाही - डिजिटल पंढरपूर',
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
  };
}