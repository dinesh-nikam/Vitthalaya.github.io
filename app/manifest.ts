/**
 * PWA Web App Manifest — enables install prompt, defines app metadata.
 * Localized per active locale (read from NEXT_LOCALE cookie / Accept-Language).
 */
import type { MetadataRoute } from 'next';
import { cookies, headers } from 'next/headers';
import { isSupportedLocale, LOCALES, DEFAULT_LOCALE } from '@/src/i18n/request';

const MANIFEST_APP: Record<string, { name: string; shortName: string; description: string }> = {
  mr: {
    name: 'डिजिटल पंढरपूर — मराठी भक्ती साहित्य',
    shortName: 'डिजिटल पंढरपूर',
    description: 'लाखो अभंग, भजन, गौळणी, आरत्या, स्तोत्रे आणि संत साहित्य एका ठिकाणी',
  },
  en: {
    name: 'Digital Pandharpur — Marathi Devotional Literature',
    shortName: 'Digital Pandharpur',
    description: 'Lakhs of Abhangs, Bhajans, Gaulani, Aartis, Stotras and Saint literature in one place',
  },
  hi: {
    name: 'डिजिटल पंढरपुर — मराठी भक्ति साहित्य',
    shortName: 'डिजिटल पंढरपुर',
    description: 'लाखों अभंग, भजन, गौळणी, आरतियाँ, स्तोत्र और संत साहित्य एक ही स्थान पर',
  },
};

async function resolveLocale(): Promise<string> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  if (isSupportedLocale(cookieLocale)) return cookieLocale;

  const headerStore = await headers();
  const acceptLanguage = headerStore.get('accept-language');
  if (acceptLanguage) {
    for (const tag of acceptLanguage.split(',')) {
      const primary = tag.trim().split(';')[0]?.split('-')[0]?.toLowerCase();
      if (primary && (LOCALES as readonly string[]).includes(primary)) return primary;
    }
  }
  return DEFAULT_LOCALE;
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const locale = await resolveLocale();
  const app = MANIFEST_APP[locale] ?? MANIFEST_APP[DEFAULT_LOCALE];

  return {
    name: app.name,
    short_name: app.shortName,
    description: app.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#FFF8EC',
    theme_color: '#FF7A1A',
    orientation: 'any',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['books', 'religion', 'education'],
    lang: locale,
    dir: 'ltr',
  };
}