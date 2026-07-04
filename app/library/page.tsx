'use client';

import { VitthalayaShell } from '@/components/vitthalaya-shell';
import Link from 'next/link';
import Image from 'next/image';

const CATEGORY_COVERS: Record<string, { img: string; en: string; count: string; label: string; slug: string }> = {
  'abhang': { img: '/images/categories/abhang.jpg', en: 'Abhang', count: '५०,०००+', label: 'अभंग', slug: '/search?type=abhang' },
  'aarti': { img: '/images/categories/aarti.jpg', en: 'Aarti', count: '५००+', label: 'आरत्या', slug: '/search?type=aarti' },
  'stotra': { img: '/images/categories/stotra.jpg', en: 'Stotra', count: '१,०००+', label: 'स्तोत्रे', slug: '/search?type=stotra' },
  'bhajan': { img: '/images/categories/bhajan.jpg', en: 'Bhajan', count: '२,०००+', label: 'भजन', slug: '/search?type=bhajan' },
};

export default function LibraryPage() {
  const CONTENT_TYPES = [
    {
      type: 'abhang', label: 'अभंग', icon: 'BookOpen', desc: 'संत तुकाराम, ज्ञानेश्वर, एकनाथ महाराजांचे अभंग', count: 'हजारो', slug: '/search?type=abhang'
    },
    {
      type: 'aarti', label: 'आरत्या', icon: 'Sparkles', desc: 'देवतांच्या आरत्या — विठ्ठल, गणपती, देवी', count: 'अनेक', slug: '/search?type=aarti'
    },
    {
      type: 'stotra', label: 'स्तोत्रे', icon: 'BookText', desc: 'देवतांची स्तोत्रे आणि श्लोक', count: 'अनेक', slug: '/search?type=stotra'
    },
    {
      type: 'bhajan', label: 'भजन', icon: 'Music', desc: 'भक्ती भजने आणि कीर्तन', count: 'अनेक', slug: '/search?type=bhajan'
    },
  ];

  return (
    <>
      <title>साहित्य संग्रह — अभंग, आरत्या, स्तोत्रे | डिजिटल पंढरपूर</title>
      <meta name="description" content="अभंग, आरत्या, स्तोत्रे, भजन आणि संत साहित्य — प्रकारानुसार ब्राउझ करा." />
      <VitthalayaShell
      title="Sacred Literature Collection"
      description="Explore devotional literature categorized by type."
      primaryHref="/search"
      primaryLabel="Search Library"
      eyebrow="Devotional Library"
      stats={[
        { label: 'Content Types', value: '4' },
        { label: 'Total Compositions', value: '50,000+' },
      ]}
    >
      {/* Page-specific content */}
      <div className="mt-12 space-y-8">
        <h2 className="text-saffron-300 text-xl font-medium mb-4">
          साहित्य श्रेणींचे अन्वेषण करा
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(CATEGORY_COVERS).map(([type, info]) => (
            <Link
              key={type}
              href={info.slug}
              className="group relative overflow-hidden rounded-2xl aspect-[4/3] flex flex-col justify-end p-5 border border-saffron/10 transition-all duration-300 hover:border-saffron/30 hover:shadow-2xl hover:-translate-y-1"
            >
              <div className="absolute inset-0 z-0">
                <Image
                  src={info.img}
                  alt={info.label}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent group-hover:via-saffron-950/20 group-hover:from-saffron-950/80 transition-colors duration-300" />
              </div>

              <div className="relative z-10 space-y-1 text-left">
                <span className="text-saffron text-[10px] font-bold uppercase tracking-wider">{info.en}</span>
                <h3 className="text-white text-xl font-bold font-marathi">{info.label}</h3>
                <p className="text-white/60 text-xs font-mono">{info.count} रचना</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-card rounded-2xl p-8 border border-saffron/10 text-left">
          <div className="md:col-span-7 space-y-4">
            <h3 className="text-xl font-marathiHeading font-bold text-saffron">वारकरी ग्रंथालय</h3>
            <p className="text-saffron-100 text-base sm:text-lg leading-relaxed font-marathi">
              ज्ञानेश्वरांच्या ज्ञानेश्वरीपासून, तुकारामांच्या गाथेपर्यंत आणि शेकडो वर्षांच्या हस्तलिखितांपर्यंतचा हा अमूल्य सांस्कृतिक आणि आध्यात्मिक वारसा आहे.
              प्रत्येक रचना काळजीपूर्वक जतन केली गेली आहे जेणेकरून ज्ञान अखंड वाहत राहील.
            </p>
          </div>
          <div className="md:col-span-5 relative aspect-[4/3] rounded-xl overflow-hidden border border-saffron/20 shadow-md">
            <Image
              src="/images/realistic/ancient-manuscript.jpg"
              alt="Ancient Manuscript"
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        </div>
      </div>
    </VitthalayaShell>
    </>
  );
}