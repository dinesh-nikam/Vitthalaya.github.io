import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/src/db/client';

export const dynamic = 'force-dynamic';

async function getPage(slug: string) {
  const page = await db.page.findUnique({
    where: { slug },
    include: {
      author: { select: { name: true } },
      tags: { include: { tag: true } },
      featuredImage: true,
    },
  });
  if (!page || page.status !== 'PUBLISHED') return null;
  return page;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return { title: 'Page not found' };

  const title = page.seoTitle || page.title;
  const description = page.seoDescription || page.excerpt || undefined;
  const url = page.canonicalUrl || `/pages/${page.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      images: page.ogImageUrl ? [{ url: page.ogImageUrl }] : page.featuredImage ? [{ url: page.featuredImage.url }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      {page.featuredImage && (
        <div className="relative w-full h-64 rounded-2xl overflow-hidden mb-6">
          <Image
            src={page.featuredImage.url}
            alt={page.featuredImage.altText}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            priority
          />
        </div>
      )}

      <h1 className="text-3xl font-bold text-maroon-800 font-marathiHeading mb-2">
        {page.titleMarathi || page.title}
      </h1>

      <div className="flex items-center gap-3 text-sm text-gray-400 mb-8">
        {page.author?.name && <span>लेखक: {page.author.name}</span>}
        {page.publishedAt && <span>· {new Date(page.publishedAt).toLocaleDateString('mr-IN')}</span>}
      </div>

      {page.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {page.tags.map(({ tag }) => (
            <span
              key={tag.id}
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: (tag.color || '#FF7A1A') + '1a', color: tag.color || '#FF7A1A' }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {page.excerpt && (
        <p className="text-lg text-gray-600 italic mb-8 border-l-4 border-saffron pl-4">{page.excerpt}</p>
      )}

      <div className="prose prose-lg max-w-none whitespace-pre-wrap text-gray-800 leading-relaxed">
        {page.content}
      </div>

      <div className="mt-12 pt-6 border-t">
        <Link href="/" className="text-saffron hover:underline text-sm">← मुख्यपृष्ठावर परत जा</Link>
      </div>
    </article>
  );
}
