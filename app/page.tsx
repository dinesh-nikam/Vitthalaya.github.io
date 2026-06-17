import { HeroSection } from '@/components/hero-section';
import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <HeroSection />

      {/* Festival Strip */}
      <section className="bg-saffron/10 py-6 overflow-x-auto" aria-label="सण विभाग">
        <div className="container mx-auto px-4">
          <h2 className="text-lg font-marathiHeading text-maroon mb-4">
            सध्याचा सण
          </h2>
          <div className="flex gap-4 pb-2">
            {[
              { name: 'आषाढी एकादशी', days: '२३ जून', slug: 'ashadhi-ekadashi' },
              { name: 'कार्तिकी एकादशी', days: '२२ जूलै', slug: 'kartiki-ekadashi' },
              { name: 'गणेश चतुर्थी', days: '१५ फेब्रुवारी', slug: 'ganesh-chaturthi' },
            ].map((festival) => (
              <Link
                key={festival.slug}
                href={`/festival/${festival.slug}`}
                className="flex-shrink-0 rounded-lg bg-card px-4 py-3 border border-saffron/20 hover:border-saffron transition-colors"
              >
                <p className="font-marathiHeading text-maroon">{festival.name}</p>
                <p className="text-sm text-muted-foreground">{festival.days}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Saints */}
      <section className="py-12 bg-background" aria-labelledby="featured-saints">
        <div className="container mx-auto px-4">
          <h2 id="featured-saints" className="text-2xl font-marathiHeading text-maroon mb-6">
            प्रसिद्ध संत
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <SaintCard name="तुकाराम महाराज" slug="tukaram-maharaj" />
            <SaintCard name="द्न्यादेश्वर महाराज" slug="dnyaneshwar-maharaj" />
            <SaintCard name="नामदेव महाराज" slug="namdev-maharaj" />
            <SaintCard name="एकनाथ महाराज" slug="eknath-maharaj" />
          </div>
        </div>
      </section>

      {/* Category Grid */}
      <section className="py-12 bg-cream" aria-labelledby="browse-categories">
        <div className="container mx-auto px-4">
          <h2 id="browse-categories" className="text-2xl font-marathiHeading text-maroon mb-6">
            श्रेणीनुसार ब्राउझ करा
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <CategoryCard name="विठ्ठल" icon="🚩" slug="vitthal" count={150 } />
            <CategoryCard name="देवी" icon="🙏" slug="devi" count={230} />
            <CategoryCard name="शिव" icon="ॐ" slug="shiv" count={180} />
            <CategoryCard name="गणपती" icon="🌸" slug="ganpati" count={120} />
            <CategoryCard name="हरिपाठ" icon="📿" slug="haripath" count={85} />
            <CategoryCard name="आरती" icon="🪔" slug="aarti" count={300} />
          </div>
        </div>
      </section>
    </>
  );
}

function SaintCard({ name, slug }: { name: string; slug: string }) {
  return (
    <Link
      href={`/sant/${slug}`}
      className="group block rounded-lg bg-card p-4 text-center border border-saffron/10 hover:shadow-lg hover:border-saffron/30 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-saffron"
    >
      <div className="mx-auto mb-3 h-20 w-20 rounded-full bg-saffron/20 flex items-center justify-center group-hover:bg-saffron/30 transition-colors">
        <span className="text-3xl" aria-hidden="true">
          🙏
        </span>
      </div>
      <p className="font-marathi text-sm text-maroon group-hover:text-saffron transition-colors">
        {name}
      </p>
    </Link>
  );
}

function CategoryCard({ name, icon, slug, count }: { name: string; icon: string; slug: string; count: number }) {
  return (
    <Link
      href={`/category/${slug}`}
      className="group block rounded-lg bg-card p-6 text-center border border-saffron/10 hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-saffron"
    >
      <span className="text-4xl mb-3 block" aria-hidden="true">
        {icon}
      </span>
      <h3 className="font-marathi text-lg text-maroon mb-1 group-hover:text-saffron transition-colors">
        {name}
      </h3>
      <p className="text-sm text-muted-foreground">{count}+ साहित्य</p>
    </Link>
  );
}