import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/src/db/client';
import { Share2, Bookmark, Copy, Printer, Moon, Sun, Music } from 'lucide-react';
import { getFirstValidEmbed, hasAudioLinks } from '@/src/lib/youtube-embed';

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

  if (!composition) {
    notFound();
  }

  const composerSaint = composition.saint;
  const composerDeity = composition.deity;
  const hasAudio = hasAudioLinks(composition.audioLinks);
  const embedUrl = hasAudio ? getFirstValidEmbed(composition.audioLinks) : null;

  // Get related compositions (same saint)
  const relatedComps = composerSaint
    ? await db.composition.findMany({
        where: {
          saintId: composerSaint?.slug === composition.saint?.slug ? undefined : undefined,
          slug: { not: slug },
        },
        take: 3,
        select: {
          titleMarathi: true,
          slug: true,
          saint: {
            select: { nameMarathi: true },
          },
        },
      })
    : [];

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
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CreativeWork',
            name: composition.titleMarathi,
            alternateName: composition.titleTranslit,
            description: composition.meaning,
            inLanguage: 'mr',
            about: {
              '@type': 'Person',
              name: composerSaint?.nameMarathi,
            },
            creator: {
              '@type': 'Person',
              name: composerSaint?.nameMarathi,
            },
            genre: composition.type.toLowerCase(),
            url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/abhang/${slug}`,
          }),
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

      {/* Actions Bar */}
      <nav
        className="flex flex-wrap items-center gap-2 mb-8 justify-center sm:justify-start"
        aria-label="कृया"
      >
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-saffron/20 text-sm hover:bg-saffron/10 transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
          aria-label="बुकमार्क करा"
        >
          <Bookmark className="w-4 h-4" />
          <span>वाचले याला</span>
        </button>

        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-saffron/20 text-sm hover:bg-saffron/10 transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
          aria-label="शेयर करा"
        >
          <Share2 className="w-4 h-4" />
          <span>शेयर</span>
        </button>

        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-saffron/20 text-sm hover:bg-saffron/10 transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
          aria-label="कॉपी करा"
          onClick={() => navigator.clipboard.writeText(composition.fullText)}
        >
          <Copy className="w-4 h-4" />
          <span>कॉपी</span>
        </button>

        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-saffron/20 text-sm hover:bg-saffron/10 transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
          aria-label="प्रिंट करा"
          onClick={() => window.print()}
        >
          <Printer className="w-4 h-4" />
          <span>प्रिंट</span>
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <button
            className="p-2 rounded-lg border border-saffron/20 hover:bg-saffron/10 transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
            aria-label="डार्क मोड"
            onClick={() => document.documentElement.classList.add('dark')}
          >
            <Moon className="w-4 h-4" />
          </button>
          <button
            className="p-2 rounded-lg border border-saffron/20 hover:bg-saffron/10 transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
            aria-label="लाइट मोड"
            onClick={() => document.documentElement.classList.remove('dark')}
          >
            <Sun className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="grid md:grid-cols-3 gap-8">
        {/* Marathi Text - Main focus */}
        <div className="md:col-span-2 reading-area">
          <div className="bg-card rounded-lg p-6 sm:p-8 border border-saffron/10">
            <div className="reading-text font-marathi text-foreground whitespace-pre-line leading-loose text-xl">
              {composition.fullText}
            </div>
          </div>
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
    alternates: {
      canonical: `/abhang/${slug}`,
    },
  };
}