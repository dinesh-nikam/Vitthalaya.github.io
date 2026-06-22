/**
 * Book SEO — generates JSON-LD structured data, Open Graph / Twitter meta tags,
 * and canonical URLs for all book-related pages.
 */

import type { BookType, BookStatus } from '../../book-generation/types';

// ── JSON-LD Schemas ───────────────────────────────────────────────────────────

export interface BookSEOMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage?: string;
  keywords?: string[];
  publishedAt?: string;
  modifiedAt?: string;
  authorName?: string;
  publisherName?: string;
  inLanguage?: string;
  isbn?: string;
  numberOfPages?: number;
  bookFormat?: string;
}

/**
 * Generates the full SEO package for a book page:
 * JSON-LD (schema.org/Book) + Open Graph + Twitter Card + HTML meta.
 */
export function generateBookSEO(meta: BookSEOMetadata): {
  jsonLd: string;
  ogTags: Record<string, string>;
  twitterTags: Record<string, string>;
  metaTags: Record<string, string>;
} {
  const jsonLd = generateBookJsonLd(meta);

  const ogTags: Record<string, string> = {
    'og:title': meta.title,
    'og:description': meta.description,
    'og:url': meta.canonicalUrl,
    'og:type': 'book',
    'og:site_name': 'Digital Pandharpur',
    'og:locale': 'mr_IN',
    ...(meta.ogImage ? { 'og:image': meta.ogImage } : {}),
  };

  const twitterTags: Record<string, string> = {
    'twitter:card': 'summary_large_image',
    'twitter:title': meta.title,
    'twitter:description': meta.description,
    ...(meta.ogImage ? { 'twitter:image': meta.ogImage } : {}),
  };

  const metaTags: Record<string, string> = {
    description: meta.description,
    keywords: (meta.keywords ?? ['Marathi devotional book', 'अभंग', 'आरती', 'भजन', 'वारकरी']).join(', '),
    'application-name': 'Digital Pandharpur',
    'book:title': meta.title,
    'book:author': meta.authorName ?? 'Digital Pandharpur',
  };

  return { jsonLd, ogTags, twitterTags, metaTags };
}

/**
 * Generates JSON-LD structured data for schema.org/Book.
 */
export function generateBookJsonLd(meta: BookSEOMetadata): string {
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: meta.title,
    description: meta.description,
    url: meta.canonicalUrl,
    inLanguage: meta.inLanguage ?? 'mr',
    publisher: {
      '@type': 'Organization',
      name: meta.publisherName ?? 'Digital Pandharpur',
    },
    author: {
      '@type': 'Person',
      name: meta.authorName ?? 'Digital Pandharpur',
    },
    bookFormat: meta.bookFormat ?? 'https://schema.org/Paperback',
  };

  if (meta.isbn) schema.isbn = meta.isbn;
  if (meta.numberOfPages) schema.numberOfPages = meta.numberOfPages;
  if (meta.publishedAt) schema.datePublished = meta.publishedAt;
  if (meta.modifiedAt) schema.dateModified = meta.modifiedAt;
  if (meta.ogImage) schema.image = meta.ogImage;

  return JSON.stringify(schema, null, 2);
}

/**
 * Generates CreativeWork schema for a composition on a saint hub page.
 */
export function generateCompositionSchema(params: {
  title: string;
  description: string;
  url: string;
  authorName?: string;
  image?: string;
}): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: params.title,
    description: params.description,
    url: params.url,
    author: params.authorName ? {
      '@type': 'Person',
      name: params.authorName,
    } : undefined,
    ...(params.image ? { image: params.image } : {}),
    publisher: { '@type': 'Organization', name: 'Digital Pandharpur' },
    inLanguage: 'mr',
  }, null, 2);
}

/**
 * Generates BreadcrumbList schema.
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }, null, 2);
}
