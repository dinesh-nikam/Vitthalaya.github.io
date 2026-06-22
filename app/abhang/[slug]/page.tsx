import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';
import { getFirstValidEmbed, hasAudioLinks } from '@/src/lib/youtube-embed';
import { compositionSchema, canonicalMetadata } from '@/src/lib/seo';
import { getGraphLinks } from '@/src/lib/cross-links';
import { CompositionReader } from '@/components/composition-reader';
import RelatedCompositions from '@/components/related-compositions';
import CorrectionPanel from '@/components/correction-panel';
import VersionHistory from '@/components/version-history';

interface Composition {
  id: string;
  titleMarathi: string;
  titleTranslit: string;
  fullText: string;
  meaning: string | null;
  saint: {
    nameMarathi: string;
    nameTranslit: string;
    slug: string;
  } | null;
  deity: {
    nameMarathi: string;
  } | null;
  audioLinks: string[];
  source: string | null;
}

export default async function CompositionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);

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
    <>
      {/* JSON-LD Structured Data — CreativeWork + Article + BreadcrumbList */}
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

      <article className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <header className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="px-3 py-1 bg-saffron/10 text-saffron text-sm rounded-full">
            {composition.type.toLowerCase()}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-marathiHeading text-maroon mb-3 leading-tight">
          {composition.titleMarathi}
        </h1>

        <p className="text-lg text-muted-foreground mb-4">
          {composition.titleTranslit}
        </p>

        <div className="flex items-center justify-center gap-4 text-sm">
          {composerSaint && (
            <a
              href={`/sant/${composerSaint.slug}`}
              className="text-saffron hover:underline font-medium"
            >
              {composerSaint.nameMarathi}
            </a>
          )}
          {composerDeity && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{composerDeity.nameMarathi}</span>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="grid md:grid-cols-3 gap-8">
        {/* Marathi Text - Main focus (rendered using CompositionReader client component) */}
        <div className="md:col-span-2 space-y-6">
          <CompositionReader
            fullText={composition.fullText}
            titleMarathi={composition.titleMarathi}
            titleTranslit={composition.titleTranslit}
            slug={slug}
            saint={composerSaint}
            deity={composerDeity}
            embedUrl={embedUrl}
          />
        </div>

        {/* Sidebar - Meaning & Context */}
        <aside className="space-y-6" aria-label="संदर्भ व मालमत">
          {/* Meaning Panel */}
          {composition.meaning && (
            <div className="bg-card rounded-lg p-5 border border-saffron/10">
              <h2 className="font-marathiHeading text-lg text-maroon mb-3">
                अर्थ
              </h2>
              <p className="text-sm text-foreground leading-relaxed">
                {composition.meaning}
              </p>
            </div>
          )}

          {/* Saint Mini-Card */}
          {composerSaint && (
            <div className="bg-card rounded-lg p-5 border border-saffron/10">
              <h2 className="font-marathiHeading text-lg text-maroon mb-3">
                संत
              </h2>
              <a
                href={`/sant/${composerSaint.slug}`}
                className="flex items-center gap-3 group"
              >
                <div className="w-12 h-12 rounded-full bg-saffron/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl" aria-hidden="true">
                    🙏
                  </span>
                </div>
                <div>
                  <p className="font-marathi font-medium text-foreground group-hover:text-saffron transition-colors">
                    {composerSaint.nameMarathi}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    विठ्ठल वारकरीचा संत
                  </p>
                </div>
              </a>
            </div>
          )}

          {/* Audio Embed */}
          {embedUrl && (
            <div className="bg-card rounded-lg p-5 border border-saffron/10">
              <h2 className="font-marathiHeading text-lg text-maroon mb-3">
                ऑडियो
              </h2>
              <div className="aspect-video">
                <iframe
                  src={embedUrl}
                  title={`${composition.titleMarathi} ऑडियो`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full rounded"
                />
              </div>
            </div>
          )}

          {/* Source */}
          {composition.source && (
            <div className="text-xs text-muted-foreground">
              स्रोत: {composition.source}
            </div>
          )}

          {/* Community: Correction Suggestion */}
          <div className="mt-4">
            <CorrectionPanel
              compositionId={composition.id}
              compositionTitle={composition.titleMarathi}
              isAuthenticated={!!session?.user}
            />
          </div>

          {/* Community: Version History */}
          <div className="mt-3">
            <VersionHistory
              compositionId={composition.id}
              compositionSlug={composition.slug}
            />
          </div>
        </aside>
      </div>

      {/* Related Compositions by same saint */}
      {sameSaintComps.length > 0 && (
        <section className="mt-12" aria-labelledby="related-compositions">
          <h2 id="related-compositions" className="font-marathiHeading text-2xl text-maroon mb-6">
            संतांचे इतर अभंग
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {sameSaintComps.map((related) => (
              <Link
                key={related.slug}
                href={`/abhang/${related.slug}`}
                className="block rounded-lg border border-saffron/10 bg-card p-4 hover:shadow-md hover:border-saffron/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-saffron"
              >
                <p className="font-marathi font-medium text-foreground">
                  {related.titleMarathi}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {composerSaint?.nameMarathi}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Cross-links from knowledge graph — link equity distribution */}
      {graphLinks.length > 0 && (
        <section className="mt-8" aria-labelledby="explore-more">
          <h2 id="explore-more" className="font-marathiHeading text-2xl text-maroon mb-6">
            अधिक शोधा
          </h2>
          <div className="flex flex-wrap gap-3">
            {graphLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-2 rounded-full border border-saffron/20 bg-saffron/5 px-4 py-2 text-sm font-medium text-foreground hover:bg-saffron/10 hover:border-saffron/30 transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Related compositions via knowledge graph */}
      <section className="mt-8">
        <RelatedCompositions compositionId={composition.id} limit={6} />
      </section>
    </article>
    </>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

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