import Link from 'next/link';
import { db } from '@/src/db/client';
import { getCurrentFestival, getFestivalsForYear } from '@/src/lib/festival-calculator';
import { Calendar, Music, ChevronRight, ArrowRight } from 'lucide-react';
import { festivalSchema, canonicalMetadata } from '@/src/lib/seo';
import '@/app/homepage.css';

export const dynamic = 'force-dynamic';

interface FestivalComposition {
  id: string;
  titleMarathi: string;
  titleTranslit: string;
  slug: string;
  type: string;
  audioLinks: string[];
}

export default async function FestivalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const rawSlug = await params;
  const slug = decodeURIComponent(rawSlug.slug);

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

  const festival = dbFestival
    ? {
        nameMarathi: dbFestival.nameMarathi,
        nameTranslit: dbFestival.nameTranslit,
        dateRule: dbFestival.dateRule || dbFestival.monthDayRule,
        compositions: dbFestival.compositions.map((c) => {
          let audioLinks: string[] = [];
          if (c.composition.audioLinks) {
            try {
              audioLinks =
                typeof c.composition.audioLinks === 'string'
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
      }
    : null;

  const calculated = getCurrentFestival();
  if (calculated && calculated.name.toLowerCase().replace(/_/g, '-') === slug) {
    return renderCalculatedFestival({
      name: calculated.name,
      marathiName: calculated.marathiName,
      date: calculated.date,
      daysUntil: calculated.daysUntil,
    });
  }

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
    <div className="vitthalaya-shell min-h-screen py-10">
      <div className="vitthalaya-container max-w-4xl">
        <nav className="mb-6" aria-label="ब्रेडक्रंब">
          <ol className="flex items-center gap-2 text-xs font-marathi text-[var(--dp-muted)]">
            <li>
              <Link href="/" className="hover:text-[var(--dp-gold)] transition-colors">
                मुख्यपृष्ठ
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li>
              <Link href="/festival" className="hover:text-[var(--dp-gold)] transition-colors">
                उत्सव
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li className="text-[var(--dp-ink)]">{festival.marathiName}</li>
          </ol>
        </nav>

        <header className="mb-10 text-center vitthalaya-card rounded p-6 sm:p-8 border border-[var(--dp-rule)]">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--dp-ground-well)] border border-[var(--dp-gold)] flex items-center justify-center text-[var(--dp-gold)]">
            <Calendar size={24} aria-hidden="true" />
          </div>
          <h1 className="vitthalaya-display text-3xl sm:text-4xl font-bold mb-2">
            {festival.marathiName}
          </h1>
          <p className="text-sm font-marathi text-[var(--dp-muted)] mb-3">
            {festival.date.toLocaleDateString('mr-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <span className="inline-flex items-center px-3 py-1 rounded text-xs font-semibold bg-[var(--dp-ground-well)] text-[var(--dp-gold)] border border-[var(--dp-rule)] font-marathi">
            {festival.daysUntil === 0
              ? 'आज हा पावन सण आहे'
              : festival.daysUntil > 0
              ? `${festival.daysUntil} दिवसांत येत आहे`
              : 'उत्सव संपन्न झाला'}
          </span>
        </header>

        <div className="vitthalaya-card rounded p-6 border border-[var(--dp-rule)]">
          <p className="vitthalaya-prose text-sm text-[var(--dp-ink-dim)] leading-relaxed">
            हा पावन उत्सव वारकरी संप्रदाय व महाराष्ट्राच्या भक्ती परंपरेत अत्यंत आदराने आणि भक्तिभावाने साजरा केला जातो.
          </p>
        </div>
      </div>
    </div>
  );
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
      <div className="vitthalaya-shell min-h-screen py-10">
        <div className="vitthalaya-container max-w-4xl text-center">
          <h1 className="vitthalaya-display text-2xl font-bold mb-4">
            सण सापडला नाही
          </h1>
          <Link href="/festival" className="vitthalaya-btn-secondary text-xs">
            उत्सव यादीकडे परत जा
          </Link>
        </div>
      </div>
    );
  }

  const slug = festival.nameTranslit.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="vitthalaya-shell min-h-screen py-10">
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
                compositionCount: festival.compositions.length,
              },
              [
                { name: 'मुख्यपृष्ठ', path: '/' },
                { name: 'उत्सव', path: '/festival' },
                { name: festival.nameMarathi, path: '/festival/' + slug },
              ],
            ),
          ),
        }}
      />

      <div className="vitthalaya-container max-w-4xl">
        <nav className="mb-6" aria-label="ब्रेडक्रंब">
          <ol className="flex items-center gap-2 text-xs font-marathi text-[var(--dp-muted)]">
            <li>
              <Link href="/" className="hover:text-[var(--dp-gold)] transition-colors">
                मुख्यपृष्ठ
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li>
              <Link href="/festival" className="hover:text-[var(--dp-gold)] transition-colors">
                उत्सव कालदर्शिका
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li className="text-[var(--dp-ink)]">{festival.nameMarathi}</li>
          </ol>
        </nav>

        <header className="mb-10 text-center vitthalaya-card rounded p-6 sm:p-8 border border-[var(--dp-rule)]">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--dp-ground-well)] border border-[var(--dp-gold)] flex items-center justify-center text-[var(--dp-gold)]">
            <Calendar size={24} aria-hidden="true" />
          </div>
          <h1 className="vitthalaya-display text-3xl sm:text-4xl font-bold mb-1">
            {festival.nameMarathi}
          </h1>
          <p className="text-xs font-marathi text-[var(--dp-muted)] mb-3">
            {festival.nameTranslit}
          </p>

          {festInfo && (
            <div className="mt-2">
              <span className="inline-flex items-center px-3 py-1 rounded text-xs font-semibold bg-[var(--dp-ground-well)] text-[var(--dp-gold)] border border-[var(--dp-rule)] font-marathi">
                {festInfo.daysUntil === 0
                  ? 'आज हा पावन सण आहे'
                  : festInfo.daysUntil > 0
                  ? `${festInfo.daysUntil} दिवसांत येत आहे`
                  : 'उत्सव संपन्न झाला'}
              </span>
            </div>
          )}

          {festival.dateRule && (
            <p className="text-xs text-[var(--dp-ink-dim)] mt-3 font-marathi">
              तिथी: {festival.dateRule}
            </p>
          )}
        </header>

        <section aria-labelledby="festival-compositions" className="space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--dp-rule)] pb-2">
            <h2 id="festival-compositions" className="vitthalaya-display text-xl font-bold">
              या सणासाठी भक्ती साहित्य ({festival.compositions.length})
            </h2>
          </div>

          {festival.compositions.length === 0 ? (
            <div className="vitthalaya-card rounded p-6 border border-[var(--dp-rule)] text-center">
              <p className="text-xs text-[var(--dp-muted)] font-marathi">
                ह्या सणासाठी अजून कोणतेही साहित्य जोडलेले नाही.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {festival.compositions.map((composition) => (
                <Link
                  key={composition.id}
                  href={`/abhang/${composition.slug}`}
                  className="group vitthalaya-card rounded p-4 flex items-center justify-between border border-[var(--dp-rule)] hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="vitthalaya-display text-base font-bold text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors truncate">
                      {composition.titleMarathi}
                    </p>
                    <p className="text-xs text-[var(--dp-muted)] font-marathi mt-0.5">
                      {composition.titleTranslit} • {composition.type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {composition.audioLinks && composition.audioLinks.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[var(--dp-gold)] bg-[var(--dp-ground-well)] px-2 py-0.5 rounded border border-[var(--dp-rule)] font-marathi">
                        <Music size={12} aria-hidden="true" />
                        ऑडिओ
                      </span>
                    )}
                    <ArrowRight size={14} className="text-[var(--dp-muted)] group-hover:text-[var(--dp-gold)] transition-colors" aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const rawSlug = await params;
  const slug = decodeURIComponent(rawSlug.slug);

  const dbFestival = await db.festival.findFirst({
    where: {
      OR: [
        { nameTranslit: { equals: slug.replace(/-/g, ' '), mode: 'insensitive' } },
        { nameTranslit: { equals: slug, mode: 'insensitive' } },
      ],
    },
  });

  const festivalName = dbFestival?.nameMarathi || slug;
  return {
    title: `${festivalName} : वारकरी सण व भक्ती साहित्य | डिजिटल पंढरपूर`,
    description: `${festivalName} निमित्त वारकरी संप्रदायातील भक्ती रचना, अभंग आणि माहिती.`,
    ...canonicalMetadata({ canonical: `/festival/${slug}` }),
  };
}
