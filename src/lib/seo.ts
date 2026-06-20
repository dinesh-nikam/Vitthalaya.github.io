/**
 * SEO utilities for Digital Pandharpur
 *
 * Centralized structured data generation, canonical management,
 * and sitemap helpers for programmatic SEO at scale.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://digitalpandharpur.com';

// ─── Interfaces ───────────────────────────────────────────────

export interface CompositionSEO {
  id: string;
  titleMarathi: string;
  titleTranslit: string;
  slug: string;
  type: string;
  fullText: string;
  meaning: string | null;
  summary: string | null;
  saint: { nameMarathi: string; nameTranslit: string; slug: string } | null;
  deity: { nameMarathi: string } | null;
  category: { nameMarathi: string; slug: string } | null;
  festival: { nameMarathi: string; slug: string } | null;
  audioLinks: string[];
  source: string | null;
  updatedAt: Date;
}

export interface SaintSEO {
  nameMarathi: string;
  nameTranslit: string;
  slug: string;
  period: string | null;
  biography: string | null;
  region: string | null;
  compositionCount: number;
  relatedSaints: { nameMarathi: string; slug: string }[];
}

export interface CategorySEO {
  nameMarathi: string;
  nameTranslit: string;
  slug: string;
  description: string | null;
  parent: { nameMarathi: string; slug: string } | null;
  compositionCount: number;
  children: { nameMarathi: string; slug: string; count: number }[];
}

export interface FestivalSEO {
  nameMarathi: string;
  nameTranslit: string;
  slug: string;
  date: Date | null;
  compositionCount: number;
}

// ─── Site URL Helper ──────────────────────────────────────────

export function absoluteUrl(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${clean}`;
}

// ─── JSON-LD Builders ─────────────────────────────────────────

/**
 * WebSite schema (site-wide, embed in root layout).
 */
export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'डिजिटल पंढरपूर',
    alternateName: 'Digital Pandharpur',
    url: SITE_URL,
    inLanguage: 'mr',
    description: 'मराठी भक्ती साहित्याचा वाढता डिजिटल संग्रह — अभंग, भजन, आरत्या, स्तोत्रे आणि संत साहित्य',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Composition page JSON-LD — stacks CreativeWork + Article + BreadcrumbList.
 */
export function compositionSchema(
  comp: CompositionSEO,
  breadcrumbs: { name: string; path: string }[],
) {
  const url = absoluteUrl(`/abhang/${comp.slug}`);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CreativeWork',
        '@id': url,
        name: comp.titleMarathi,
        alternateName: comp.titleTranslit,
        description: comp.summary || comp.meaning || `${comp.titleTranslit} — ${comp.saint?.nameMarathi ?? 'अज्ञात संत'} यांचे ${comp.type}`,
        inLanguage: 'mr',
        genre: comp.type,
        ...(comp.saint && {
          author: { '@type': 'Person', name: comp.saint.nameMarathi },
          creator: { '@type': 'Person', name: comp.saint.nameMarathi },
        }),
        ...(comp.deity && {
          about: { '@type': 'Thing', name: comp.deity.nameMarathi },
        }),
        ...(comp.audioLinks.length > 0 && {
          associatedMedia: comp.audioLinks.map((url, i) => ({
            '@type': 'AudioObject',
            contentUrl: url,
            name: `${comp.titleMarathi} — ऑडिओ ${i + 1}`,
            inLanguage: 'mr',
          })),
        }),
        dateModified: comp.updatedAt.toISOString(),
        url,
      },
      {
        '@type': 'Article',
        headline: `${comp.titleMarathi} — अर्थ आणि स्पष्टीकरण`,
        description: comp.meaning || `${comp.titleTranslit} या ${comp.type}चा अर्थ आणि भावार्थ`,
        author: comp.saint ? { '@type': 'Person', name: comp.saint.nameMarathi } : undefined,
        inLanguage: 'mr',
        mainEntityOfPage: { '@id': url },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((cr, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: cr.name,
          item: absoluteUrl(cr.path),
        })),
      },
    ],
  };
}

/**
 * Saint page JSON-LD — Person + BreadcrumbList.
 */
export function saintSchema(saint: SaintSEO, breadcrumbs: { name: string; path: string }[]) {
  const url = absoluteUrl(`/sant/${saint.slug}`);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': url,
        name: saint.nameMarathi,
        alternateName: saint.nameTranslit,
        description: saint.biography
          ? saint.biography.slice(0, 300)
          : `${saint.nameMarathi} हे वारकरी संत आहेत.`,
        ...(saint.period && ({ birthDate: saint.period } as Record<string, string>)),
        ...(saint.region && ({ homeLocation: { '@type': 'Place', name: saint.region } } as Record<string, unknown>)),
        knowsAbout: ['अभंग', 'भक्ती', 'वारकरी'],
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        url,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((cr, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: cr.name,
          item: absoluteUrl(cr.path),
        })),
      },
    ],
  };
}

/**
 * Category page JSON-LD — Collection + BreadcrumbList.
 */
export function categorySchema(cat: CategorySEO, breadcrumbs: { name: string; path: string }[]) {
  const url = absoluteUrl(`/category/${cat.slug}`);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Collection',
        '@id': url,
        name: cat.nameMarathi,
        alternateName: cat.nameTranslit,
        description: cat.description || `${cat.nameMarathi} श्रेणीतील साहित्य`,
        inLanguage: 'mr',
        numberOfItems: cat.compositionCount,
        url,
        ...(cat.parent && {
          isPartOf: { '@type': 'Collection', name: cat.parent.nameMarathi, url: absoluteUrl(`/category/${cat.parent.slug}`) },
        }),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((cr, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: cr.name,
          item: absoluteUrl(cr.path),
        })),
      },
    ],
  };
}

/**
 * Festival page JSON-LD — Festival + BreadcrumbList.
 */
export function festivalSchema(fest: FestivalSEO, breadcrumbs: { name: string; path: string }[]) {
  const url = absoluteUrl(`/festival/${fest.slug}`);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Festival',
        '@id': url,
        name: fest.nameMarathi,
        alternateName: fest.nameTranslit,
        inLanguage: 'mr',
        ...(fest.date && {
          startDate: fest.date.toISOString().split('T')[0],
          endDate: fest.date.toISOString().split('T')[0],
        }),
        url,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((cr, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: cr.name,
          item: absoluteUrl(cr.path),
        })),
      },
    ],
  };
}

// ─── Canonical & Alternate Tags ────────────────────────────────

export interface CanonicalConfig {
  /** Canonical path (e.g. /abhang/tukaram-abhang-1) */
  canonical: string;
  /** Alternate representations */
  alternates?: { lang: string; path: string }[];
}

/**
 * Generate canonical + hreflang metadata for Next.js generateMetadata.
 */
export function canonicalMetadata(config: CanonicalConfig) {
  const alternates: Record<string, string> = {
    canonical: absoluteUrl(config.canonical),
  };

  if (config.alternates) {
    for (const alt of config.alternates) {
      alternates[alt.lang] = absoluteUrl(alt.path);
    }
  }

  return { alternates };
}

// ─── Sitemap Utility ──────────────────────────────────────────

export const SITEMAP_URLS_PER_FILE = 50000;
export const COMPOSITION_CHANGEFREQ = 'weekly' as const;
export const COMPOSITION_PRIORITY = 0.8;
export const ENTITY_CHANGEFREQ = 'monthly' as const;
export const ENTITY_PRIORITY = 0.6;
export const STATIC_CHANGEFREQ = 'monthly' as const;
export const STATIC_PRIORITY = 0.4;

export function buildUrlSet(
  entries: { loc: string; lastmod?: string; changefreq?: string; priority?: number }[],
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(e => `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    ${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}
    ${e.changefreq ? `<changefreq>${e.changefreq}</changefreq>` : ''}
    ${e.priority !== undefined ? `<priority>${e.priority.toFixed(1)}</priority>` : ''}
  </url>`).join('\n')}
</urlset>`;
}

export function buildSitemapIndex(entries: { loc: string; lastmod?: string }[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(e => `  <sitemap>
    <loc>${escapeXml(e.loc)}</loc>
    ${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}
  </sitemap>`).join('\n')}
</sitemapindex>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
