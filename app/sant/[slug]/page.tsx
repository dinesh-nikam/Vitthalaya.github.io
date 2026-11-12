import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/src/db/client';
import { saintSchema, canonicalMetadata } from '@/src/lib/seo';
import { ConchSoundButton } from '@/components/conch-sound-button';
import { TempleViewerClient } from '@/components/temple-viewer-client';
import { ArrowLeft, ArrowRight, Calendar, MapPin, ChevronRight, BookOpen } from 'lucide-react';
import Image from 'next/image';
import { getSaintPortrait } from '@/src/lib/saint-images';
import { getSaintSeal } from '@/src/lib/saint-metadata';
import '@/app/homepage.css';

function toDevanagariDigits(num: number): string {
  const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  const formatted = num.toString().padStart(2, '0');
  return formatted
    .split('')
    .map((digit) => {
      const idx = parseInt(digit, 10);
      return isNaN(idx) ? digit : devanagariDigits[idx];
    })
    .join('');
}

export default async function SaintPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const rawSlug = await params;
  const slug = decodeURIComponent(rawSlug.slug);
  const sParams = await searchParams;
  let page = parseInt(sParams.page || '1', 10);
  if (isNaN(page) || page < 1) {
    page = 1;
  }
  const pageSize = 50;
  const skip = (page - 1) * pageSize;

  // Fetch saint details from database
  const dbSaint = await db.saint.findUnique({
    where: { slug },
    include: {
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

  // Get total count of compositions for saint
  const totalCompositions = await db.composition.count({
    where: { saintId: dbSaint.id },
  });

  const totalPages = Math.ceil(totalCompositions / pageSize);

  // Query paginated compositions
  const dbCompositions = await db.composition.findMany({
    where: { saintId: dbSaint.id },
    select: {
      titleMarathi: true,
      slug: true,
      type: true,
    },
    take: pageSize,
    skip: skip,
    orderBy: {
      id: 'asc',
    },
  });

  const saint = {
    id: dbSaint.id,
    name_marathi: dbSaint.nameMarathi,
    name_transliteration: dbSaint.nameTranslit,
    period: dbSaint.period || 'भक्ती कालखंड',
    region: dbSaint.region || 'महाराष्ट्र',
    biography: dbSaint.biography || `${dbSaint.nameMarathi} हे वारकरी संप्रदायातील थोर संत असून त्यांनी आपल्या अमृततुल्य अभंग आणि भक्ती विचारांमार्फत अध्यात्म व संस्कृती समृद्ध केली.`,
    related_saints: dbSaint.relatedTo.map((rel) => ({
      name: rel.related.nameMarathi,
      slug: rel.related.slug,
    })),
    compositions: dbCompositions,
    imageUrl: dbSaint.imageUrl,
  };

  const getTimelineForSaint = (saintSlug: string) => {
    switch (saintSlug) {
      case 'tukaram-maharaj':
        return [
          { year: '१६०८', event: 'देहू गावात जन्म आणि बालपण.' },
          { year: '१६३०', event: 'दुष्काळात आई-वडील व पत्नीचे निधन, सांसारिक विरक्ती.' },
          { year: '१६३२', event: 'भंडारा डोंगरावर ध्यानधारणा आणि कवित्व स्फूर्ती.' },
          { year: '१६४९', event: 'विठ्ठल नामाच्या जयघोषात सदेह वैकुंठ प्रयाण.' },
        ];
      case 'dnyaneshwar-maharaj':
        return [
          { year: '१२७५', event: 'पैठण जवळील आपेगाव येथे जन्म.' },
          { year: '१२९०', event: 'नेवासा येथे ज्ञानेश्वरी (भावार्थ दीपिका) ग्रंथाची निर्मिती.' },
          { year: '१२९२', event: 'अमृतानुभव आणि चांगदेव पासष्टी ग्रंथांची निर्मिती.' },
          { year: '१२९६', event: 'आळंदी येथे अवघ्या २१ व्या वर्षी संजीवन समाधी.' },
        ];
      default:
        return [
          { year: 'ऐतिहासिक काळ', event: 'वारकरी संप्रदायात मोलाचे योगदान.' },
          { year: 'भक्ती पर्व', event: 'मराठी अभंग रचनेचे संकीर्तन.' },
        ];
    }
  };

  const timeline = getTimelineForSaint(slug);

  return (
    <div className="vitthalaya-shell min-h-screen pb-20">
      {/* JSON-LD Structured Data */}
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
                compositionCount: totalCompositions,
                relatedSaints: saint.related_saints.map((rs) => ({
                  nameMarathi: rs.name,
                  slug: rs.slug,
                })),
              },
              [
                { name: 'मुख्यपृष्ठ', path: '/' },
                { name: 'संत मंडळ', path: '/sant' },
                { name: saint.name_marathi, path: '/sant/' + slug },
              ],
            ),
          ),
        }}
      />

      {/* Cinematic Saint Hero — blurred portrait texture + gold overlay */}
      <header
        className="relative overflow-hidden border-b border-[var(--dp-rule)]"
        style={{
          paddingTop: 'var(--dp-hero-padding-top)',
          paddingBottom: 'var(--dp-act-padding)',
        }}
      >
        {/* Background: blurred saint portrait at low opacity as atmospheric texture */}
        {(() => {
          const portraitUrl = getSaintPortrait(slug);
          return portraitUrl ? (
            <div
              className="absolute inset-0 pointer-events-none"
              aria-hidden="true"
              style={{
                backgroundImage: `url('${portraitUrl}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center top',
                filter: 'blur(28px) saturate(0.5)',
                opacity: 0.12,
                transform: 'scale(1.1)',
              }}
            />
          ) : null;
        })()}

        {/* Deep gradient overlay — basalt → transparent → ground */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              'linear-gradient(to bottom, var(--dp-basalt-deep) 0%, rgba(6,5,3,0.5) 50%, var(--dp-ground) 100%)',
          }}
        />

        {/* Radial gold halo */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(ellipse 55% 35% at 50% 10%, rgba(246,188,85,0.08) 0%, transparent 65%)',
          }}
        />

        <div className="vitthalaya-container max-w-5xl text-center relative z-10">
          {/* Breadcrumbs */}
          <nav className="flex justify-center mb-8 text-xs font-marathi text-[var(--dp-muted)]" aria-label="ब्रेडक्रंब">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="hover:text-[var(--dp-gold-celestial)] transition-colors">
                  मुख्यपृष्ठ
                </Link>
              </li>
              <li aria-hidden="true"><ChevronRight size={12} /></li>
              <li>
                <Link href="/sant" className="hover:text-[var(--dp-gold-celestial)] transition-colors">
                  संत मंडळ
                </Link>
              </li>
              <li aria-hidden="true"><ChevronRight size={12} /></li>
              <li className="text-[var(--dp-ink)]">{saint.name_marathi}</li>
            </ol>
          </nav>

          {/* Saint portrait or glyph seal */}
          {(() => {
            const seal = getSaintSeal(slug, saint.name_marathi);
            return seal.authenticPortrait ? (
              <div className="relative w-32 h-32 sm:w-36 sm:h-36 mx-auto mb-8 rounded-full overflow-hidden border-2 border-[var(--dp-gold)] bg-[var(--dp-ground)] shadow-[0_0_40px_rgba(201,162,39,0.3)]">
                <Image
                  src={seal.authenticPortrait}
                  alt={saint.name_marathi}
                  fill
                  sizes="144px"
                  className="object-cover"
                  priority
                />
              </div>
            ) : (
              <div className={`relative w-32 h-32 sm:w-36 sm:h-36 mx-auto mb-8 rounded-full overflow-hidden border-2 border-[var(--dp-gold)] bg-gradient-to-br ${seal.accentBg} flex flex-col items-center justify-center shadow-[0_0_40px_rgba(201,162,39,0.3)]`}>
                <span className="text-4xl sm:text-5xl font-bold text-[#fff8ec] font-marathiHeading leading-none">
                  {seal.glyph}
                </span>
                <span className="text-[10px] text-[#c9a227] font-marathi mt-1 font-medium">
                  « {seal.mudra} »
                </span>
              </div>
            );
          })()}

          <p className="text-xs text-[var(--dp-gold-celestial)] font-marathi mb-3 tracking-widest uppercase">
            वारकरी संत परंपरा
          </p>

          <h1 className="dp-chapter-title text-[var(--dp-ink)] mb-3 max-w-3xl mx-auto">
            {saint.name_marathi}
          </h1>

          <p className="text-sm text-[var(--dp-muted)] font-mono mb-6 tracking-wide">
            {saint.name_transliteration}
          </p>

          {/* Period & Region pill badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-marathi mb-8">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[var(--dp-ground)]/80 border border-[var(--dp-gold)]/40 text-[var(--dp-ink-dim)] backdrop-blur-sm">
              <Calendar size={13} className="text-[var(--dp-gold-celestial)]" aria-hidden="true" />
              {saint.period}
            </span>
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[var(--dp-ground)]/80 border border-[var(--dp-gold)]/40 text-[var(--dp-ink-dim)] backdrop-blur-sm">
              <MapPin size={13} className="text-[var(--dp-gold-celestial)]" aria-hidden="true" />
              कर्मभूमी: {saint.region}
            </span>
          </div>

          <div>
            <ConchSoundButton />
          </div>
        </div>
      </header>

      {/* Main Section */}
      <div className="vitthalaya-container max-w-5xl mt-12 grid md:grid-cols-12 gap-8">
        {/* Left Column: Biography & Timeline */}
        <section className="md:col-span-7 space-y-8" aria-labelledby="biography">
          <div className="vitthalaya-card rounded p-6 sm:p-8">
            <h2 id="biography" className="vitthalaya-display text-2xl font-bold mb-4 pb-3 border-b border-[var(--dp-rule)]">
              जीवन गाथा व चरित्र
            </h2>
            <div className="vitthalaya-prose text-sm leading-relaxed space-y-4">
              <p className="whitespace-pre-line">
                {saint.biography}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="vitthalaya-card rounded p-6 sm:p-8">
            <h3 className="vitthalaya-display text-xl font-bold mb-4 pb-3 border-b border-[var(--dp-rule)]">
              महत्वाचे जीवन टप्पे
            </h3>
            <div className="border-l border-[var(--dp-rule-strong)] ml-2 space-y-6 pl-4 relative">
              {timeline.map((item, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-[var(--dp-gold)]" />
                  <span className="text-xs font-semibold text-[var(--dp-gold)] font-marathi">{item.year}</span>
                  <p className="text-xs text-[var(--dp-ink-dim)] font-marathi mt-0.5 leading-relaxed">{item.event}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right Column: 3D Temple / Deity Context */}
        <aside className="md:col-span-5 space-y-6" aria-label="संबंधित देवस्थान">
          <div className="vitthalaya-card rounded p-6 text-center">
            <h3 className="vitthalaya-display text-lg font-bold mb-1">
              आराध्य दैवत व देवस्थान
            </h3>
            <p className="text-xs text-[var(--dp-muted)] font-marathi mb-4">
              माऊलींचे श्रद्धास्थान असलेले श्री विठ्ठल मंदिर, पंढरपूर.
            </p>
            <div className="w-full aspect-square bg-[var(--dp-ground-well)] rounded overflow-hidden flex items-center justify-center border border-[var(--dp-rule)]">
              <TempleViewerClient />
            </div>
            <p className="text-xs text-[var(--dp-muted)] font-marathi mt-3">
              देवस्थान फिरवण्यासाठी वर ड्रॅग करा
            </p>
          </div>
        </aside>
      </div>

      {/* Compositions Section */}
      <section className="vitthalaya-container max-w-5xl mt-12 space-y-6" aria-labelledby="works">
        <div className="flex items-center justify-between border-b border-[var(--dp-rule)] pb-3">
          <h2 id="works" className="vitthalaya-display text-2xl font-bold">
            प्रकाशित भक्ती साहित्य (एकूण {totalCompositions})
          </h2>
        </div>

        {totalCompositions === 0 ? (
          <div className="vitthalaya-card rounded p-8 text-center space-y-3">
            <p className="text-[var(--dp-muted)] text-sm font-marathi">
              या संतांच्या नामनिर्देशित अभंगांचे डिजिटायझेशन व संहिता संकलन सुरू आहे.
            </p>
            <div>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-4 py-2 bg-saffron/10 hover:bg-saffron/20 text-saffron rounded text-xs font-semibold transition-colors"
              >
                समग्र वारकरी साहित्य शोधा
              </Link>
            </div>
          </div>
        ) : (
          <>
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--dp-rule)] pt-6 mt-8">
                <Link
                  href={page > 1 ? `?page=${page - 1}` : '#'}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded border border-[var(--dp-rule)] text-xs font-semibold font-marathi transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px ${
                    page > 1
                      ? 'hover:border-[var(--dp-gold)] text-[var(--dp-ink)]'
                      : 'opacity-40 pointer-events-none text-[var(--dp-muted)]'
                  }`}
                >
                  <ArrowLeft size={14} aria-hidden="true" />
                  मागील पान
                </Link>
                <span className="text-xs font-marathi font-medium text-[var(--dp-muted)]">
                  पान {toDevanagariDigits(page)} / {toDevanagariDigits(totalPages)}
                </span>
                <Link
                  href={page < totalPages ? `?page=${page + 1}` : '#'}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded border border-[var(--dp-rule)] text-xs font-semibold font-marathi transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px ${
                    page < totalPages
                      ? 'hover:border-[var(--dp-gold)] text-[var(--dp-ink)]'
                      : 'opacity-40 pointer-events-none text-[var(--dp-muted)]'
                  }`}
                >
                  पुढील पान
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            )}
          </>
        )}
      </section>

      {/* Related Contemporary Saints */}
      {saint.related_saints.length > 0 && (
        <section className="vitthalaya-container max-w-5xl mt-12 space-y-4" aria-labelledby="related-saints">
          <h2 id="related-saints" className="vitthalaya-display text-xl font-bold border-b border-[var(--dp-rule)] pb-3">
            समकालीन संत
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {saint.related_saints.map((related) => (
              <Link
                key={related.slug}
                href={`/sant/${related.slug}`}
                className="vitthalaya-card rounded p-4 text-center hover:border-[var(--dp-gold)] transition-colors block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
              >
                <p className="font-marathi font-semibold text-sm text-[var(--dp-ink)] truncate">
                  {related.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const rawSlug = await params;
  const slug = decodeURIComponent(rawSlug.slug);

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
    title: `${saint.nameMarathi} : जीवन चरित्र व अभंग संग्रह | डिजिटल पंढरपूर`,
    description: `${saint.nameTranslit} : ${saint.period || ''} मधील ${saint.region || ''} येथील वारकरी संत. त्यांचे संपूर्ण अभंग साहित्य वाचा.`,
    ...canonicalMetadata({ canonical: '/sant/' + slug }),
    openGraph: {
      title: `${saint.nameMarathi} : जीवन चरित्र`,
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
      className="vitthalaya-card rounded p-4 flex items-center justify-between hover:border-[var(--dp-gold)] transition-colors block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
    >
      <div className="flex-1 min-w-0 pr-3">
        <p className="font-marathi font-semibold text-sm text-[var(--dp-ink)] truncate">
          {title}
        </p>
        <p className="text-xs text-[var(--dp-muted)] font-marathi mt-0.5">
          {type}
        </p>
      </div>
      <span className="inline-flex items-center gap-1 text-xs font-semibold font-marathi text-[var(--dp-gold)]">
        <BookOpen size={13} aria-hidden="true" />
        वाचा
      </span>
    </Link>
  );
}

export const dynamic = 'force-dynamic';
