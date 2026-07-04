'use client';

import * as React from 'react';
import Link from 'next/link';
import { MapPin, Footprints, Info, BookOpen, ExternalLink } from 'lucide-react';
import Image from 'next/image';

const JOURNEY_STOPS = [
  { name: 'देहू', dist: 250, desc: 'संत तुकाराम महाराजांच्या पालखीचे प्रस्थान', icon: '🚩' },
  { name: 'आळंदी', dist: 238, desc: 'संत ज्ञानेश्वर माऊलींच्या पालखीचे प्रस्थान', icon: '🚩' },
  { name: 'पुणे', dist: 215, desc: 'दोन्ही पालख्यांचा संगम आणि भव्य स्वागत सोहळा', icon: '🏛️' },
  { name: 'जेजुरी', dist: 165, desc: 'खंडोबा चरणी भंडारा उधळण', icon: '⛰️' },
  { name: 'वाखरी', dist: 15, desc: 'वारीतील शेवटचे भव्य गोलाकार रिंगण', icon: '🌀' },
  { name: 'पंढरपूर', dist: 0, desc: 'चंद्रभागेचे स्नान आणि विठू माऊलींचे दर्शन', icon: '🛕' },
];

export default function WariPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-cream to-background">
      {/* Hero */}
      <section className="relative py-24 text-center overflow-hidden bg-black">
        {/* Background Procession Image with Saffron/Dark gradient overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/realistic/wari-procession.jpg"
            alt="Wari Pilgrimage Procession"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-saffron-950/20 to-black/80 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-tr from-maroon/20 via-transparent to-gold/10" />
        </div>
        <div className="container mx-auto px-4 max-w-3xl relative z-10 text-white">
          <span className="text-5xl mb-4 block animate-bounce" aria-hidden="true">🚩</span>
          <h1 className="text-4xl sm:text-5xl font-marathiHeading text-saffron font-bold mb-4 leading-tight">
            वारी — पवित्र प्रवास
          </h1>
          <p className="text-base sm:text-lg font-marathi text-white/90 max-w-2xl mx-auto leading-relaxed">
            दरवर्षी आषाढ महिन्यात कोट्यवधी वारकरी विठू माऊलींच्या गजरात आळंदी-देहू येथून पंढरपूरकडे पायी कूच करतात. हा पवित्र प्रवास म्हणजेच वारी.
          </p>
        </div>
      </section>

      {/* Journey Route Preview */}
      <section className="container mx-auto px-4 max-w-5xl pb-20 pt-12">
        <div className="flex items-center gap-2 mb-8">
          <Footprints className="w-5 h-5 text-saffron" />
          <h2 className="text-2xl font-marathiHeading text-maroon dark:text-saffron font-bold">
            प्रवासाचा मार्गदर्शक
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Timeline Route Stops */}
          <div className="md:col-span-7 space-y-6">
            <div className="relative">
              {/* Vertical connecting line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-saffron/20" />

              <div className="space-y-8 text-left">
                {JOURNEY_STOPS.map((stop, idx) => (
                  <div key={stop.name} className="relative flex items-start gap-6 pl-0">
                    {/* Dot */}
                    <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-lg shrink-0 border-2 ${
                      idx === 0 ? 'bg-saffron border-saffron text-white' :
                      idx === JOURNEY_STOPS.length - 1 ? 'bg-gold border-gold text-white' :
                      'bg-card border-saffron/30'
                    }`}>
                      {idx === 0 ? '🏠' : idx === JOURNEY_STOPS.length - 1 ? '🛕' : stop.icon}
                    </div>

                    <div className="flex-1 pt-2">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-marathiHeading font-bold text-maroon dark:text-saffron">
                          {stop.name}
                        </h3>
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {stop.dist} किमी
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground font-marathi">{stop.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Distance indicator */}
            <div className="p-6 bg-card rounded-2xl border border-saffron/10 text-center">
              <p className="text-sm font-marathi text-foreground/80">
                एकूण अंतर: <span className="font-bold text-saffron">२५० किलोमीटर</span> — देहू/आळंदी ते पंढरपूर
              </p>
            </div>
          </div>

          {/* Right Column: Destination View (River) */}
          <div className="md:col-span-5 md:sticky md:top-24 space-y-6">
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-saffron/20 shadow-2xl">
              <Image
                src="/images/realistic/chandrabhaga-river.jpg"
                alt="Holy Chandrabhaga River"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 text-left text-white">
                <span className="text-saffron text-[10px] font-bold uppercase tracking-wider">अंतिम ध्येय | The Destination</span>
                <h4 className="text-xl font-bold font-marathi mt-1">चंद्रभागा नदी</h4>
                <p className="text-xs text-white/80 leading-relaxed font-marathi mt-2">
                  "चंद्रभागेच्या वाळवंटी, विठू नामाची गर्जना..." प्रवासाचा शेवट पवित्र चंद्रभागेच्या स्नानाने आणि विठ्ठलाच्या दर्शनाने होतो.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Explore Further */}
      <section className="bg-card border-y border-saffron/10 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-marathiHeading text-maroon dark:text-saffron font-bold text-center mb-8">
            अधिक माहिती
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/search?q=वारी"
              className="flex items-center gap-3 p-4 rounded-xl border border-saffron/10 hover:border-saffron/30 transition-all group"
            >
              <BookOpen className="w-5 h-5 text-saffron shrink-0" />
              <span className="text-sm font-marathi group-hover:text-saffron transition-colors">वारीवरील साहित्य</span>
            </Link>
            <Link
              href="/learn/timeline"
              className="flex items-center gap-3 p-4 rounded-xl border border-saffron/10 hover:border-saffron/30 transition-all group"
            >
              <Info className="w-5 h-5 text-saffron shrink-0" />
              <span className="text-sm font-marathi group-hover:text-saffron transition-colors">ऐतिहासिक संदर्भ</span>
            </Link>
            <Link
              href="/saints"
              className="flex items-center gap-3 p-4 rounded-xl border border-saffron/10 hover:border-saffron/30 transition-all group"
            >
              <ExternalLink className="w-5 h-5 text-saffron shrink-0" />
              <span className="text-sm font-marathi group-hover:text-saffron transition-colors">संतांची माहिती</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
