'use client';

/**
 * LanguageSwitcher — dropdown to switch between मराठी / English / हिंदी.
 * Persists choice in the NEXT_LOCALE cookie (read server-side by next-intl),
 * then refreshes the current route so server components re-render in the new locale.
 *
 * Accessible: button with aria-haspopup/expanded, Escape closes, focus returns to trigger.
 */
import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Languages, Check, ChevronDown } from 'lucide-react';
import { LOCALES } from '@/src/i18n/locales';

export function LanguageSwitcher() {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close on Escape + restore focus
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const changeLocale = (nextLocale: (typeof LOCALES)[number]) => {
    if (nextLocale === locale) {
      setOpen(false);
      return;
    }
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    setOpen(false);
    router.refresh();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 p-2 rounded-lg transition-colors text-muted-foreground hover:text-saffron hover:bg-saffron/8"
        aria-label={t('languageSwitcherAria')}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? 'language-menu' : undefined}
        title={t('language')}
      >
        <Languages className="w-4 h-4" />
        <span className="hidden md:inline text-xs font-medium uppercase tracking-wide">
          {t(`languageNames.${locale}`)}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          id="language-menu"
          role="menu"
          aria-label={t('language')}
          className="absolute right-0 top-full mt-2 w-44 bg-card border border-foreground/10 rounded-lg shadow-2xl z-50 overflow-hidden py-1"
        >
          {LOCALES.map((l) => {
            const selected = l === locale;
            return (
              <button
                key={l}
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => changeLocale(l)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                  selected
                    ? 'text-saffron font-semibold bg-saffron/5'
                    : 'text-foreground/80 hover:text-saffron hover:bg-saffron/5'
                }`}
              >
                {t(`languageNames.${l}`)}
                {selected && <Check className="w-4 h-4" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
