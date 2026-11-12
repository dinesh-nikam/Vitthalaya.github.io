import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';

export const revalidate = 3600; // ISR: revalidate every 1 hour
import { getFirstValidEmbed, hasAudioLinks } from '@/src/lib/youtube-embed';
import { compositionSchema, canonicalMetadata } from '@/src/lib/seo';
import { getGraphLinks } from '@/src/lib/cross-links';
import { CompositionReader } from '@/components/composition-reader';
import RelatedCompositions from '@/components/related-compositions';
import CorrectionPanel from '@/components/correction-panel';
import VersionHistory from '@/components/version-history';
import { ChevronRight, Scroll, Volume2 } from 'lucide-react';
import { TanpuraDrone } from '@/components/tanpura-drone';
import '@/app/homepage.css';

export default async function CompositionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const rawSlug = await params;
  const slug = decodeURIComponent(rawSlug.slug);
  const session = await getServerSession(authOptions).catch(() => null);

  // Fetch from database
  const composition = await db.composition.findUnique({
    where: { slug },
    include: {
      saint: {
        select: {
          nameMarathi: true,
          nameTranslit: true,
          slug: true,
        },
      },
      deity: {
        select: {
          nameMarathi: true,
        },
      },
    },
  });

  // Load AI enrichment result for AI-generated summary (if available)
  const enrichmentResult = composition
    ? await db.aiEnrichmentResult.findFirst({
        where: { compositionId: composition.id },
        select: { summary: true, meaning: true },
      })
    : null;

  // Load cross-links for internal linking
  const graphLinks = composition?.id
    ? await getGraphLinks('composition', composition.id, 4)
    : [];

  if (!composition) {
    notFound();
  }

  let audioLinks: string[] = [];
  if (composition.audioLinks) {
    try {
      audioLinks = typeof composition.audioLinks === 'string'
        ? JSON.parse(composition.audioLinks)
        : composition.audioLinks;
    } catch {
      audioLinks = [];
    }
  }

  const composerSaint = composition.saint;
  const composerDeity = composition.deity;
  const hasAudio = hasAudioLinks(audioLinks);
  const embedUrl = hasAudio ? getFirstValidEmbed(audioLinks) : null;

  // Get compositions by same saint
  let sameSaintComps: { titleMarathi: string; slug: string }[] = [];
  if (composition.saintId) {
    sameSaintComps = await db.composition.findMany({
      where: {
        saintId: composition.saintId,
        slug: { not: slug },
      },
      take: 4,
      select: {
        titleMarathi: true,
        slug: true,
      },
    });
  }

  return (
    <div className="vitthalaya-shell min-h-screen py-10">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            compositionSchema(
              {
                id: composition.id,
                titleMarathi: composition.titleMarathi,
                titleTranslit: composition.titleTranslit,
                slug: composition.slug,
                type: composition.type,
                fullText: composition.fullText,
                meaning: composition.meaning,
                summary: enrichmentResult?.summary ?? null,
                saint: composition.saint
                  ? {
                      nameMarathi: composition.saint.nameMarathi,
                      nameTranslit: composition.saint.nameTranslit,
                      slug: composition.saint.slug,
                    }
                  : null,
                deity: composition.deity
                  ? { nameMarathi: composition.deity.nameMarathi }
                  : null,
                category: null,
                festival: null,
                audioLinks: audioLinks,
                source: composition.source,
                updatedAt: composition.updatedAt,
              },
              [
                { name: 'मुख्यपृष्ठ', path: '/' },
                ...(composition.type
                  ? [{ name: composition.type, path: `/category/${composition.type.toLowerCase()}` }]
                  : []),
                { name: composition.titleMarathi, path: `/abhang/${composition.slug}` },
              ],
            ),
          ),
        }}
      />

      <article className="vitthalaya-container max-w-4xl">
        {/* Breadcrumb */}
        <nav className="mb-6" aria-label="ब्रेडक्रंब">
          <ol className="flex items-center gap-2 text-xs font-marathi text-[var(--dp-muted)]">
            <li>
              <Link href="/" className="hover:text-[var(--dp-gold)] transition-colors">
                मुख्यपृष्ठ
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li>
              <Link
                href={`/category/${composition.type.toLowerCase()}`}
                className="hover:text-[var(--dp-gold)] transition-colors"
              >
                {composition.type}
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li className="text-[var(--dp-ink)] truncate max-w-xs">{composition.titleMarathi}</li>
          </ol>
        </nav>

        {/* Sacred Header */}
        <header className="mb-8 text-center">
          <span className="inline-block px-3 py-1 bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] text-[var(--dp-gold)] text-xs font-marathi rounded mb-3">
            {composition.type}
          </span>

          <h1 className="vitthalaya-display text-3xl sm:text-4xl md:text-5xl font-bold mb-2">
            {composition.titleMarathi}
          </h1>

          {composition.titleTranslit && (
            <p className="text-sm text-[var(--dp-muted)] font-marathi mb-3">
              {composition.titleTranslit}
            </p>
          )}

          <div className="flex items-center justify-center gap-3 text-xs font-marathi">
            {composerSaint && (
              <Link
                href={`/sant/${composerSaint.slug}`}
                className="text-[var(--dp-gold)] hover:underline font-semibold"
              >
                {composerSaint.nameMarathi}
              </Link>
            )}
            {composerDeity && (
              <span className="text-[var(--dp-muted)]">
                , आराध्य: {composerDeity.nameMarathi}
              </span>
            )}
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Marathi Text: Primary Reading Area */}
          <div className="md:col-span-2 space-y-6">
            <div className="vitthalaya-manuscript rounded">
              <CompositionReader
                fullText={composition.fullText}
                titleMarathi={composition.titleMarathi}
                titleTranslit={composition.titleTranslit}
                slug={slug}
                saint={composerSaint}
                deity={composerDeity}
                embedUrl={embedUrl}
                compositionId={composition.id}
              />
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6" aria-label="संदर्भ व माहिती">
            {/* Meaning Panel */}
            {composition.meaning && (
              <div className="vitthalaya-card rounded p-5">
                <h2 className="vitthalaya-display text-base font-bold text-[var(--dp-gold)] mb-2">
                  भावार्थ
                </h2>
                <p className="vitthalaya-prose text-xs leading-relaxed">
                  {composition.meaning}
                </p>
              </div>
            )}

            {/* Ambient Tanpura Drone for Chanting */}
            <div className="vitthalaya-card rounded p-5 space-y-3">
              <h2 className="vitthalaya-display text-base font-bold text-[var(--dp-gold)]">
                पठण तानपुरा नाद
              </h2>
              <p className="vitthalaya-prose text-xs leading-relaxed">
                अभंग पठण करताना सात्त्विक तानपुऱ्याचा नाद सुरू करा:
              </p>
              <TanpuraDrone baseFrequency={130.81} autoPlay={false} />
            </div>

            {/* Composer Saint Mini-Card */}
            {composerSaint && (
              <div className="vitthalaya-card rounded p-5">
                <h2 className="vitthalaya-display text-base font-bold text-[var(--dp-gold)] mb-3">
                  रचनाकार संत
                </h2>
                <Link
                  href={`/sant/${composerSaint.slug}`}
                  className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] rounded"
                >
                  <div className="w-10 h-10 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] flex items-center justify-center flex-shrink-0 text-[var(--dp-gold)]">
                    <Scroll size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-marathi font-medium text-sm text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors">
                      {composerSaint.nameMarathi}
                    </p>
                    <p className="text-xs text-[var(--dp-muted)] font-marathi">
                      वारकरी परंपरा
                    </p>
                  </div>
                </Link>
              </div>
            )}

            {/* Audio Embed */}
            {embedUrl && (
              <div className="vitthalaya-card rounded p-5">
                <div className="flex items-center gap-2 mb-3 text-[var(--dp-gold)]">
                  <Volume2 size={16} aria-hidden="true" />
                  <h2 className="vitthalaya-display text-base font-bold">
                    श्राव्य मुद्रण
                  </h2>
                </div>
                <div className="aspect-video rounded overflow-hidden border border-[var(--dp-rule)]">
                  <iframe
                    src={embedUrl}
                    title={`${composition.titleMarathi} ऑडिओ`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}

            {/* Source */}
            {composition.source && (
              <div className="text-xs text-[var(--dp-muted)] font-marathi px-1">
                प्रमाणित संदर्भ: {composition.source}
              </div>
            )}

            {/* Community Corrections */}
            <div className="mt-4">
              <CorrectionPanel
                compositionId={composition.id}
                compositionTitle={composition.titleMarathi}
                isAuthenticated={!!session?.user}
              />
            </div>

            {/* Version History */}
            <div className="mt-3">
              <VersionHistory
                compositionId={composition.id}
              />
            </div>
          </aside>
        </div>

        {/* Related Compositions */}
        {sameSaintComps.length > 0 && (
          <section className="mt-12 pt-8 border-t border-[var(--dp-rule)]" aria-labelledby="related-compositions">
            <h2 id="related-compositions" className="vitthalaya-display text-xl font-bold mb-4">
              संतांचे इतर अभंग
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {sameSaintComps.map((related) => (
                <Link
                  key={related.slug}
                  href={`/abhang/${related.slug}`}
                  className="vitthalaya-card rounded p-4 group block hover:border-[var(--dp-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
                >
                  <p className="font-marathi font-medium text-sm text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors">
                    {related.titleMarathi}
                  </p>
                  <p className="text-xs text-[var(--dp-muted)] font-marathi mt-1">
                    {composerSaint?.nameMarathi}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Cross-links from knowledge graph */}
        {graphLinks.length > 0 && (
          <section className="mt-8 pt-6 border-t border-[var(--dp-rule)]" aria-labelledby="explore-more">
            <h2 id="explore-more" className="vitthalaya-display text-lg font-bold mb-3">
              संबंधित विषय
            </h2>
            <div className="flex flex-wrap gap-2">
              {graphLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-1.5 rounded border border-[var(--dp-rule)] bg-[var(--dp-ground-well)] px-3 py-1.5 text-xs font-marathi text-[var(--dp-ink-dim)] hover:border-[var(--dp-gold)] hover:text-[var(--dp-ink)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Related Compositions Knowledge Graph */}
        <section className="mt-8">
          <RelatedCompositions compositionId={composition.id} limit={6} />
        </section>
      </article>
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

  const composition = await db.composition.findUnique({
    where: { slug },
    include: {
      saint: {
        select: { nameMarathi: true },
      },
      deity: {
        select: { nameMarathi: true },
      },
    },
  });

  if (!composition) {
    return {
      title: 'अभंग सापडले नाही - डिजिटल पंढरपूर',
    };
  }

  return {
    title: `${composition.titleMarathi} - डिजिटल पंढरपूर`,
    description: `${composition.titleTranslit} - ${composition.saint?.nameMarathi || 'अज्ञात संत'} यांचे ${composition.type.toLowerCase()}`,
    openGraph: {
      title: composition.titleMarathi,
      description: `${composition.titleTranslit} - वाचा डिजिटल पंढरपूर वर`,
      type: 'article',
      locale: 'mr_IN',
    },
    twitter: {
      card: 'summary_large_image',
      title: composition.titleMarathi,
      description: `${composition.titleTranslit} - वाचा डिजिटल पंढरपूर वर`,
    },
    ...canonicalMetadata({ canonical: `/abhang/${slug}` }),
  };
}

export async function generateStaticParams() {
  const compositions = await db.composition.findMany({
    take: 50,
    select: { slug: true },
    orderBy: { updatedAt: 'desc' },
  });
  return compositions.map((c) => ({ slug: c.slug }));
}
