import { db } from '@/src/db/client';
import { SaintsList } from '@/components/saints-list';
import { canonicalMetadata } from '@/src/lib/seo';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import '@/app/homepage.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'संत मंडळ : वारकरी संत परंपरा | डिजिटल पंढरपूर',
  description: 'वारकरी संतांचे जीवन, काळ, प्रांत आणि त्यांचे संपूर्ण भक्ती साहित्य एकाच ठिकाणी.',
  ...canonicalMetadata({ canonical: '/saints' }),
};

export default async function SaintsIndexPage() {
  const saints = await db.saint.findMany({
    orderBy: { nameMarathi: 'asc' },
    select: {
      id: true,
      nameMarathi: true,
      nameTranslit: true,
      slug: true,
      period: true,
      biography: true,
      region: true,
      imageUrl: true,
    },
  });

  const regions = new Set(saints.map((saint) => saint.region).filter(Boolean));

  return (
    <div className="vitthalaya-shell min-h-screen py-10">
      <div className="vitthalaya-container max-w-5xl">
        {/* Breadcrumb */}
        <nav className="mb-6" aria-label="ब्रेडक्रंब">
          <ol className="flex items-center gap-2 text-xs font-marathi text-[var(--dp-muted)]">
            <li>
              <Link href="/" className="hover:text-[var(--dp-gold)] transition-colors">
                मुख्यपृष्ठ
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li className="text-[var(--dp-ink)]">संत मंडळ</li>
          </ol>
        </nav>

        {/* Page Header */}
        <header className="mb-10 text-center max-w-3xl mx-auto">
          <p className="text-xs text-[var(--dp-gold)] font-marathi mb-2">
            वारकरी भक्ती परंपरा
          </p>
          <h1 className="vitthalaya-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            वारकरी संत मंडळ
          </h1>
          <p className="vitthalaya-prose text-sm sm:text-base text-[var(--dp-ink-dim)] mb-6">
            संतांचे विचार, त्यांचा कालखंड, कर्मभूमी आणि त्यांच्या पवित्र अभंगरचनांचा अधिकृत संग्रह.
          </p>

          <div className="flex flex-wrap justify-center gap-6 text-xs font-marathi text-[var(--dp-muted)] py-3 px-6 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] max-w-md mx-auto">
            <span>नोंदवलेले संत: <strong className="text-[var(--dp-ink)]">{saints.length}</strong></span>
            <span>प्रांत: <strong className="text-[var(--dp-ink)]">{regions.size}</strong></span>
            <span>परंपरा: <strong className="text-[var(--dp-ink)]">पंढरपूर वारी</strong></span>
          </div>
        </header>

        {/* Saints Interactive List */}
        <SaintsList initialSaints={saints} />
      </div>
    </div>
  );
}
