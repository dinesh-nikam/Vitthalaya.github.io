import { db } from '@/src/db/client';
import Link from 'next/link';
import { getFestivalsForYear } from '@/src/lib/festival-calculator';
import { Calendar, Music, ArrowRight, ChevronRight, Sparkles } from 'lucide-react';
import { canonicalMetadata } from '@/src/lib/seo';
import '@/app/homepage.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'सण व उत्सव : हिंदू पंचांग व वारकरी सण | डिजिटल पंढरपूर',
  description: 'आषाढी एकादशी, कार्तिकी एकादशी, दत्त जयंती आणि वारकरी उत्सवांचे वेळापत्रक आणि संबंधित भक्ती साहित्य.',
  ...canonicalMetadata({ canonical: '/festival' }),
};

export default async function FestivalsIndexPage() {
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

  const currentYear = new Date().getFullYear();
  const calculatedFestivals = getFestivalsForYear(currentYear);

  const mappedFestivals = dbFestivals.map((dbFest) => {
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
            <li className="text-[var(--dp-ink)]">उत्सव व सण</li>
          </ol>
        </nav>

        {/* Page Header */}
        <header className="mb-12 text-center max-w-3xl mx-auto">
          <p className="text-xs text-[var(--dp-gold)] font-marathi mb-2">
            वारकरी भक्ती पंचांग
          </p>
          <h1 className="vitthalaya-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
            वारकरी उत्सव व सण कालदर्शिका
          </h1>
          <p className="vitthalaya-prose text-sm sm:text-base text-[var(--dp-ink-dim)] leading-relaxed mb-6">
            वारकरी संप्रदाय व महाराष्ट्रातील महत्त्वाचे सण, उत्सव, त्यांची हिंदू पंचांगानुसार तिथी, तारीख तसेच संबंधित भक्ती साहित्याचा संग्रह.
          </p>

          <div className="flex flex-wrap justify-center gap-6 text-xs font-marathi text-[var(--dp-muted)] py-3 px-6 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] max-w-md mx-auto">
            <span>नोंदवलेले सण: <strong className="text-[var(--dp-ink)]">{sortedFestivals.length}</strong></span>
            <span>वर्ष: <strong className="text-[var(--dp-ink)]">{currentYear}</strong></span>
          </div>
        </header>

        {/* Festivals Timeline List */}
        <div className="border-l border-[var(--dp-rule)] ml-4 sm:ml-6 pl-6 sm:pl-8 space-y-10">
          {sortedFestivals.map((festival) => {
            const totalCompositions = festival._count.compositions;

            return (
              <div key={festival.id} className="relative">
                {/* Timeline node */}
                <div className="absolute -left-[35px] sm:-left-[43px] top-1.5 w-6 h-6 sm:w-7 sm:h-7 bg-[var(--dp-ground-well)] border border-[var(--dp-gold)] rounded-full flex items-center justify-center text-[var(--dp-gold)]">
                  <Calendar size={13} aria-hidden="true" />
                </div>

                {/* Festival Card */}
                <div className="vitthalaya-card rounded p-6 border border-[var(--dp-rule)] hover:border-[var(--dp-gold)] transition-colors grid md:grid-cols-3 gap-6">
                  {/* Column 1: Festival Date Block */}
                  <div className="space-y-3 md:border-r border-[var(--dp-rule)] md:pr-6">
                    <div>
                      <h2 className="vitthalaya-display text-xl font-bold text-[var(--dp-ink)] leading-tight">
                        {festival.nameMarathi}
                      </h2>
                      <p className="text-xs text-[var(--dp-muted)] font-marathi mt-0.5">
                        {festival.nameTranslit}
                      </p>
                    </div>

                    {festival.date && (
                      <div className="space-y-1.5">
                        <p className="text-sm font-semibold font-marathi text-[var(--dp-ink)]">
                          {new Date(festival.date).toLocaleDateString('mr-IN', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>

                        {festival.daysUntil !== null && (
                          <div>
                            {festival.daysUntil === 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-[var(--dp-gold)]/20 text-[var(--dp-gold)] border border-[var(--dp-gold)]/30 font-marathi">
                                <Sparkles size={11} aria-hidden="true" />
                                आज पावन उत्सव आहे
                              </span>
                            ) : festival.daysUntil > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-[var(--dp-ground-well)] text-[var(--dp-gold)] border border-[var(--dp-rule)] font-marathi">
                                {festival.daysUntil} दिवसांत येत आहे
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs text-[var(--dp-muted)] bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] font-marathi">
                                उत्सव संपन्न झाला
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {(festival.monthDayRule || festival.dateRule) && (
                      <p className="text-xs text-[var(--dp-ink-dim)] bg-[var(--dp-ground-well)] p-2 rounded border border-[var(--dp-rule)] font-marathi">
                        तिथी: {festival.monthDayRule || festival.dateRule}
                      </p>
                    )}
                  </div>

                  {/* Column 2: Compositions Preview */}
                  <div className="md:col-span-2 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold font-marathi text-[var(--dp-gold)]">
                          उत्सवाशी संबंधित प्रमुख अभंग व रचना:
                        </h3>
                        <span className="text-xs text-[var(--dp-muted)] font-marathi">
                          एकूण {totalCompositions} रचना
                        </span>
                      </div>

                      {festival.compositions.length === 0 ? (
                        <p className="text-xs text-[var(--dp-muted)] font-marathi italic">
                          कोणतेही साहित्य सध्या जोडलेले नाही.
                        </p>
                      ) : (
                        <div className="grid gap-2">
                          {festival.compositions.map(({ composition }) => (
                            <Link
                              key={composition.slug}
                              href={`/abhang/${composition.slug}`}
                              className="flex items-center gap-2 p-2.5 rounded bg-[var(--dp-ground-well)] hover:border-[var(--dp-gold)] border border-[var(--dp-rule)] transition-colors text-xs font-marathi text-[var(--dp-ink)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
                            >
                              <Music size={13} className="text-[var(--dp-gold)] shrink-0" aria-hidden="true" />
                              <span className="truncate">{composition.titleMarathi}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-2">
                      <Link
                        href={`/festival/${festival.slug}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--dp-gold)] hover:underline font-marathi focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
                      >
                        <span>सविस्तर माहिती व साहित्य</span>
                        <ArrowRight size={13} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
