import type { Metadata } from 'next';
import { Inter, Noto_Sans_Devanagari, Tiro_Devanagari_Marathi } from 'next/font/google';
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
  openGraph: {
    title: 'डिजिटल पंढरपूर',
    description: 'मराठी भक्ती साहित्याचा वाढता डिजिटल संग्रह',
    locale: 'mr_IN',
    type: 'website',
  },
};

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
      <body className="min-h-dvh bg-background antialiased">
        <div className="relative flex min-h-dvh flex-col">
          <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
              <a href="/" className="font-marathiHeading text-xl text-saffron">
                डिजिटल पंढरपूर
              </a>
              <nav className="flex items-center gap-4" aria-label="मुख्य नेव्हिगेशन">
                <a href="/sant" className="text-sm font-medium hover:text-saffron transition-colors">
                  संत
                </a>
                <a href="/category" className="text-sm font-medium hover:text-saffron transition-colors">
                  श्रेणी
                </a>
                <a href="/festival" className="text-sm font-medium hover:text-saffron transition-colors">
                  सण
                </a>
              </nav>
            </div>
          </header>
          <main className="flex-1" id="main-content">
            {children}
          </main>
          <footer className="border-t py-8 bg-saffron/5">
            <div className="container mx-auto px-4 text-center">
              <p className="text-sm text-muted-foreground">
                © २०२६ डिजिटल पंढरपूर. मराठी भक्ती साहित्याचे डिजिटल संग्रह.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}