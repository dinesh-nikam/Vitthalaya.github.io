import { canonicalMetadata } from '@/src/lib/seo';
import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'सहयोग — Donate | डिजिटल पंढरपूर',
  description: 'डिजिटल पंढरपूरला सहयोग करा. तुमचे दान मराठी भक्ती साहित्याच्या संरक्षणासाठी वापरले जाईल.',
  ...canonicalMetadata({ canonical: '/donate' }),
};

const WAYS_TO_HELP = [
  {
    icon: '📝',
    title: 'रचना सुधारा',
    titleEn: 'Fix Typos',
    desc: 'ग्रंथांमधील चुका, स्पलिंग आणि फॉर्मेटिंग सुधारा. प्रत्येक छोटी सुधारणा मोल आहे.',
    cta: 'सुधारणा सूचना द्या',
    href: '/community/corrections',
  },
  {
    icon: '📚',
    title: 'साहित्य जोडा',
    titleEn: 'Add Content',
    desc: 'नवीन रचना, संतांचे चरित्र, ऐतिहासिक माहिती जोडा.',
    cta: 'नवीन रचना सबमिट करा',
    href: '/community/submit',
  },
  {
    icon: '🎙️',
    title: 'ऑडियो दान करा',
    titleEn: 'Donate Audio',
    desc: 'अभंग, भजन आणि आरत्यांचे ऑडियो रेकॉर्डिंग दान करा.',
    cta: 'ऑडियो सबमिट करा',
    href: '/community/submit',
  },
  {
    icon: '💬',
    title: 'प्रतिक्रिया द्या',
    titleEn: 'Give Feedback',
    desc: 'तुमचे अनुभव, बुझलेल्या समस्या आणि सूचना आम्हाला पाठवा.',
    cta: 'प्रतिक्रिया द्या',
    href: '/community/feedback',
  },
];

export default function DonatePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="ब्रेडक्रंब">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li><Link href="/" className="hover:text-saffron">मुख्यपृष्ठ</Link></li>
          <li aria-hidden="true">›</li>
          <li className="text-foreground">सहयोग</li>
        </ol>
      </nav>

      {/* Hero */}
      <header className="mb-12 text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-marathiHeading text-maroon dark:text-saffron font-bold">
          आमच्या कार्यात सहयोग करा 🙏
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
          मराठी भक्ती साहित्याचे डिजिटल संरक्षण — तुमचा सहयोग अमूल्य आहे.
        </p>
      </header>

      {/* Note */}
      <section className="mb-10 bg-card rounded-2xl p-6 border border-saffron/10 text-center">
        <p className="text-sm text-foreground/70 leading-relaxed max-w-lg mx-auto">
          डिजिटल पंढरपूर एक <strong>गैर-नफा</strong> सांस्कृतिक उपक्रम आहे.
          आम्ही या टप्प्यावर <strong>थेट दान स्वीकारत नाही</strong>.
          खालील मार्गांनी तुम्ही तुमचा योगदान देऊ शकता.
        </p>
      </section>

      {/* Ways to Help */}
      <section className="mb-12">
        <h2 className="text-2xl font-marathiHeading text-maroon dark:text-saffron font-bold mb-6 text-center">
          सहयोगाचे मार्ग
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {WAYS_TO_HELP.map((w) => (
            <div key={w.title} className="bg-card rounded-xl p-6 border border-saffron/10 hover:border-saffron/30 transition-colors flex flex-col">
              <div className="text-3xl mb-3">{w.icon}</div>
              <h3 className="text-lg font-marathiHeading font-bold text-foreground mb-1">{w.title}</h3>
              <p className="text-xs text-muted-foreground mb-2">{w.titleEn}</p>
              <p className="text-sm text-foreground/70 leading-relaxed mb-4 flex-1">{w.desc}</p>
              <Link
                href={w.href}
                className="inline-block text-center text-sm font-medium text-saffron hover:text-saffron/80 border border-saffron/30 rounded-full py-2 px-4 transition-colors"
              >
                {w.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Transparency */}
      <section className="mb-12 bg-card rounded-2xl p-8 border border-saffron/10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center text-left">
          <div className="md:col-span-7 space-y-4">
            <h2 className="text-2xl font-marathiHeading text-maroon dark:text-saffron font-bold">
              पारदर्शकता
            </h2>
            <div className="space-y-4 text-foreground/80 leading-relaxed font-marathi text-sm">
              <p>
                डिजिटल पंढरपूरला समर्थन देण्याचे सर्वोत्तम मार्ग म्हणजे <strong>तुमचा वेळ आणि ज्ञान</strong> दान करणे.
                प्रत्येक सुधारणा, प्रत्येक नवीन रचना, प्रत्येक ऑडियो रेकॉर्डिंग — यामुळे हा संग्रह अधिक समृद्ध होतो.
              </p>
              <p>
                तुम्ही GitHub वर सहयोग करू शकता, सुधारणा सूचना पाठवू शकता, किंवा तुमच्या समुदायात प्रचार करू शकता.
              </p>
              <p>
                आम्ही सर्व योगदानकर्त्यांना <Link href="/community" className="text-saffron hover:underline">समुदाय पृष्ठावर</Link> मान्यता देतो.
              </p>
            </div>
          </div>
          <div className="md:col-span-5 relative aspect-[4/3] rounded-xl overflow-hidden border border-saffron/20 shadow-lg">
            <Image
              src="/images/realistic/saint-devotional.jpg"
              alt="Community Devotion"
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="text-center py-8 space-y-4">
        <p className="text-lg font-marathiHeading text-saffron font-bold">
          "विठ्ठलाच्या चरणी अर्पण" 🙏
        </p>
        <Link
          href="/explore"
          className="inline-block bg-saffron text-white font-medium py-3 px-8 rounded-full hover:bg-saffron/90 transition-colors"
        >
          आत्ताच अन्वेषण करा →
        </Link>
      </section>
    </div>
  );
}
