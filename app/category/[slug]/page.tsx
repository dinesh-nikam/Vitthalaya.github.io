import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Category {
  id: string;
  name_marathi: string;
  name_transliteration: string;
  description: string;
  children: { name: string; slug: string; count: number }[];
  compositions: { title: string; slug: string; saint: string }[];
}

const MOCK_CATEGORY: Category = {
  id: 'vitthal',
  name_marathi: 'विठ्ठल',
  name_transliteration: 'Vitthal',
  description: 'विठ्ठल वर्षा आणि वारकरी संस्कृतीशी संबंधित सर्व साहित्य',
  children: [
    { name: 'अभंग', slug: 'abhang', count: 450 },
    { name: 'वारकरी गीते', slug: 'varkari-geete', count: 230 },
    { name: 'हरिपाठ', slug: 'haripath', count: 85 },
  ],
  compositions: [
    { title: 'तुज रूप चिती राहो', slug: 'tuze-rup-chitti-raho', saint: 'तुकाराम महाराज' },
    { title: 'विठ्ठल वारकरीची', slug: 'vitthal-varkarichi', saint: 'तुकाराम महाराज' },
    { title: 'शोक मंत्र', slug: 'shok-mant', saint: 'द्न्यादेश्वर महाराज' },
  ],
};

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // In real implementation, fetch from database with children
  // const category = await db.category.findUnique({ where: { slug }, include: { children: true } });
  const category = MOCK_CATEGORY;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="ब्रेडक्रंब">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-saffron">
              मुख्यपृष्ठ
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li className="text-foreground">{category.name_marathi}</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-marathiHeading text-maroon mb-3">
          {category.name_marathi}
        </h1>
        <p className="text-muted-foreground">
          {category.name_transliteration} • {category.compositions.length} साहित्य
        </p>
        <p className="text-foreground mt-4 leading-relaxed">
          {category.description}
        </p>
      </header>

      {/* Sub-categories if any */}
      {category.children && category.children.length > 0 && (
        <section className="mb-12" aria-labelledby="subcategories">
          <h2 id="subcategories" className="font-marathiHeading text-xl text-maroon mb-4">
            उप-श्रेणी
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {category.children.map((child) => (
              <Link
                key={child.slug}
                href={`/category/${slug}/${child.slug}`}
                className="flex items-center justify-between rounded-lg bg-card px-4 py-3 border border-saffron/10 hover:border-saffron/30 transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
              >
                <span className="font-marathi text-foreground">{child.name}</span>
                <span className="text-xs text-saffron">+{child.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Compositions Grid */}
      <section aria-labelledby="compositions">
        <h2 id="compositions" className="font-marathiHeading text-xl text-maroon mb-4">
          साहित्य
        </h2>
        <div className="space-y-3">
          {category.compositions.map((comp) => (
            <Link
              key={comp.slug}
              href={`/abhang/${comp.slug}`}
              className="flex items-center justify-between rounded-lg bg-card px-5 py-4 border border-saffron/10 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-saffron"
            >
              <div>
                <p className="font-marathi font-medium text-foreground">
                  {comp.title}
                </p>
                <p className="text-sm text-muted-foreground">{comp.saint}</p>
              </div>
              <ArrowLeft className="w-4 h-4 text-saffron rotate-180" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}