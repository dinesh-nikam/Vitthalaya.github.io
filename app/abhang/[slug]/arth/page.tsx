import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/src/db/client';
import { canonicalMetadata } from '@/src/lib/seo';
import { ArrowLeft, BookOpen } from 'lucide-react';

interface Props {
  params: Promise<{ slug: string }>;
}

type CompositionResult = {
  id: string;
  titleMarathi: string;
  titleTranslit: string;
  meaning: string | null;
  slug: string;
  type: string;
};

type EnrichmentResult = {
  summary: string | null;
  meaning: string | null;
  keywords: string[];
};

export default async function ArthPage({ params }: Props) {
  const rawSlug = await params;
  const slug = decodeURIComponent(rawSlug.slug);

  const composition = await db.composition.findUnique({
    where: { slug },
    select: { id: true, titleMarathi: true, titleTranslit: true, meaning: true, slug: true, type: true },
  }) as CompositionResult | null;

  if (!composition) notFound();

  const enrichment = await db.aiEnrichmentResult.findFirst({
    where: { compositionId: composition.id },
    select: { summary: true, meaning: true, keywords: true },
  }) as EnrichmentResult | null;

  const mainMeaning = enrichment?.meaning ?? composition.meaning;
  const mainSummary = enrichment?.summary;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <nav className="mb-6 text-sm">
        <ol className="flex items-center gap-2">
          <li><Link href="/">Home</Link></li>
          <li>›</li>
          <li className="font-medium">Meaning</li>
        </ol>
      </nav>

      <header className="mb-10">
        <Link href={`/abhang/${slug}`} className="inline-flex items-center gap-1 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="text-3xl font-bold">
          {composition.titleMarathi} - Meaning
        </h1>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {mainSummary && (
            <section className="bg-card rounded-lg p-6 border">
              <h2 className="text-xl mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" /> Summary
              </h2>
              <p>{mainSummary}</p>
            </section>
          )}
          {mainMeaning && (
            <section className="bg-card rounded-lg p-6 border">
              <h2 className="text-xl mb-4">Full Meaning</h2>
              <div className="whitespace-pre-line">{mainMeaning}</div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const rawSlug = await params;
  const slug = decodeURIComponent(rawSlug.slug);
  const composition = await db.composition.findUnique({ where: { slug }, select: { titleMarathi: true } });
  if (!composition) return { title: 'Meaning Not Found' };
  return {
    title: `${composition.titleMarathi} - Meaning`,
    ...canonicalMetadata({ canonical: `/abhang/${slug}/arth` }),
  };
}