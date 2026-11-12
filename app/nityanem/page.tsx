import Link from 'next/link';
import { getNityanemData } from '@/src/services/nityanem-service';
import { NityanemClient } from '@/components/nityanem/nityanem-client';
import { canonicalMetadata } from '@/src/lib/seo';
import { ChevronRight, Clock, Sparkles } from 'lucide-react';
import '@/app/homepage.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'वारकरी नित्यनेम, भजन साधना व टाळ-मृदंग ठेका | डिजिटल पंढरपूर',
  description:
    'दैनिक ५ प्रहर नित्यनेम (काकड आरती, हरिपाठ, गावळणी, धुपारती, शेजारती), वारी मुक्काम भजन सेवा आणि संवादी टाळ-मृदंग ताल साथी.',
  ...canonicalMetadata({ canonical: '/nityanem' }),
};

export default async function NityanemPage() {
  const initialData = await getNityanemData();

  return (
    <div className="vitthalaya-shell min-h-screen pb-20">
      {/* Sanctuary Hero Header */}
      <section
        className="relative pt-16 pb-16 border-b border-[var(--dp-rule)] bg-[var(--dp-ground-well)] overflow-hidden"
        aria-labelledby="nityanem-title"
      >
        <div className="vitthalaya-container max-w-4xl text-center relative z-10">
          {/* Breadcrumb */}
          <nav
            className="flex justify-center mb-6 text-xs font-marathi text-[var(--dp-muted)]"
            aria-label="ब्रेडक्रंब"
          >
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="hover:text-[var(--dp-gold)] transition-colors">
                  मुख्यपृष्ठ
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight size={12} />
              </li>
              <li className="text-[var(--dp-ink)]">नित्यनेम व भजन साधना</li>
            </ol>
          </nav>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--dp-gold)]/10 text-[var(--dp-gold)] border border-[var(--dp-gold)]/20 text-xs font-marathi mb-3">
            <Clock size={13} aria-hidden="true" />
            <span>अखंड वारकरी नित्य सेवा</span>
          </div>

          <h1
            id="nityanem-title"
            className="vitthalaya-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4"
          >
            वारकरी नित्यनेम व भजन साधना
          </h1>

          <p className="vitthalaya-prose text-sm sm:text-base text-[var(--dp-ink-dim)] max-w-2xl mx-auto leading-relaxed mb-6">
            पहाटेच्या काकड आरतीपासून ते रात्रीच्या शेजारतीपर्यंत — संतांनी घालून दिलेल्या पारंपारिक ५ प्रहरांनुसार नित्य पठण, वारी मुक्काम सेवा आणि संवादी टाळ-मृदंग ठेका.
          </p>

          <div className="inline-flex items-center gap-2 text-xs font-marathi text-[var(--dp-muted)]">
            <Sparkles size={13} className="text-[var(--dp-gold)]" aria-hidden="true" />
            <span>
              सध्याचा प्रहर:{' '}
              <strong className="text-[var(--dp-gold)]">
                {initialData.activeProhar.titleMarathi}
              </strong>
            </span>
          </div>
        </div>
      </section>

      {/* Main Body Interactive Client Component */}
      <main className="vitthalaya-container max-w-5xl pt-10 pb-16">
        <NityanemClient initialData={initialData} />
      </main>
    </div>
  );
}
