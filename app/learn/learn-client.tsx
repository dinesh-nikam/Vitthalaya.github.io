'use client';

import * as React from 'react';
import Link from 'next/link';
import { Heart, Sun, Compass, Search } from 'lucide-react';
import { V4PageShell, V4Section } from '@/components/v4-page-shell';
import Image from 'next/image';

export interface LearnSaint {
  century: string;
  saint: string;
  detail: string;
  slug: string;
  compositionCount: number;
}

export interface LearnTradition {
  title: string;
  desc: string;
  count: number;
  searchQuery: string;
}

export interface LearnConcept {
  keyword: string;
  exampleCount: number;
  examples: Array<{ title: string; slug: string }>;
}

interface LearnClientProps {
  timeline: LearnSaint[];
  traditions: LearnTradition[];
  concepts: LearnConcept[];
  stats: Array<{ label: string; value: string | number }>;
}

export function LearnClient({ timeline, traditions, concepts, stats }: LearnClientProps) {
  const [activeSection, setActiveSection] = React.useState<'overview' | 'traditions' | 'concepts' | 'timeline'>('overview');

  return (
    <>
      <V4PageShell
        eyebrow="वारकरी अध्यात्म आणि इतिहास"
        title="ज्ञान मंदिर"
        description="महाराष्ट्राच्या वारकरी संप्रदायाचा समृद्ध इतिहास, परंपरा, संकल्पना आणि संत साहित्याचा सखोल अभ्यास करा."
        stats={stats}
      >
        <div className="mt-8 space-y-8">
          {/* Navigation Tabs */}
          <div className="flex flex-wrap border-b border-saffron/10 gap-4 sm:gap-6">
            <button
              onClick={() => setActiveSection('overview')}
              className={`pb-4 text-base sm:text-lg font-marathi font-medium transition-colors relative ${
                activeSection === 'overview' ? 'text-saffron' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ओळख
              {activeSection === 'overview' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-saffron" />}
            </button>
            <button
              onClick={() => setActiveSection('timeline')}
              className={`pb-4 text-base sm:text-lg font-marathi font-medium transition-colors relative ${
                activeSection === 'timeline' ? 'text-saffron' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              संत कालरेषा
              {activeSection === 'timeline' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-saffron" />}
            </button>
            <button
              onClick={() => setActiveSection('traditions')}
              className={`pb-4 text-base sm:text-lg font-marathi font-medium transition-colors relative ${
                activeSection === 'traditions' ? 'text-saffron' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              संप्रदायाच्या परंपरा
              {activeSection === 'traditions' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-saffron" />}
            </button>
            <button
              onClick={() => setActiveSection('concepts')}
              className={`pb-4 text-base sm:text-lg font-marathi font-medium transition-colors relative ${
                activeSection === 'concepts' ? 'text-saffron' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              मुख्य संकल्पना
              {activeSection === 'concepts' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-saffron" />}
            </button>
          </div>

          {/* Section 1: Overview */}
          {activeSection === 'overview' && (
            <div className="space-y-6 animate-fadeIn text-left">
              <V4Section title="भक्ती चळवळ आणि वारकरी संप्रदाय">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  <div className="md:col-span-7 space-y-4">
                    <p className="text-foreground/80 leading-relaxed font-marathi text-base sm:text-lg">
                      महाराष्ट्रातील भक्ती चळवळ ही केवळ एक धार्मिक चळवळ नव्हती, तर ती एक महान सांस्कृतिक आणि सामाजिक क्रांती होती.
                      १३व्या शतकात संत ज्ञानेश्वरांनी या चळवळीचा पाया घातला, तर १७व्या शतकात संत तुकारामांनी त्यावर कळस चढवला.
                      या संप्रदायाचे आराध्य दैवत पंढरपूरचे विठ्ठल (पांडुरंग) असून, लक्षावधी वारकरी वर्षानुवर्षे चंद्रभागेच्या काठावर जमा होतात.
                    </p>
                    <p className="text-foreground/80 leading-relaxed font-marathi text-base">
                      संत ज्ञानेश्वर, संत नामदेव, संत तुकाराम आणि संत एकनाथांनी देवभाषा संस्कृतऐवजी लोकभाषा मराठीचा वापर करून अध्यात्माचे दरवाजे सर्वांसाठी खुले केले.
                    </p>
                  </div>
                  <div className="md:col-span-5 relative aspect-[4/3] rounded-2xl overflow-hidden border border-saffron/20 shadow-xl">
                    <Image
                      src="/images/realistic/saint-devotional.jpg"
                      alt="Saints Devotional Gathering"
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 mt-8">
                  <div className="bg-saffron-50/10 rounded-2xl p-6 border border-saffron/10">
                    <Heart className="w-8 h-8 text-saffron mb-4" />
                    <h3 className="text-xl font-marathi font-bold text-saffron mb-2">भागवत धर्माची गुढी</h3>
                    <p className="text-sm text-muted-foreground font-marathi leading-relaxed">
                      &quot;संतकृपा झाली, इमारत फळ आली&quot; या उक्तीप्रमाणे ज्ञानेश्वर, नामदेव, एकनाथ आणि तुकाराम महाराजांनी भागवत धर्माचा प्रसार सामान्य माणसापर्यंत केला.
                    </p>
                  </div>
                  <div className="bg-saffron-50/10 rounded-2xl p-6 border border-saffron/10">
                    <Compass className="w-8 h-8 text-saffron mb-4" />
                    <h3 className="text-xl font-marathi font-bold text-saffron mb-2">३डी दर्शन मार्गदर्शक</h3>
                    <p className="text-sm text-muted-foreground font-marathi leading-relaxed">
                      प्लॅटफॉर्मवर विविध ठिकाणी जसे की मुख्यपृष्ठावर, तुम्हाला परस्परसंवादी ३डी दीपक, ३डी मंदिर आणि ३डी घंटा पाहायला मिळतील. तुम्ही त्यांना फिरवून (drag) अनुभवू शकता.
                    </p>
                  </div>
                </div>
              </V4Section>
            </div>
          )}

          {/* Section 2: Timeline — real saints from the database */}
          {activeSection === 'timeline' && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-saffron-300 text-xl font-marathi font-medium">ऐतिहासिक वाटचाल</h2>
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground font-marathi">संतांची माहिती अद्याप उपलब्ध नाही.</p>
              ) : (
                <div className="relative border-l border-saffron/20 ml-4 pl-6 space-y-8">
                  {timeline.map((event, idx) => (
                    <div key={`${event.slug}-${idx}`} className="relative">
                      <span className="absolute -left-10 top-1.5 w-7 h-7 rounded-full bg-saffron flex items-center justify-center text-xs font-bold text-white border-4 border-background">
                        {idx + 1}
                      </span>
                      <span className="text-saffron text-sm font-bold tracking-wide">{event.century}</span>
                      <Link href={`/sant/${event.slug}`} className="block">
                        <h3 className="text-lg font-marathi font-bold text-foreground mt-0.5 hover:text-saffron transition-colors">
                          {event.saint}
                        </h3>
                      </Link>
                      <p className="text-sm text-muted-foreground font-marathi mt-1.5 leading-relaxed">
                        {event.detail}
                      </p>
                      <span className="inline-block mt-2 text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {event.compositionCount} रचना
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 3: Traditions — real composition-type counts */}
          {activeSection === 'traditions' && (
            <div className="grid gap-6 sm:grid-cols-2 animate-fadeIn">
              {traditions.map((trad, idx) => (
                <Link
                  key={`${trad.title}-${idx}`}
                  href={`/search?q=${encodeURIComponent(trad.searchQuery)}`}
                  className="bg-card rounded-2xl p-6 border border-saffron/10 hover:border-saffron/30 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-saffron/15 flex items-center justify-center text-saffron font-bold text-lg">
                      {idx + 1}
                    </div>
                    <span className="text-xs font-mono text-saffron bg-saffron/10 px-2 py-1 rounded-full">
                      {trad.count} रचना
                    </span>
                  </div>
                  <h3 className="text-xl font-marathi font-bold text-saffron mb-2">
                    {trad.title}
                  </h3>
                  <p className="text-sm text-muted-foreground font-marathi leading-relaxed">
                    {trad.desc}
                  </p>
                  <span className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-saffron">
                    <Search className="w-3 h-3" /> एक्सप्लोर करा
                  </span>
                </Link>
              ))}
              {traditions.length === 0 && (
                <p className="text-sm text-muted-foreground font-marathi">परंपरांची माहिती अद्याप उपलब्ध नाही.</p>
              )}
            </div>
          )}

          {/* Section 4: Concepts — editorial definition + real examples */}
          {activeSection === 'concepts' && (
            <div className="grid gap-6 sm:grid-cols-2 animate-fadeIn">
              {concepts.map((concept, idx) => (
                <div
                  key={`${concept.keyword}-${idx}`}
                  className="bg-card rounded-2xl p-6 border border-saffron/10 hover:border-saffron/30 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Sun className="w-5 h-5 text-saffron animate-pulse" />
                    <h3 className="text-xl font-marathi font-bold text-saffron">
                      {concept.keyword}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground font-marathi leading-relaxed">
                    {concept.keyword === 'नामस्मरण' && 'कलयुगात ईश्वर प्राप्तीचा सर्वात सोपा मार्ग म्हणजे नामस्मरण. मुखात अखंड विठ्ठल-रखुमाईचे नाम असणे म्हणजेच मोक्ष.'}
                    {concept.keyword === 'समर्पण' && 'अहंकाराचा त्याग करून सर्वस्व भगवंताच्या चरणी अर्पण करणे. विठ्ठलाच्या दर्शनाने आणि चिंतनाने स्वतःचे अस्तित्व विसरणे म्हणजेच खरी भक्ती.'}
                    {concept.keyword === 'समता' && 'वारकरी संप्रदायात जात, धर्म, लिंग यावरून भेदभाव केला जात नाही. चंद्रभागेच्या वाळवंटात सर्व वारकरी एकत्र येऊन एकमेकांच्या चरणी लीन होतात.'}
                    {concept.keyword === 'अद्वैत' && 'प्रत्येक चराचरात पांडुरंग पाहणे. "जे जे भेटे भूत, ते ते मानिजे भगवंत" ही ज्ञानेश्वरांची शिकवण वारकरी आजही आचरणात आणतात.'}
                  </p>
                  {concept.examples.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-saffron/10">
                      <p className="text-[11px] font-bold text-muted-foreground mb-2">
                        संबंधित रचना ({concept.exampleCount}+)
                      </p>
                      <ul className="space-y-1.5">
                        {concept.examples.map((ex) => (
                          <li key={ex.slug}>
                            <Link
                              href={`/abhang/${ex.slug}`}
                              className="text-sm font-marathi text-foreground hover:text-saffron transition-colors"
                            >
                              {ex.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
              {concepts.length === 0 && (
                <p className="text-sm text-muted-foreground font-marathi">संकल्पनांची माहिती अद्याप उपलब्ध नाही.</p>
              )}
            </div>
          )}

        </div>
      </V4PageShell>
    </>
  );
}
