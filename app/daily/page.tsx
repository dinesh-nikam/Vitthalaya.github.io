import Link from 'next/link';
import { db } from '@/src/db/client';
import { canonicalMetadata } from '@/src/lib/seo';
import {
  BookOpen,
  CalendarDays,
  Lightbulb,
  Quote,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Scroll,
} from 'lucide-react';
import '@/app/homepage.css';

export const dynamic = 'force-dynamic';

const DAY_EPOCH = Date.UTC(2026, 0, 1);
const MS_PER_DAY = 86_400_000;

function dayIndex(now: Date): number {
  return Math.floor((now.getTime() - DAY_EPOCH) / MS_PER_DAY);
}

const SLOT_META: Record<
  string,
  { title: string; subtitle: string; icon: typeof BookOpen }
> = {
  ABHANG: { title: 'आजचा अभंग', subtitle: 'दैनिक अभंग दर्शन', icon: BookOpen },
  SAINT: { title: 'आजचा संत', subtitle: 'संत चरित्र व विचार', icon: Sparkles },
  THOUGHT: { title: 'आजचे चिंतन', subtitle: 'अध्यात्मिक विचार', icon: Quote },
  FESTIVAL: { title: 'आजचा सण किंवा व्रत', subtitle: 'उत्सव व दिनविशेष', icon: CalendarDays },
  DID_YOU_KNOW: { title: 'तुम्हाला माहीत आहे का?', subtitle: 'वारकरी परंपरा संदर्भ', icon: Lightbulb },
};

export const metadata = {
  title: 'आजची भक्ती साधना | डिजिटल पंढरपूर',
  description:
    'रोज एक अभंग, एक संत, एक चिंतन, एक सण आणि एक माहिती: वारकरी संस्कृतीचा दैनंदिन आनंद.',
  ...canonicalMetadata({ canonical: '/daily' }),
};

export default async function DailyPage() {
  const today = new Date();
  const day = dayIndex(today);

  const features = await db.dailyFeature.findMany({
    include: {
      composition: {
        select: {
          id: true,
          titleMarathi: true,
          titleTranslit: true,
          slug: true,
          type: true,
          fullText: true,
          meaning: true,
          saintId: true,
          alternateTitles: true,
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
    <div className="vitthalaya-shell min-h-screen py-12">
      <div className="vitthalaya-container max-w-4xl">
        {/* Breadcrumb */}
        <nav className="mb-8" aria-label="ब्रेडक्रंब">
          <ol className="flex items-center gap-2 text-xs font-marathi text-[var(--dp-muted)]">
            <li>
              <Link href="/" className="hover:text-[var(--dp-gold)] transition-colors">
                मुख्यपृष्ठ
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight size={12} />
            </li>
            <li className="text-[var(--dp-ink)]">आजची भक्ती साधना</li>
          </ol>
        </nav>

        {/* Page Header */}
        <header className="mb-12 text-center">
          <p className="text-xs text-[var(--dp-gold)] font-marathi mb-2">
            दैनिक उपासना व नित्यनेम
          </p>
          <h1 className="vitthalaya-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
            आजची भक्ती साधना
          </h1>
          <p className="text-base text-[var(--dp-ink-dim)] font-marathi">{todayLabel}</p>
          <p className="vitthalaya-prose text-xs text-[var(--dp-muted)] mt-2 max-w-lg mx-auto">
            रोज एक अभंग, एक संत आणि एक चिंतन: वारकरी संस्कृतीसोबत दिवस सुरू करा.
          </p>
        </header>

        {/* Daily Picks Stack */}
        <div className="space-y-6">
          {picks.map(({ slot, feature }) => {
            const meta = SLOT_META[slot];
            const Icon = meta.icon;

            // Prioritize pure poetic verse for ABHANG slot
            let body: string | null =
              slot === 'ABHANG' && feature.composition?.fullText
                ? feature.composition.fullText
                : feature.bodyMarathi;

            let meaningText: string | null = null;
            let detail: string | null = null;
            let href: string | null = null;
            let linkLabel: string | null = null;
            let editionNote: string | null = null;

            if (slot === 'ABHANG' && feature.composition) {
              href = `/abhang/${feature.composition.slug}`;
              linkLabel = 'पूर्ण अभंग वाचा';
              meaningText = feature.composition.meaning || null;

              const saintName = feature.composition.saint?.nameMarathi;
              detail = saintName ? `संत: ${saintName}` : null;

              // Parse alternateTitles for edition references
              const rawAlternates = feature.composition.alternateTitles;
              const alternates: string[] = Array.isArray(rawAlternates)
                ? (rawAlternates as string[])
                : typeof rawAlternates === 'string'
                  ? JSON.parse(rawAlternates || '[]')
                  : [];

              const editionMatch = alternates.find(
                (a) => /गाथा|क्रमांक|अभंग\s+[०-९0-9]+/i.test(a) && a !== feature.titleMarathi,
              );
              if (editionMatch) {
                editionNote = editionMatch;
                if (detail) {
                  detail += ` • संग्रह संदर्भ: ${editionMatch}`;
                }
              }
            } else if (slot === 'SAINT' && feature.saint) {
              href = `/sant/${feature.saint.slug}`;
              linkLabel = 'संतांची माहिती वाचा';
              body = feature.bodyMarathi;
              detail = feature.saint.nameTranslit;
            } else if (slot === 'FESTIVAL' && feature.festival) {
              href = `/festival/${feature.festival.nameTranslit.toLowerCase().replace(/\s+/g, '-')}`;
              linkLabel = 'सणाबद्दल अधिक वाचा';
              body = feature.bodyMarathi;
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
                className="vitthalaya-card rounded p-6 sm:p-8"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] flex items-center justify-center flex-shrink-0 text-[var(--dp-gold)]">
                    <Icon size={20} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--dp-gold)] font-marathi">
                      {meta.subtitle}
                    </p>
                    <h2
                      id={`daily-${slot.toLowerCase()}`}
                      className="vitthalaya-display text-xl sm:text-2xl font-bold mt-0.5"
                    >
                      {meta.title}
                    </h2>
                  </div>
                </div>

                {feature.titleMarathi && slot !== 'THOUGHT' && slot !== 'DID_YOU_KNOW' && (
                  <div className="mb-3">
                    <h3 className="vitthalaya-display text-lg sm:text-xl font-bold text-[var(--dp-ink)]">
                      {feature.titleMarathi}
                    </h3>
                    {editionNote && (
                      <p className="text-xs text-[var(--dp-gold)] font-marathi mt-0.5">
                        {editionNote}
                      </p>
                    )}
                  </div>
                )}

                {/* Primary Verse / Thought Body */}
                {body && (
                  <div className="vitthalaya-verse-text text-sm sm:text-base mb-4 bg-[var(--dp-ground-well)] p-4 sm:p-5 rounded border border-[var(--dp-rule)] whitespace-pre-line leading-relaxed">
                    {body}
                  </div>
                )}

                {/* Clear, distinct Meaning & Narrative Story Section (if available) */}
                {slot === 'ABHANG' && meaningText && (
                  <div className="mb-4 p-4 rounded bg-[var(--dp-ground)] border border-[var(--dp-rule)]/80">
                    <h4 className="text-xs font-semibold text-[var(--dp-gold)] font-marathi mb-1 flex items-center gap-1.5">
                      <Scroll size={13} aria-hidden="true" />
                      <span>भावार्थ व संदर्भ कथा:</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-[var(--dp-ink-dim)] font-marathi leading-relaxed">
                      {meaningText}
                    </p>
                  </div>
                )}

                {detail && (
                  <p className="text-xs text-[var(--dp-muted)] font-marathi mb-4">
                    संदर्भ: {detail}
                  </p>
                )}

                {href && linkLabel && (
                  <div className="pt-3 border-t border-[var(--dp-rule)]">
                    <Link
                      href={href}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold font-marathi text-[var(--dp-gold)] hover:underline"
                    >
                      {linkLabel}
                      <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* Nityanem Companion Banner */}
        <section className="mt-12 vitthalaya-card rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[var(--dp-ground-well)] to-[var(--dp-ground)] border border-[var(--dp-rule)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-[11px] font-marathi font-semibold text-[var(--dp-gold)] uppercase tracking-wider">
              वारकरी नित्य साधना
            </span>
            <h3 className="vitthalaya-display text-xl sm:text-2xl font-bold">
              दैनिक ५ प्रहर नित्यनेम व टाळ-मृदंग ठेका
            </h3>
            <p className="text-xs sm:text-sm text-[var(--dp-ink-dim)] font-marathi max-w-xl">
              काकड आरती, हरिपाठ, गावळणी, धुपारती व शेजारतीचे वेळेनुसार पठण आणि संवादी टाळ-मृदंग ताल साथी.
            </p>
          </div>
          <Link
            href="/nityanem"
            className="vitthalaya-btn-primary text-xs shrink-0 flex items-center gap-2"
          >
            <span>नित्यनेम साधना उघडा</span>
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </section>

        {/* Related Compositions */}
        {relatedAbhangs.length > 0 && (
          <section className="mt-12 pt-8 border-t border-[var(--dp-rule)]" aria-labelledby="related-heading">
            <h2 id="related-heading" className="vitthalaya-display text-xl font-bold mb-4">
              संतांचे इतर निवडक अभंग
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedAbhangs.map((abhang) => (
                <Link
                  key={abhang.id}
                  href={`/abhang/${abhang.slug}`}
                  className="vitthalaya-card rounded p-4 group block hover:border-[var(--dp-gold)]"
                >
                  <p className="font-marathi font-medium text-sm text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors">
                    {abhang.titleMarathi}
                  </p>
                  <span className="text-xs text-[var(--dp-muted)] font-marathi mt-1 inline-flex items-center gap-1">
                    अभंग वाचा
                    <ArrowRight size={11} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
