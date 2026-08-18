/**
 * Pure locale constants — no server-only imports.
 *
 * Client components (e.g. LanguageSwitcher) import LOCALES from here;
 * server code can import the same values from `@/src/i18n/request`
 * (which re-exports these for compatibility).
 */
export const LOCALES = ['mr', 'en', 'hi'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'mr';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

const localeSet = new Set<string>(LOCALES);

export function isSupportedLocale(value: string | undefined): value is Locale {
  return !!value && localeSet.has(value);
}

/**
 * Best-effort locale detection from the Accept-Language header.
 * Returns the first supported locale found (or undefined).
 */
export function detectFromAcceptLanguage(headerValue: string | null): Locale | undefined {
  if (!headerValue) return undefined;
  // Parse "mr-IN, mr;q=0.9, en;q=0.8" — take first supported tag
  const tags = headerValue.split(',');
  for (const tag of tags) {
    const primary = tag.trim().split(';')[0]?.split('-')[0]?.toLowerCase();
    if (primary && localeSet.has(primary)) {
      return primary as Locale;
    }
  }
  return undefined;
}
