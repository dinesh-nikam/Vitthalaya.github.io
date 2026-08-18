import Link from 'next/link';
import { db } from '@/src/db/client';
import { canonicalMetadata } from '@/src/lib/seo';
import {
  BookOpen,
  Church,
  CalendarDays,
  Lightbulb,
  Quote,
  Sparkles,
  ArrowRight,
  Music,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// Rotation anchor — day index counts from here so the pick changes daily
// and is stable within a day (UTC).
const DAY_EPOCH = Date.UTC(2026, 0, 1);
const MS_PER_DAY = 86_400_000;

function dayIndex(now: Date): number {
  return Math.floor((now.getTime() - DAY_EPOCH) / MS_PER_DAY);
}

const SLOT_META: Record<
  string,
  { title: string; subtitle: string; icon: typeof BookOpen }
> = {
  ABHANG: { title: 'आजचा अभंग', subtitle: 'Daily Abhang', icon: BookOpen },
  SAINT: { title: 'आजचा संत', subtitle: 'Daily Saint', icon: Sparkles },
  THOUGHT: { title: 'आजचे चिंतन', subtitle: 'Daily Thought', icon: Quote },
  FESTIVAL: { title: 'आजचा सण / व्रत', subtitle: 'Daily Festival', icon: CalendarDays },
  DID_YOU_KNOW: { title: 'तुम्हाला माहीत आहे का?', subtitle: 'Did You Know', icon: Lightbulb },
};

export const metadata = {
  title: 'आजचे भक्ती | डिजिटल पंढरपूर',
  description:
    'रोज एक अभंग, एक संत, एक चिंतन, एक सण आणि एक माहिती — वारकरी संस्कृतीचा दैनंदिन आनंद.',
  ...canonicalMetadata({ canonical: '/daily' }),
};

export default async function DailyPage() {
  const today = new Date();
  const day = dayIndex(today);

  // Fetch every rotation entry in one query; pick per slot by day index.
  const features = await db.dailyFeature.findMany({
    include: {
      composition: {
        select: {
          id: true,
          titleMarathi: true,
          titleTranslit: true,
          slug: true,
          type: true,
          saintId: true,
          saint: { select: { slug: true, nameMarathi: true } },
        },
      },
      saint: {
        select: { id: true, slug: true, nameMarathi: true, nameTranslit: true, period: true },
      },
      festival: { select: { id: true, nameMarathi: true, nameTranslit: true, dateRule: true } },
    },
    orderBy: { rotationIndex: 'asc' },
  });

  const bySlot = new Map<string, typeof features>();
  for (const f of features) {
    const list = bySlot.get(f.slot) ?? [];
    list.push(f);
    bySlot.set(f.slot, list);
  }

  const slots = ['ABHANG', 'SAINT', 'THOUGHT', 'FESTIVAL', 'DID_YOU_KNOW'] as const;
  const picks = slots
    .map((slot) => {
      const pool = bySlot.get(slot) ?? [];
      if (pool.length === 0) return null;
      return { slot, feature: pool[((day % pool.length) + pool.length) % pool.length] };
    })
    .filter((p): p is { slot: (typeof slots)[number]; feature: (typeof features)[number] } => !!p);

  // Related content for the day's abhang: same-saint compositions.
  const abhangPick = picks.find((p) => p.slot === 'ABHANG')?.feature;
  const relatedAbhangs =
    abhangPick?.composition?.saint?.slug && abhangPick.compositionId
      ? await db.composition.findMany({
          where: {
            saintId: abhangPick.composition.saintId ?? undefined,
            id: { not: abhangPick.compositionId },
          },
          select: { id: true, titleMarathi: true, slug: true },
          take: 4,
          orderBy: { createdAt: 'asc' },
        })
      : [];

  const todayLabel = today.toLocaleDateString('mr-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="ब्रेडक्रंब">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-saffron">
              मुख्यपृष्ठ
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li className="text-foreground">आजचे भक्ती</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-10 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-saffron/15 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-saffron" aria-hidden="true" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-marathiHeading text-maroon dark:text-saffron font-bold mb-2">
          आजचे भक्ती 🙏
        </h1>
        <p className="text-lg text-muted-foreground font-medium">{todayLabel}</p>
        <p className="text-sm text-muted-foreground mt-1">
          रोज एक अभंग, एक संत, एक चिंतन — वारकरी संस्कृतीसोबत दिवस सुरू करा.
        </p>
      </header>

      {/* Slots */}
      <div className="space-y-8">
        {picks.map(({ slot, feature }) => {
          const meta = SLOT_META[slot];
          const Icon = meta.icon;

          let body: string | null = feature.bodyMarathi;
          let detail: string | null = null;
          let href: string | null = null;
          let linkLabel: string | null = null;

          if (slot === 'ABHANG' && feature.composition) {
            href = `/abhang/${feature.composition.slug}`;
            linkLabel = 'पूर्ण अभंग वाचा';
            body = feature.bodyMarathi;
            detail = feature.composition.type
              ? `${feature.composition.type} · ${feature.composition.saint?.nameMarathi ?? ''}`.replace(
                  /\s·\s+$/,
                  ''
                )
              : feature.composition.saint?.nameMarathi ?? null;
          } else if (slot === 'SAINT' && feature.saint) {
            href = `/sant/${feature.saint.slug}`;
            linkLabel = 'संतांची माहिती';
            body = feature.bodyMarathi; // period
            detail = feature.saint.nameTranslit;
          } else if (slot === 'FESTIVAL' && feature.festival) {
            href = `/festival/${feature.festival.nameTranslit.toLowerCase().replace(/\s+/g, '-')}`;
            linkLabel = 'सणाबद्दल अधिक';
            body = feature.bodyMarathi; // date rule
            detail = feature.festival.nameTranslit;
          } else if (slot === 'THOUGHT') {
            if (feature.composition) {
              href = `/abhang/${feature.composition.slug}`;
              linkLabel = 'मूळ रचना वाचा';
            }
            detail = feature.titleMarathi;
          } else if (slot === 'DID_YOU_KNOW') {
            if (feature.saint) {
              href = `/sant/${feature.saint.slug}`;
              linkLabel = 'अधिक जाणून घ्या';
            }
            detail = feature.titleMarathi;
          }

          return (
            <section
              key={slot}
              aria-labelledby={`daily-${slot.toLowerCase()}`}
              className="rounded-xl border border-saffron/15 bg-card p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-saffron/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-saffron" aria-hidden="true" />
                </div>
                <div>
                  <h2
                    id={`daily-${slot.toLowerCase()}`}
                    className="font-marathiHeading text-lg font-bold text-maroon dark:text-saffron"
                  >
                    {meta.title}
                  </h2>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {meta.subtitle}
                  </p>
                </div>
              </div>

              <p className="font-marathi text-foreground leading-relaxed text-lg">
                {feature.titleMarathi}
              </p>
              {detail && <p className="text-sm text-muted-foreground mt-1">{detail}</p>}
              {body && (
                <blockquote className="mt-4 border-l-4 border-saffron/40 pl-4 font-marathi text-muted-foreground leading-relaxed">
                  {body}
                </blockquote>
              )}

              {href && linkLabel && (
                <Link
                  href={href}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-saffron hover:underline focus:outline-none focus:ring-2 focus:ring-saffron rounded"
                >
                  {linkLabel}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              )}
            </section>
          );
        })}
      </div>

      {/* Related: more from the day's saint */}
      {relatedAbhangs.length > 0 && (
        <section
          aria-labelledby="related-abhangs"
          className="mt-10 rounded-xl border border-saffron/15 bg-card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Music className="w-5 h-5 text-saffron" aria-hidden="true" />
            <h2
              id="related-abhangs"
              className="font-marathiHeading text-lg font-bold text-maroon dark:text-saffron"
            >
              याच संतांचे अधिक अभंग
            </h2>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {relatedAbhangs.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/abhang/${c.slug}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 hover:bg-saffron/10 transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
                >
                  <span className="font-marathi text-foreground">{c.titleMarathi}</span>
                  <ArrowRight className="w-4 h-4 text-saffron flex-shrink-0" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Explore footer */}
      <section aria-labelledby="explore-more" className="mt-10 text-center">
        <h2 id="explore-more" className="sr-only">
          अधिक शोधा
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-saffron/20 text-sm hover:bg-saffron/10 transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
          >
            <Church className="w-4 h-4 text-saffron" aria-hidden="true" />
            एक्सप्लोर करा
          </Link>
          <Link
            href="/saints"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-saffron/20 text-sm hover:bg-saffron/10 transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
          >
            <Sparkles className="w-4 h-4 text-saffron" aria-hidden="true" />
            संत मंडळ
          </Link>
          <Link
            href="/festival"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-saffron/20 text-sm hover:bg-saffron/10 transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
          >
            <CalendarDays className="w-4 h-4 text-saffron" aria-hidden="true" />
            सण-उत्सव
          </Link>
        </div>
      </section>
    </div>
  );
}
