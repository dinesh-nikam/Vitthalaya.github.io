'use client';

import * as React from 'react';
import Link from 'next/link';
import { MapPin, Footprints, Info, BookOpen, ExternalLink } from 'lucide-react';

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
      <section className="relative py-20 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-saffron/10 to-transparent" />
        </div>
        <div className="container mx-auto px-4 max-w-3xl relative z-10">
          <span className="text-6xl mb-6 block" aria-hidden="true">🚩</span>
          <h1 className="text-4xl sm:text-5xl font-marathiHeading text-maroon dark:text-saffron font-bold mb-4">
            वारी — पवित्र प्रवास
          </h1>
          <p className="text-lg font-marathi text-foreground/80 max-w-2xl mx-auto leading-relaxed">
            दरवर्षी आषाढ महिन्यात कोट्यवधी वारकरी विठू माऊलींच्या गजरात आळंदी-देहू येथून पंढरपूरकडे पायी कूच करतात. हा पवित्र प्रवास म्हणजे वारी.
          </p>
        </div>
      </section>

      {/* Journey Route Preview */}
      <section className="container mx-auto px-4 max-w-4xl pb-20">
        <div className="flex items-center gap-2 mb-8">
          <Footprints className="w-5 h-5 text-saffron" />
          <h2 className="text-2xl font-marathiHeading text-maroon dark:text-saffron font-bold">
            प्रवासाचा नकाशा
          </h2>
        </div>

        <div className="relative">
          {/* Vertical connecting line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-saffron/20" />

          <div className="space-y-8">
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
                  <p className="text-sm text-muted-foreground">{stop.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Distance indicator */}
        <div className="mt-10 p-6 bg-card rounded-2xl border border-saffron/10 text-center">
          <p className="text-sm font-marathi text-foreground/80">
            एकूण अंतर: <span className="font-bold text-saffron">२५० किलोमीटर</span> — देहू/आळंदी ते पंढरपूर
          </p>
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
