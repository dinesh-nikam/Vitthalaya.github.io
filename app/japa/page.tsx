import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Sparkles, HeartHandshake, ShieldCheck, BookOpen } from 'lucide-react';
import { JapaMala } from '@/components/japa-mala';
import { TanpuraDrone } from '@/components/tanpura-drone';
import { canonicalMetadata } from '@/src/lib/seo';
import '@/app/homepage.css';

export const metadata: Metadata = {
  title: 'नामजप साधना: १०८ मणी तुळशी जपमाळ | डिजिटल पंढरपूर',
  description: 'पारंपरिक वारकरी १०८ मणी तुळशी जपमाळ. राम कृष्ण हरी, विठ्ठल नामाचा अखंड जप, ऑडिओ नाद व संतांचे मार्गदर्शन.',
  ...canonicalMetadata({ canonical: '/japa' }),
};

export const dynamic = 'force-dynamic';

export default function JapaPage() {
  return (
    <div className="vitthalaya-shell min-h-screen py-10">
      <div className="vitthalaya-container max-w-4xl">
        {/* Breadcrumb */}
        <nav className="mb-6" aria-label="ब्रेडक्रंब">
          <ol className="flex items-center gap-2 text-xs font-marathi text-[var(--dp-muted)]">
            <li>
              <Link href="/" className="hover:text-[var(--dp-gold)] transition-colors">
                मुख्यपृष्ठ
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li className="text-[var(--dp-ink)]">नामजप साधना</li>
          </ol>
        </nav>

        {/* Page Header */}
        <header className="mb-10 text-center max-w-2xl mx-auto">
          <p className="text-xs text-[var(--dp-gold)] font-marathi mb-2">
            अखंड नामस्मरण
          </p>
          <h1 className="vitthalaya-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            वारकरी तुळशी जपमाळ
          </h1>
          <p className="vitthalaya-prose text-sm sm:text-base text-[var(--dp-ink-dim)] leading-relaxed mb-6">
            १०८ मण्यांची पावन तुळशी माळ. काष्ठ मण्यांचा स्पर्श, नाद आणि चित्ताची एकाग्रता साधून पांडुरंगाच्या चरणी नामस्मरण अर्पण करा.
          </p>

          {/* Ambient Tanpura Drone toggle */}
          <div className="flex justify-center">
            <TanpuraDrone />
          </div>
        </header>

        {/* ── Core Sadhana Component ── */}
        <section className="mb-14" aria-label="१०८ तुळशी जपमाळ इंटरफेस">
          <JapaMala />
        </section>

        {/* ── Theological Significance of Tulsi Mala ── */}
        <section className="vitthalaya-card rounded p-6 sm:p-8 space-y-6" aria-labelledby="theology-heading">
          <div className="flex items-center gap-2 text-[var(--dp-gold)]">
            <Sparkles size={16} aria-hidden="true" />
            <h2 id="theology-heading" className="vitthalaya-display text-xl font-bold text-[var(--dp-ink)]">
              तुळशी माळेचे वारकरी परंपरेतील महत्त्व
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-marathi text-xs sm:text-sm text-[var(--dp-ink-dim)] leading-relaxed">
            <div className="p-4 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] space-y-2">
              <h3 className="font-bold text-[var(--dp-ink)] text-sm flex items-center gap-1.5">
                <HeartHandshake size={14} className="text-[var(--dp-gold)]" aria-hidden="true" />
                गळ्यात माळ: वारकरी दीक्षा
              </h3>
              <p>
                गळ्यात तुळशीची माळ घालणे म्हणजे सात्विक, सदाचारी आणि अहिंसक जीवनाचा स्वीकार. वारकरी पंथात माळकरी होणे हा आत्मोद्धाराचा पहिला टप्पा मानला जातो.
              </p>
            </div>

            <div className="p-4 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] space-y-2">
              <h3 className="font-bold text-[var(--dp-ink)] text-sm flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[var(--dp-gold)]" aria-hidden="true" />
                १०८ मण्यांचे रहस्य
              </h3>
              <p>
                १०८ मणी हे १०८ उपनिषदे, खगोलीय नक्षत्र चरणे आणि चित्ताच्या १०८ भावनांचे प्रतीक आहेत. सुमेरू मणी ओलांडला जात नाही, तर तेथून परतायचे असते.
              </p>
            </div>

            <div className="p-4 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] space-y-2">
              <h3 className="font-bold text-[var(--dp-ink)] text-sm flex items-center gap-1.5">
                <BookOpen size={14} className="text-[var(--dp-gold)]" aria-hidden="true" />
                तुकाराम महाराज मार्गदर्शन
              </h3>
              <p className="italic">
                « नामापरते तत्त्व नाही रे अन्यथा । वाचे पंढरीनाथा म्हणा तुम्ही ॥ » नामामध्येच मोक्ष आणि चित्ताची परम शांती सामावलेली आहे.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
