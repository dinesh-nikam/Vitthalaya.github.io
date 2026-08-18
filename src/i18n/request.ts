/**
 * next-intl request configuration — resolves the active locale per request.
 *
 * Resolution order:
 *   1. `NEXT_LOCALE` cookie (explicit user choice via LanguageSwitcher)
 *   2. `Accept-Language` header (first supported locale)
 *   3. `mr` (project default — the platform's primary language)
 *
 * Cookie-based (no URL prefixes) so all existing routes/URLs stay intact.
 */
import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { createMessages } from './messages';

// Pure constants live in locales.ts so client components can import them
// without pulling next/headers into the client bundle.
import {
  LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isSupportedLocale,
  detectFromAcceptLanguage,
} from './locales';
export type { Locale } from './locales';
export {
  LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isSupportedLocale,
  detectFromAcceptLanguage,
};

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  // 1. Explicit cookie preference
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isSupportedLocale(cookieLocale)) {
    return { locale: cookieLocale, messages: createMessages(cookieLocale) };
  }

  // 2. Browser language
  const headerLocale = detectFromAcceptLanguage(headerStore.get('accept-language'));
  if (headerLocale) {
    return { locale: headerLocale, messages: createMessages(headerLocale) };
  }

  // 3. Default
  return { locale: DEFAULT_LOCALE, messages: createMessages(DEFAULT_LOCALE) };
});
