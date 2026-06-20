import { db } from '@/src/db/client';
import Link from 'next/link';
import { getFestivalsForYear } from '@/src/lib/festival-calculator';
import { Calendar, Music, ArrowRight } from 'lucide-react';
import { canonicalMetadata } from '@/src/lib/seo';

export const metadata = {
  title: 'सण व उत्सव - हिंदू पंचांग व वारकरी सण | डिजिटल पंढरपूर',
  description: 'आषाढी एकादशी, कार्तिकी एकादशी, दत्त जयंती आणि गणेश चतुर्थी यांसारख्या पवित्र वारकरी सणांचे वेळापत्रक आणि संबंधित भक्ती साहित्य.',
  ...canonicalMetadata({ canonical: '/festival' }),
};

export default async function FestivalsIndexPage() {
  // 1. Fetch festivals from database
  const dbFestivals = await db.festival.findMany({
    include: {
      compositions: {
        take: 3,
        include: {
          composition: {
            select: {
              titleMarathi: true,
              slug: true,
            },
          },
        },
      },
      _count: {
        select: { compositions: true },
      },
    },
  });

  // 2. Fetch approximate Gregorian dates for the current year
  const currentYear = new Date().getFullYear();
  const calculatedFestivals = getFestivalsForYear(currentYear);

  // 3. Match calculated info to database records
  const mappedFestivals = dbFestivals.map((dbFest) => {
    // Normalise slug comparison
    const dbTranslitSlug = dbFest.nameTranslit.toLowerCase().replace(/[\s_]+/g, '-');
    const matchedCalc = calculatedFestivals.find(
      (calc) => calc.name.toLowerCase().replace(/[\s_]+/g, '-') === dbTranslitSlug
    );

    return {
      ...dbFest,
      slug: dbTranslitSlug,
      date: matchedCalc?.date ?? null,
      daysUntil: matchedCalc?.daysUntil ?? null,
      isUpcoming: matchedCalc?.isUpcoming ?? false,
    };
  });

  // Sort upcoming first, then others
  const sortedFestivals = [...mappedFestivals].sort((a, b) => {
    if (a.daysUntil !== null && b.daysUntil !== null) {
      if (a.daysUntil >= 0 && b.daysUntil >= 0) return a.daysUntil - b.daysUntil;
      if (a.daysUntil < 0 && b.daysUntil >= 0) return 1;
      if (a.daysUntil >= 0 && b.daysUntil < 0) return -1;
    }
    if (a.daysUntil !== null) return -1;
    if (b.daysUntil !== null) return 1;
    return 0;
  });

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
          <li className="text-foreground">सण</li>
        </ol>
      </nav>

      {/* Page Header */}
      <header className="mb-10 space-y-2 text-center md:text-left">
        <h1 className="text-3xl sm:text-4xl font-marathiHeading text-maroon dark:text-saffron font-bold">
          उत्सव आणि सण कालदर्शिका 📅
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-3xl">
          वारकरी संप्रदाय व महाराष्ट्रातील महत्त्वाचे सण, उत्सव, आणि त्यांची हिंदू पंचांगानुसार तिथी, तारीख तसेच संबंधित भक्ती साहित्याचा संग्रह.
        </p>
      </header>

      {/* Timeline List */}
      <div className="relative border-l border-saffron/20 ml-4 md:ml-8 pl-6 md:pl-10 space-y-12">
        {sortedFestivals.map((festival) => {
          const totalCompositions = festival._count.compositions;

          return (
            <div key={festival.id} className="relative group">
              {/* Timeline marker node */}
              <div className="absolute -left-[35px] md:-left-[51px] top-1.5 w-7 h-7 md:w-9 md:h-9 bg-card border-2 border-saffron rounded-full flex items-center justify-center text-saffron group-hover:bg-saffron group-hover:text-white transition-colors duration-300">
                <Calendar className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
              </div>

              {/* Card Container */}
              <div className="bg-card border border-saffron/10 hover:border-saffron/30 hover:shadow-lg rounded-2xl p-6 transition-all duration-300 grid md:grid-cols-3 gap-6">
                
                {/* Column 1: Festival Date Block */}
                <div className="space-y-3 md:border-r border-saffron/5 md:pr-6">
                  <div className="space-y-1">
                    <h2 className="font-marathiHeading text-xl font-bold text-maroon dark:text-saffron group-hover:text-saffron transition-colors leading-tight">
                      {festival.nameMarathi}
                    </h2>
                    <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider">
                      {festival.nameTranslit}
                    </p>
                  </div>

                  {festival.date && (
                    <div className="space-y-1.5">
                      <p className="text-md font-semibold text-foreground">
                        {new Date(festival.date).toLocaleDateString('mr-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                      
                      {festival.daysUntil !== null && (
                        <div>
                          {festival.daysUntil === 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                              आज उत्सव आहे! 🚩
                            </span>
                          ) : festival.daysUntil > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-saffron/10 text-saffron border border-saffron/10">
                              {festival.daysUntil} दिवसात येत आहे
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                              सण संपला आहे
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rules description */}
                  {(festival.monthDayRule || festival.dateRule) && (
                    <p className="text-xs text-muted-foreground bg-saffron/5 p-2 rounded-lg border border-saffron/10 inline-block font-marathi">
                      🗓️ तिथी: {festival.monthDayRule || festival.dateRule}
                    </p>
                  )}
                </div>

                {/* Column 2: Compositions Preview */}
                <div className="md:col-span-2 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-maroon dark:text-saffron font-marathiHeading">
                        उत्सवाशी संबंधित प्रमुख अभंग व साहित्य:
                      </h3>
                      <span className="text-xs text-muted-foreground font-semibold">
                        एकूण {totalCompositions}
                      </span>
                    </div>

                    {festival.compositions.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">कोणतेही साहित्य सध्या जोडलेले नाही.</p>
                    ) : (
                      <div className="grid gap-2">
                        {festival.compositions.map(({ composition }) => (
                          <Link
                            key={composition.slug}
                            href={`/abhang/${composition.slug}`}
                            className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-saffron/5 border border-transparent hover:border-saffron/15 transition-all text-xs font-marathi text-foreground/90 font-medium"
                          >
                            <Music className="w-3.5 h-3.5 text-saffron flex-shrink-0" />
                            <span className="truncate">{composition.titleMarathi}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Open details link */}
                  <div className="flex justify-end pt-2">
                    <Link
                      href={`/festival/${festival.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-saffron hover:underline group"
                    >
                      <span>सण माहिती व पूर्ण साहित्य पहा</span>
                      <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
