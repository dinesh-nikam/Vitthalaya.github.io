import { notFound } from 'next/navigation';
import Link from 'next/link';

interface Saint {
  id: string;
  name_marathi: string;
  name_transliteration: string;
  period: string;
  region: string;
  biography: string;
  related_saints: { name: string; slug: string }[];
}

const MOCK_SAINT: Saint = {
  id: '1',
  name_marathi: 'तुकाराम महाराज',
  name_transliteration: 'Tukaram Maharaj',
  period: '१७थे शतक',
  region: 'देहू',
  biography: `तुकाराम महाराज हे वारकरी संत या संघाटीचे मुख्य संत होंडले. तुकाराम महाराज यांचे अभंग विठ्ठल वर्षा आणि भक्ती भावनेत रचलेले आहेत. त्यांच्या अभंगात प्रेम आणि भक्ती यांचे सुकून प्रतिबिंबित होते.

तुकाराम महाराज हे लिहित वारकारी या परंपरेत आदरणीय काम केले आहे. त्यांच्या अभंगांत विठ्ठलाच्या भक्तीचे अद्वितीय उपदेश आहेत. त्यांच्या काव्यांमध्ये साधारण माणूसांच्या भावना व स्पष्ट विचारांचे संगम आहे.`,
  related_saints: [
    { name: 'द्न्यादेश्वर महाराज', slug: 'dnyaneshwar-maharaj' },
    { name: 'नामदेव महाराज', slug: 'namdev-maharaj' },
    { name: 'एकनाथ महाराज', slug: 'eknath-maharaj' },
  ],
};

export default async function SaintPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // In real implementation, fetch from database
  // const saint = await db.saint.findUnique({ where: { slug } });
  // if (!saint) notFound();

  const saint = MOCK_SAINT;

  return (
    <article className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <header className="text-center mb-12">
        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-saffron/20 flex items-center justify-center">
          <span className="text-5xl" aria-hidden="true">
            🙏
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-marathiHeading text-maroon mb-3">
          {saint.name_marathi}
        </h1>
        <p className="text-lg text-muted-foreground mb-4">
          {saint.name_transliteration}
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>{saint.period}</span>
          <span>•</span>
          <span>{saint.region}</span>
        </div>
      </header>

      {/* Biography */}
      <section className="mb-12" aria-labelledby="biography">
        <h2 id="biography" className="font-marathiHeading text-2xl text-maroon mb-6">
          संतांची कथा
        </h2>
        <div className="bg-card rounded-lg p-6 sm:p-8 border border-saffron/10">
          <p className="font-marathi text-foreground leading-relaxed whitespace-pre-line">
            {saint.biography}
          </p>
        </div>
      </section>

      {/* Timeline - Placeholder for now */}
      <section className="mb-12" aria-labelledby="timeline">
        <h2 id="timeline" className="font-marathiHeading text-2xl text-maroon mb-6">
          कालखंड
        </h2>
        <div className="bg-card rounded-lg p-6 border border-saffron/10">
          <p className="text-muted-foreground">तारीखवार तयार होत आहे...</p>
        </div>
      </section>

      {/* Works List */}
      <section className="mb-12" aria-labelledby="works">
        <h2 id="works" className="font-marathiHeading text-2xl text-maroon mb-6">
          कृती
        </h2>
        <div className="grid gap-4">
          <CompositionCard
            title="तुज रूप चिती राहो"
            slug="tuze-rup-chitti-raho"
            type="अभंग"
            popularity={95}
          />
          <CompositionCard
            title="विठ्ठल वारकरीची"
            slug="vitthal-varkarichi"
            type="अभंग"
            popularity={87}
          />
          <CompositionCard
            title="राम नाम सदा सारखो"
            slug="ram-naam-sada"
            type="अभंग"
            popularity={82}
          />
        </div>
      </section>

      {/* Related Saints */}
      <section aria-labelledby="related-saints">
        <h2 id="related-saints" className="font-marathiHeading text-2xl text-maroon mb-6">
          संबंधित संत
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {saint.related_saints.map((related) => (
            <Link
              key={related.slug}
              href={`/sant/${related.slug}`}
              className="block rounded-lg bg-card p-4 text-center border border-saffron/10 hover:border-saffron/30 transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
            >
              <p className="font-marathi text-sm text-maroon">{related.name}</p>
            </Link>
          ))}
        </div>
      </section>
    </article>
  );
}

function CompositionCard({
  title,
  slug,
  type,
  popularity,
}: {
  title: string;
  slug: string;
  type: string;
  popularity: number;
}) {
  return (
    <Link
      href={`/abhang/${slug}`}
      className="flex items-center justify-between rounded-lg border border-saffron/10 bg-card p-4 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-saffron"
    >
      <div className="flex-1">
        <p className="font-marathi font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{type}</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-saffron">लोकप्रियता</p>
        <p className="font-semibold text-maroon">{popularity}%</p>
      </div>
    </Link>
  );
}