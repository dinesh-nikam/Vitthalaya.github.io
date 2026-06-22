import type { Metadata } from 'next';
import { Inter, Noto_Sans_Devanagari, Tiro_Devanagari_Marathi } from 'next/font/google';
import { websiteSchema } from '@/src/lib/seo';
import { ConsentBanner } from '@/components/consent-banner';
import { FloatingPlayer } from '@/components/floating-player';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-devanagari',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const tiroDevanagari = Tiro_Devanagari_Marathi({
  subsets: ['devanagari'],
  variable: '--font-devanagari-heading',
  display: 'swap',
  weight: '400',
  style: 'normal',
});

export const metadata: Metadata = {
  title: 'डिजिटल पंढरपूर - मराठी भक्ती साहित्याचा वाढता डिजिटल संग्रह',
  description: 'लाखो अभंग, भजन, गौळणी, आरत्या, स्तोत्रे आणि संत साहित्य एका ठिकाणी',
  keywords: 'अभंग, भजन, हरिपाठ, आरती, स्तोत्र, विठ्ठल, वारकरी, तुकाराम, द्न्यादेश्वर',
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-video-preview': -1,
  },
  openGraph: {
    title: 'डिजिटल पंढरपूर',
    description: 'मराठी भक्ती साहित्याचा वाढता डिजिटल संग्रह',
    locale: 'mr_IN',
    type: 'website',
  },
};

import { Providers } from '@/components/providers';
import { HeaderNav } from '@/components/header-nav';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="mr"
      className={`${inter.variable} ${notoSansDevanagari.variable} ${tiroDevanagari.variable}`}
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
      </head>
      <body className="min-h-dvh bg-background antialiased">
        {/* Site-wide JSON-LD Structured Data — WebSite + SearchAction */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema()),
          }}
        />
        <div className="relative flex min-h-dvh flex-col">
          <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
              <a href="/" className="font-marathiHeading text-xl text-saffron">
                डिजिटल पंढरपूर
              </a>
              <HeaderNav />
            </div>
          </header>
          <main className="flex-1" id="main-content">
            <Providers>{children}</Providers>
          </main>
          <footer className="border-t py-8 bg-saffron/5">
            <div className="container mx-auto px-4 text-center">
              <p className="text-sm text-muted-foreground">
                © २०२६ डिजिटल पंढरपूर. मराठी भक्ती साहित्याचे डिजिटल संग्रह.
              </p>
            </div>
          </footer>
        </div>
        <ConsentBanner />
        <FloatingPlayer />
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