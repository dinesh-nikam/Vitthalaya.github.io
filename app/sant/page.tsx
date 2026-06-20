import { db } from '@/src/db/client';
import { SaintsList } from '@/components/saints-list';
import Link from 'next/link';
import { canonicalMetadata } from '@/src/lib/seo';

export const metadata = {
  title: 'संत मंडळ - वारकरी संप्रदायाचे थोर संत | डिजिटल पंढरपूर',
  description: 'संत ज्ञानेश्वर महाराज, संत तुकाराम महाराज, संत एकनाथ, संत नामदेव आणि इतर थोर वारकरी संतांची चरित्रे आणि अभंग संग्रह एकाच ठिकाणी.',
  ...canonicalMetadata({ canonical: '/sant' }),
};

export default async function SaintsIndexPage() {
  // Fetch saints from database
  const saints = await db.saint.findMany({
    orderBy: {
      nameMarathi: 'asc',
    },
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="ब्रेडक्रंब">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-saffron">
              मुख्यपृष्ठ
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li className="text-foreground">संत</li>
        </ol>
      </nav>

      {/* Page Header */}
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl sm:text-4xl font-marathiHeading text-maroon dark:text-saffron font-bold">
          संत मंडळ 🚩
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-3xl">
          वारकरी चळवळीला दिशा देणारे थोर संत, त्यांचे जीवन चरित्र आणि त्यांचे संपूर्ण भक्ती साहित्य (अभंग, गाथा) येथे अभ्यासा.
        </p>
      </header>

      {/* Saints Interactive Grid Component */}
      <SaintsList initialSaints={saints} />
    </div>
  );
}
