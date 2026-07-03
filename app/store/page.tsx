import Link from 'next/link';
import { canonicalMetadata } from '@/src/lib/seo';
import { BookOpen, ShoppingCart, Gift, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'भंडार — पुस्तके आणि अधिक | डिजिटल पंढरपूर',
  description: 'डिजिटल पंढरपूर भंडार — पुस्तके, छापील प्रती आणि अधिक.',
  ...canonicalMetadata({ canonical: '/store' }),
};

const STORE_SECTIONS = [
  {
    href: '/books',
    icon: BookOpen,
    label: 'पुस्तके',
    desc: 'अभंग, स्तोत्रे आणि भक्ती साहित्याची छापील प्रती मागवा',
    color: 'text-saffron bg-saffron/10',
  },
  {
    href: '/cart',
    icon: ShoppingCart,
    label: 'कार्ट',
    desc: 'तुमची खरेदी पहा आणि ऑर्डर पूर्ण करा',
    color: 'text-maroon bg-maroon/10',
  },
  {
    href: '/gift',
    icon: Gift,
    label: 'भेट',
    desc: 'भक्ती साहित्य भेट म्हणून पाठवा',
    color: 'text-gold bg-gold/10',
  },
];

export default function StorePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="ब्रेडक्रंब">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li><Link href="/" className="hover:text-saffron">मुख्यपृष्ठ</Link></li>
          <li aria-hidden="true">›</li>
          <li className="text-foreground">भंडार</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-12 text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-marathiHeading text-maroon dark:text-saffron font-bold">
          भंडार
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
          भक्ती साहित्याच्या छापील प्रती, पुस्तके आणि इतर साहित्य येथे उपलब्ध.
        </p>
      </header>

      {/* Store Sections */}
      <div className="grid gap-6 sm:grid-cols-3 max-w-3xl mx-auto">
        {STORE_SECTIONS.map(({ href, icon: Icon, label, desc, color }) => (
          <Link
            key={href}
            href={href}
            className="group bg-card rounded-2xl p-6 border border-saffron/10 hover:border-saffron/30 hover:shadow-lg transition-all text-center"
          >
            <div className={`w-14 h-14 mx-auto mb-4 rounded-xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <Icon className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-marathiHeading font-bold text-maroon dark:text-saffron mb-2 group-hover:text-saffron transition-colors">
              {label}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {desc}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
