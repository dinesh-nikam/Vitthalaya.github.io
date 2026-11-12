import Link from 'next/link';
import { Footprints, Info, BookOpen, ExternalLink, MapPin, Compass, ChevronRight, Home, Landmark, Music } from 'lucide-react';
import Image from 'next/image';
import { db } from '@/src/db/client';
import '@/app/homepage.css';

export const metadata = {
  title: 'आषाढी वारी : पवित्र पायी प्रवास | डिजिटल पंढरपूर',
  description: 'आषाढी वारीतील मार्ग, पालख्या, मुख्य थांबे आणि पंढरपूरचे दर्शन : डिजिटल पंढरपूरवर.',
};

export default async function WariPage() {
  const stops = await db.wariStop.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  const totalKm = stops.length > 0 ? Math.max(...stops.map((s) => s.distanceKm)) : 0;

  return (
    <div className="vitthalaya-shell min-h-screen pb-20">
      {/* Cinematic Wari Hero — full-bleed procession backdrop */}
      <section
        className="relative overflow-hidden border-b border-[var(--dp-rule)]"
        style={{
          paddingTop: 'var(--dp-hero-padding-top)',
          paddingBottom: 'var(--dp-act-padding)',
          background: `
            linear-gradient(to bottom, rgba(6,5,3,0.88) 0%, rgba(6,5,3,0.4) 60%, rgba(10,8,6,1) 100%),
            url('/images/realistic/wari-procession.jpg') center/cover no-repeat
          `,
        }}
        aria-labelledby="wari-title"
      >
        {/* Radial gold halo behind title */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 50% 10%, rgba(246,188,85,0.09) 0%, transparent 70%)',
          }}
        />

        <div className="vitthalaya-container max-w-4xl text-center relative z-10">
          {/* Breadcrumb */}
          <nav className="flex justify-center mb-6 text-xs font-marathi text-[var(--dp-muted)]" aria-label="ब्रेडक्रंब">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="hover:text-[var(--dp-gold-celestial)] transition-colors">
                  मुख्यपृष्ठ
                </Link>
              </li>
              <li aria-hidden="true"><ChevronRight size={12} /></li>
              <li className="text-[var(--dp-ink)]">आषाढी वारी</li>
            </ol>
          </nav>

          <p className="text-xs text-[var(--dp-gold-celestial)] font-marathi mb-3 tracking-widest uppercase">
            ज्ञानोबा तुकाराम · पालखी सोहळा
          </p>

          <h1 id="wari-title" className="dp-chapter-title text-[var(--dp-ink)] mb-6 max-w-3xl mx-auto">
            वारी : पवित्र पायी प्रवास
          </h1>

          <p className="vitthalaya-prose text-sm sm:text-base text-[var(--dp-ink-dim)] max-w-2xl mx-auto leading-relaxed mb-10">
            दरवर्षी आषाढ महिन्यात कोट्यवधी वारकरी विठू माऊलींच्या गजरात आळंदी आणि देहू येथून पंढरपूरकडे पायी कूच करतात.
          </p>

          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-[var(--dp-ground)]/80 border border-[var(--dp-gold)]/30 text-xs text-[var(--dp-gold-celestial)] font-marathi backdrop-blur-sm">
            {/* Animated ringan dot */}
            <span className="dp-ringan-dot" aria-hidden="true" />
            <Compass size={14} aria-hidden="true" />
            <span>एकूण अंतर: <strong className="text-[var(--dp-ink)]">{totalKm} किलोमीटर</strong> · देहू/आळंदी ते पंढरपूर</span>
          </div>
        </div>
      </section>

      {/* Journey Route Guide */}
      <section className="vitthalaya-container max-w-5xl pt-12 pb-16">
        <div className="flex items-center gap-2 mb-8 pb-3 border-b border-[var(--dp-rule)]">
          <Footprints className="w-5 h-5 text-[var(--dp-gold)]" aria-hidden="true" />
          <h2 className="vitthalaya-display text-2xl font-bold">
            प्रवासाचा मार्गदर्शक व थांबे
          </h2>
        </div>

        {stops.length === 0 ? (
          <div className="vitthalaya-card rounded p-10 text-center">
            <p className="text-sm font-marathi text-[var(--dp-muted)]">
              वारी मार्गाचे थांबे अद्याप उपलब्ध नाहीत : संग्रहालय तयार होत आहे.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Timeline Route Stops */}
            <div className="md:col-span-7 space-y-6">
              <div className="relative">
                <div className="absolute left-5 top-3 bottom-3 w-px bg-[var(--dp-rule-strong)]" aria-hidden="true" />

                <div className="space-y-6 text-left">
                  {stops.map((stop, idx) => (
                    <div key={stop.id} className="relative flex items-start gap-4">
                      {/* Milestone Icon */}
                      <div className="relative z-10 w-10 h-10 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] flex items-center justify-center text-[var(--dp-gold)] shrink-0">
                        {idx === 0 ? (
                          <Home size={16} aria-hidden="true" />
                        ) : idx === stops.length - 1 ? (
                          <Landmark size={16} aria-hidden="true" />
                        ) : (
                          <MapPin size={16} aria-hidden="true" />
                        )}
                      </div>

                      <div className="flex-1 pt-1.5 vitthalaya-card rounded p-4">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="vitthalaya-display text-base font-bold text-[var(--dp-ink)]">
                            {stop.nameMarathi}
                          </h3>
                          <span className="text-xs font-marathi text-[var(--dp-gold)] px-2 py-0.5 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)]">
                            {stop.distanceKm} किमी
                          </span>
                        </div>
                        {stop.description && (
                          <p className="text-xs text-[var(--dp-ink-dim)] font-marathi leading-relaxed mt-1">
                            {stop.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Destination View: Chandrabhaga River */}
            <div className="md:col-span-5 md:sticky md:top-24 space-y-6">
              <div className="vitthalaya-card rounded overflow-hidden">
                <div className="relative aspect-[4/3] bg-[var(--dp-ground-well)]">
                  <Image
                    src="/images/realistic/chandrabhaga-river.jpg"
                    alt="पवित्र चंद्रभागा नदी"
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-5">
                  <p className="text-xs text-[var(--dp-gold)] font-marathi mb-1">
                    अंतिम ध्येय : पवित्र स्नान
                  </p>
                  <h3 className="vitthalaya-display text-xl font-bold mb-2">
                    चंद्रभागा नदी
                  </h3>
                  <p className="text-xs text-[var(--dp-ink-dim)] leading-relaxed font-marathi">
                    चंद्रभागेच्या वाळवंटी, विठू नामाची गर्जना: प्रवासाचा शेवट पवित्र चंद्रभागेच्या स्नानाने आणि श्री विठ्ठलाच्या दर्शनाने होतो.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Explore Further Links */}
      <section className="border-t border-[var(--dp-rule)] pt-12">
        <div className="vitthalaya-container max-w-4xl">
          <h2 className="vitthalaya-display text-xl font-bold text-center mb-8">
            अधिक संदर्भ व साहित्य
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/search?q=वारी"
              className="vitthalaya-card rounded p-4 flex items-center gap-3 group hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
            >
              <BookOpen className="w-5 h-5 text-[var(--dp-gold)] shrink-0" aria-hidden="true" />
              <span className="text-xs font-semibold font-marathi text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors">
                वारीवरील साहित्य
              </span>
            </Link>

            <Link
              href="/nityanem"
              className="vitthalaya-card rounded p-4 flex items-center gap-3 group hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
            >
              <Music className="w-5 h-5 text-[var(--dp-gold)] shrink-0" aria-hidden="true" />
              <span className="text-xs font-semibold font-marathi text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors">
                मुक्काम सेवा व ठेका
              </span>
            </Link>

            <Link
              href="/learn"
              className="vitthalaya-card rounded p-4 flex items-center gap-3 group hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
            >
              <Info className="w-5 h-5 text-[var(--dp-gold)] shrink-0" aria-hidden="true" />
              <span className="text-xs font-semibold font-marathi text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors">
                ऐतिहासिक संदर्भ
              </span>
            </Link>

            <Link
              href="/sant"
              className="vitthalaya-card rounded p-4 flex items-center gap-3 group hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
            >
              <ExternalLink className="w-5 h-5 text-[var(--dp-gold)] shrink-0" aria-hidden="true" />
              <span className="text-xs font-semibold font-marathi text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors">
                संतांची माहिती
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
