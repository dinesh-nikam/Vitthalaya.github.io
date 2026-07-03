'use client';

import { VitthalayaShell } from '@/components/vitthalaya-shell';
import Link from 'next/link';

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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {CONTENT_TYPES.map(({ type, label, icon, desc, count, slug }) => (
            <Link key={type} href={slug} className="group bg-saffron-50/30 rounded-xl p-6 transition-all duration-300 hover:bg-saffron-100 flex flex-col items-start gap-3">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-saffron/10 flex items-center justify-center group-hover:bg-saffron/20 transition-colors">
                {icon && <svg className="w-7 h-7 text-saffron" dangerouslySetInnerHTML={{ __html: icon }} />}
              </div>
              <span className="text-saffron-300 text-sm tracking-wide mb-1 group-hover:text-saffron-500">सूचना</span>
              <h3 className="text-saffron-500 text-xl font-medium group-hover:text-saffron-700 transition-colors">{label}</h3>
              <span className="mt-2 text-saffron-400 text-lg font-medium flex items-center gap-1">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} stroke="currentColor" d="M21 21l-4.35-4.35m2.15-5.15a7 7 0 1 1 9.9 0l-7.65 7.65m-4.35-4.35H9" />
                </svg>
                {count} पढा
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-12">
          <p className="text-saffron-100 text-lg line-clamp-3">
            संग्रहातील सर्वात जाणिवेरी लेख आणि श्रावकांच्या अनामिकांच्या शब्दांचा अन्वेषण करा.
          </p>
        </div>
      </div>
    </VitthalayaShell>
    </>
  );
}