/**
 * next-intl message loader — imports the JSON message files for a locale.
 * Kept in a separate module so `getRequestConfig` can include messages
 * without relying on filesystem access at request time (bundle-friendly).
 */
import type { Locale } from './locales';

// next-intl expects messages as a plain object per locale.
import mr from '../../messages/mr.json';
import en from '../../messages/en.json';
import hi from '../../messages/hi.json';

const MESSAGE_TABLES: Record<Locale, Record<string, unknown>> = {
  mr: mr as unknown as Record<string, unknown>,
  en: en as unknown as Record<string, unknown>,
  hi: hi as unknown as Record<string, unknown>,
};

export function createMessages(locale: Locale): Record<string, unknown> {
  return MESSAGE_TABLES[locale];
}
