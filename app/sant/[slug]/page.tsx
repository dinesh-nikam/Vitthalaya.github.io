import { notFound } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { db } from '@/src/db/client';
import { saintSchema, canonicalMetadata } from '@/src/lib/seo';
import { ConchSoundButton } from '@/components/conch-sound-button';
import { TempleViewerClient } from '@/components/temple-viewer-client';

interface Composition {
  titleMarathi: string;
  slug: string;
  type: string;
}

export default async function SaintPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch saint details from database
  const dbSaint = await db.saint.findUnique({
    where: { slug },
    include: {
      compositions: {
        select: {
          titleMarathi: true,
          slug: true,
          type: true,
        },
        take: 20,
      },
      relatedTo: {
        include: {
          related: {
            select: {
              nameMarathi: true,
              nameTranslit: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!dbSaint) {
    notFound();
  }

  // Format data to fit page UI
  const saint = {
    id: dbSaint.id,
    name_marathi: dbSaint.nameMarathi,
    name_transliteration: dbSaint.nameTranslit,
    period: dbSaint.period || 'अज्ञात कालखंड',
    region: dbSaint.region || 'अज्ञात प्रांत',
    biography: dbSaint.biography || 'या संतांचे जीवन चरित्र लवकरच जोडले जाईल.',
    related_saints: dbSaint.relatedTo.map((rel) => ({
      name: rel.related.nameMarathi,
      slug: rel.related.slug,
    })),
    compositions: dbSaint.compositions,
  };

  // Structured timeline based on saint identity
  const getTimelineForSaint = (slug: string) => {
    switch (slug) {
      case 'tukaram-maharaj':
        return [
          { year: '१६०८', event: 'देहू गावात जन्म आणि बालपण.' },
          { year: '१६३०', event: 'दुष्काळात आई-वडील व पत्नीचे निधन, सांसारिक विरक्ती.' },
          { year: '१६३२', event: 'भंडारा डोंगरावर ध्यानधारणा आणि कवित्व स्फूर्ती.' },
          { year: '१६४९', event: 'विठ्ठल नामाच्या जयघोषात सदेह वैकुंठ प्रयाण.' }
        ];
      case 'dnyaneshwar-maharaj':
        return [
          { year: '१२७५', event: 'पैठण जवळील आपेगाव येथे जन्म.' },
          { year: '१२९०', event: 'नेवासा येथे ज्ञानेश्वरी (भावार्थ दीपिका) ग्रंथाची निर्मिती.' },
          { year: '१२९२', event: 'अमृतानुभव आणि चांगदेव पासष्टी ग्रंथांची निर्मिती.' },
          { year: '१२९६', event: 'आळंदी येथे अवघ्या २१ व्या वर्षी जिवंत समाधी.' }
        ];
      default:
        return [
          { year: 'ऐतिहासिक काळ', event: 'वारकरी संप्रदायात मोलाचे योगदान.' },
          { year: 'भक्ती पर्व', event: 'मराठी अभंग रचनेचे संकीर्तन.' }
        ];
    }
  };

  const timeline = getTimelineForSaint(slug);

  return (
    <article className="min-h-screen bg-gradient-to-b from-cream via-background to-cream dark:from-[#121212] dark:via-[#1c1c1c] dark:to-[#121212] pb-24">
      {/* JSON-LD Structured Data - Person + BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            saintSchema(
              {
                nameMarathi: saint.name_marathi,
                nameTranslit: saint.name_transliteration,
                slug: slug,
                period: saint.period,
                biography: saint.biography,
                region: saint.region,
                compositionCount: saint.compositions.length,
                relatedSaints: saint.related_saints.map((rs) => ({
                  nameMarathi: rs.name,
                  slug: rs.slug,
                })),
              },
              [
                { name: 'मुख्यपृष्ठ', path: '/' },
                { name: 'संत', path: '/sant' },
                { name: saint.name_marathi, path: '/sant/' + slug },
              ],
            ),
          ),
        }}
      />

      {/* Hero Documentary Header Cover */}
      <header className="relative py-20 bg-gradient-to-b from-saffron/10 to-transparent border-b border-saffron/5 overflow-hidden">
        <div className="container mx-auto px-4 max-w-5xl text-center space-y-6 relative z-10">
          
          {/* Breadcrumbs */}
          <nav className="flex justify-center mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground" aria-label="ब्रेडक्रंब">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="hover:text-saffron">मुख्यपृष्ठ</Link>
              </li>
              <li aria-hidden="true">›</li>
              <li>
                <Link href="/sant" className="hover:text-saffron">संत मंडळ</Link>
              </li>
              <li aria-hidden="true">›</li>
              <li className="text-foreground">{saint.name_marathi}</li>
            </ol>
          </nav>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-marathiHeading text-maroon dark:text-saffron font-bold leading-tight">
            {saint.name_marathi}
          </h1>
          
          <p className="text-lg text-muted-foreground uppercase tracking-wide font-sans">
            {saint.name_transliteration}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            <span className="px-4 py-1.5 rounded-full bg-saffron/10 border border-saffron/20 text-saffron font-semibold">
              📅 {saint.period}
            </span>
            <span className="px-4 py-1.5 rounded-full bg-gold/10 border border-gold/20 text-gold-700 dark:text-gold-400 font-semibold">
              📍 कर्मभूमी: {saint.region}
            </span>
          </div>

          {/* Interactive Conch blow audio button */}
          <div className="pt-2">
            <ConchSoundButton />
          </div>

        </div>
      </header>

      {/* Two-Column split screen */}
      <div className="container mx-auto px-4 max-w-5xl mt-12 grid md:grid-cols-12 gap-12">
        
        {/* Left Side: Biography and Timeline (7/12) */}
        <section className="md:col-span-7 space-y-12" aria-labelledby="biography">
          <div className="space-y-4">
            <h2 id="biography" className="font-marathiHeading text-2xl text-maroon dark:text-saffron font-bold border-b border-saffron/10 pb-3">
              जीवन गाथा व चरित्र
            </h2>
            <div className="text-justify font-marathi text-foreground/90 leading-relaxed text-md space-y-6 first-letter:text-4xl first-letter:font-bold first-letter:text-saffron first-letter:mr-2 first-letter:float-left">
              <p className="whitespace-pre-line">
                {saint.biography}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-6">
            <h3 className="font-marathiHeading text-xl text-maroon dark:text-saffron font-bold">
              महत्वाचे जीवन टप्पे
            </h3>
            <div className="border-l-2 border-saffron/30 ml-4 space-y-8 pl-6 relative">
              {timeline.map((item, idx) => (
                <div key={idx} className="relative">
                  {/* Bullet point */}
                  <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-saffron border border-white dark:border-card" />
                  <span className="text-xs font-bold text-saffron font-sans">{item.year}</span>
                  <p className="text-sm font-marathi text-foreground/80 mt-1">{item.event}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right Side: 3D Temple and Meta Info (5/12) */}
        <aside className="md:col-span-5 space-y-8" aria-label="संबंधित देवस्थान">
          <div className="bg-card rounded-2xl border border-saffron/15 p-6 shadow-md space-y-4 text-center">
            <h3 className="font-marathiHeading text-lg text-maroon dark:text-saffron font-bold">
              आराध्य दैवत व देवस्थान
            </h3>
            <p className="text-xs text-muted-foreground font-marathi">
              माऊलींचे श्रद्धास्थान असलेले श्री विठ्ठल मंदिर पंढरपूर.
            </p>
            <div className="w-full aspect-square bg-saffron/5 rounded-xl overflow-hidden flex items-center justify-center border border-saffron/10">
              <TempleViewerClient />
            </div>
            <p className="text-[10px] text-muted-foreground">
              ३डी देवस्थान फिरवण्यासाठी वर ड्रॅग करा
            </p>
          </div>
        </aside>

      </div>

      {/* Compositions List Section */}
      <section className="container mx-auto px-4 max-w-5xl mt-16 space-y-6" aria-labelledby="works">
        <h2 id="works" className="font-marathiHeading text-2xl text-maroon dark:text-saffron font-bold border-b border-saffron/10 pb-3">
          प्रकाशित भक्ती साहित्य ({saint.compositions.length})
        </h2>
        
        {saint.compositions.length === 0 ? (
          <div className="bg-card rounded-xl p-8 border border-saffron/10 text-center">
            <p className="text-muted-foreground text-sm font-marathi">या संतांचे भक्ती साहित्य लवकरच अपलोड केले जाईल.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {saint.compositions.map((comp) => (
              <CompositionCard
                key={comp.slug}
                title={comp.titleMarathi}
                slug={comp.slug}
                type={comp.type}
              />
            ))}
          </div>
        )}
      </section>

      {/* Related Contemporary Saints */}
      {saint.related_saints.length > 0 && (
        <section className="container mx-auto px-4 max-w-5xl mt-16 space-y-6" aria-labelledby="related-saints">
          <h2 id="related-saints" className="font-marathiHeading text-2xl text-maroon dark:text-saffron font-bold border-b border-saffron/10 pb-3">
            समकालीन संत
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {saint.related_saints.map((related) => (
              <Link
                key={related.slug}
                href={`/sant/${related.slug}`}
                className="block rounded-xl bg-card p-4 text-center border border-saffron/10 hover:border-saffron/40 hover:shadow transition-all"
              >
                <p className="font-marathi font-semibold text-sm text-maroon dark:text-saffron truncate">{related.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  
  const saint = await db.saint.findUnique({
    where: { slug },
    select: { nameMarathi: true, nameTranslit: true, period: true, region: true },
  });

  if (!saint) {
    return {
      title: 'संत सापडले नाही - डिजिटल पंढरपूर',
    };
  }

  return {
    title: `${saint.nameMarathi} - जीवन चरित्र व अभंग संग्रह | डिजिटल पंढरपूर`,
    description: `${saint.nameTranslit} - ${saint.period || ''} मधील ${saint.region || ''} येथील वारकरी संत. त्यांचे संपूर्ण अभंग साहित्य वाचा.`,
    ...canonicalMetadata({ canonical: '/sant/' + slug }),
    openGraph: {
      title: `${saint.nameMarathi} - जीवन चरित्र`,
      description: `${saint.nameTranslit} वारकरी संत चरित्र व अभंग`,
      type: 'profile',
      locale: 'mr_IN',
    },
  };
}

function CompositionCard({
  title,
  slug,
  type,
}: {
  title: string;
  slug: string;
  type: string;
}) {
  return (
    <Link
      href={`/abhang/${slug}`}
      className="flex items-center justify-between rounded-xl border border-saffron/10 bg-card p-4 hover:border-saffron/30 hover:shadow-md transition-all select-none"
    >
      <div className="flex-1 min-w-0 pr-2">
        <p className="font-marathi font-semibold text-foreground truncate">{title}</p>
        <p className="text-[10px] text-muted-foreground font-sans mt-0.5 uppercase tracking-wider">{type}</p>
      </div>
      <span className="text-xs font-semibold text-saffron bg-saffron/10 border border-saffron/10 px-3 py-1 rounded-full flex-shrink-0">
        वाचा 📖
      </span>
    </Link>
  );
}
export const revalidate = 3600; // Cache page for 1 hour