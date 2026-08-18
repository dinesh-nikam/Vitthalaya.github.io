import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { websiteSchema } from '@/src/lib/seo';
import { ConsentBanner } from '@/components/consent-banner';
import { FloatingPlayer } from '@/components/floating-player';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { SearchOverlay } from '@/components/search-overlay';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common');
  return {
    title: t('siteName') + ' - ' + t('siteTagline'),
    description: t('siteDescription'),
    keywords: 'अभंग, भजन, हरिपाठ, आरती, स्तोत्र, विठ्ठल, वारकरी, तुकाराम, द्न्यादेश्वर',
    robots: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-video-preview': -1,
    },
    openGraph: {
      title: t('siteName'),
      description: t('siteTagline'),
      locale: 'mr_IN',
      type: 'website',
    },
  };
}

import { Providers } from '@/components/providers';
import { HeaderNav } from '@/components/header-nav';
import { SiteFooter } from '@/components/site-footer';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className="font-vars"
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#FF7A1A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="डिजिटल पंढरपूर" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var shouldBeDark = stored ? stored === 'dark' : prefersDark;
                  if (shouldBeDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-dvh bg-background antialiased">
        {/* Site-wide JSON-LD Structured Data — WebSite + SearchAction */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema(locale)),
          }}
        />
        <Providers>
          <NextIntlClientProvider messages={messages}>
            <div className="relative flex min-h-dvh flex-col">
              {/* Skip Navigation Link - WCAG 2.4.1 */}
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-saffron focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-white"
              >
                मुख्य सामग्रीवर जा
              </a>
              <header role="banner" className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                  <a href="/" className="font-marathiHeading text-xl text-saffron">
                    डिजिटल पंढरपूर
                  </a>
                  <HeaderNav />
                </div>
              </header>
              <main role="main" aria-label="मुख्य सामग्री" className="flex-1 pb-16 lg:pb-0" id="main-content">
                {children}
              </main>
              <SiteFooter />
            </div>
          </NextIntlClientProvider>
        </Providers>
        <ConsentBanner />
        <FloatingPlayer />
        <BottomTabBar />
        <SearchOverlay />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').then((reg) => {
                    console.log('SW registered:', reg.scope);
                  }).catch((err) => {
                    console.log('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
