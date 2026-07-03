'use client';

import * as React from 'react';
import Link from 'next/link';
import { 
  GraduationCap, 
  Clock, 
  BookOpen, 
  Sparkles, 
  Compass, 
  Heart, 
  ArrowRight,
  Sun
} from 'lucide-react';
import { V4PageShell, V4Section } from '@/components/v4-page-shell';

export default function LearnPage() {
  const [activeSection, setActiveSection] = React.useState<'overview' | 'traditions' | 'concepts' | 'timeline'>('overview');

  const TIMELINE_EVENTS = [
    { century: '१३वे शतक', saint: 'संत ज्ञानेश्वर महाराज', detail: 'वारकरी संप्रदायाचा पाया रचला. अमृतानुभव आणि ज्ञानेश्वरी (भावार्थ दीपिका) यांसारख्या महान ग्रंथांची मराठी भाषेत निर्मिती करून अध्यात्म सोपे केले.' },
    { century: '१४वे शतक', saint: 'संत नामदेव महाराज', detail: 'कीर्तनाच्या माध्यमातून भक्ती चळवळ पंजाबपर्यंत नेली. शिखांच्या गुरु ग्रंथ साहिबमध्ये नामदेवांच्या ६१ पदांचा समावेश आहे.' },
    { century: '१६वे शतक', saint: 'संत एकनाथ महाराज', detail: 'भागवत धर्माची पुनर्स्थापना केली. चतुःश्लोकी भागवत, भावार्थ रामायण लिहिले आणि लोकभाषेत भारुडे व गवळणी रचल्या.' },
    { century: '१७वे शतक', saint: 'संत तुकाराम महाराज', detail: 'भक्ती चळवळीचे कळस ठरले. त्यांच्या गाथेतील अभंगांनी महाराष्ट्राच्या मनाला शाश्वत नैतिक आणि अध्यात्मिक दिशा दिली.' }
  ];

  const TRADITIONS = [
    { title: 'पंढरीची वारी', desc: 'आषाढी आणि कार्तिकी एकादशीला लक्षावधी वारकरी पायी चालत विठ्ठलाच्या दर्शनाला पंढरपूरला जातात. हा केवळ प्रवास नसून एक सामाजिक आणि अध्यात्मिक समतेचा सोहळा आहे.' },
    { title: 'भजन आणि कीर्तन', desc: 'कीर्तन म्हणजे विठ्ठलाच्या गुणांचे गायन व निरूपण. संत नामदेवांनी "नाचू कीर्तनाचे रंगा, ज्ञानदीप लावू जगी" अशी प्रतिज्ञा केली होती.' },
    { title: 'हरिपाठ पठण', desc: 'संत ज्ञानेश्वरांनी रचलेला २८ अभंगांचा हरिपाठ हा नित्यनियमाने रोज संध्याकाळी म्हटला जातो. हा नामस्मरणाचा मुख्य पाया आहे.' },
    { title: 'पालखी सोहळा', desc: 'सज्जनांच्या पादुका पालखीत ठेवून देहू आणि आळंदीहून पंढरपूरकडे मार्गस्थ होणारी मिरवणूक, जिथे लाखो भाविक तालासुरात सहभागी होतात.' }
  ];

  const CONCEPTS = [
    { title: 'समर्पण (Surrender)', desc: 'अहंकाराचा त्याग करून सर्वस्व भगवंताच्या चरणी अर्पण करणे. विठ्ठलाच्या दर्शनाने आणि चिंतनाने स्वतःचे अस्तित्व विसरणे म्हणजेच खरी भक्ती.' },
    { title: 'नामस्मरण (Chanting)', desc: 'कलयुगात ईश्वर प्राप्तीचा सर्वात सोपा मार्ग म्हणजे नामस्मरण. मुखात अखंड विठ्ठल-रखुमाईचे नाम असणे म्हणजेच मोक्ष.' },
    { title: 'समता आणि बंधुभाव', desc: 'वारकरी संप्रदायात जात, धर्म, लिंग यावरून भेदभाव केला जात नाही. चंद्रभागेच्या वाळवंटात सर्व वारकरी एकत्र येऊन एकमेकांच्या चरणी लीन होतात.' },
    { title: 'अद्वैत दृष्टी', desc: 'प्रत्येक चराचरात पांडुरंग पाहणे. "जे जे भेटे भूत, ते ते मानिजे भगवंत" ही ज्ञानेश्वरांची शिकवण वारकरी आजही आचरणात आणतात.' }
  ];

  return (
    <>
      <title>शिका — भक्ती चळवळीचा इतिहास | डिजिटल पंढरपूर</title>
      <meta name="description" content="महाराष्ट्राच्या वारकरी संप्रदायाचा इतिहास, परंपरा, संकल्पना आणि संत साहित्य याबद्दल सखोल माहिती मिळवा." />

      <V4PageShell
        eyebrow="वारकरी अध्यात्म आणि इतिहास"
        title="ज्ञान मंदिर"
        description="महाराष्ट्राच्या वारकरी संप्रदायाचा समृद्ध इतिहास, परंपरा, संकल्पना आणि संत साहित्याचा सखोल अभ्यास करा."
        stats={[
          { label: 'प्रमुख संत युगे', value: '४+' },
          { label: 'महत्वाच्या संकल्पना', value: '१०+' },
        ]}
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
            <div className="space-y-6 animate-fadeIn">
              <V4Section title="भक्ती चळवळ आणि वारकरी संप्रदाय">
                <p className="text-foreground/80 leading-relaxed font-marathi text-base sm:text-lg">
                  महाराष्ट्रातील भक्ती चळवळ ही केवळ एक धार्मिक चळवळ नव्हती, तर ती एक महान सांस्कृतिक आणि सामाजिक क्रांती होती. 
                  १३व्या शतकात संत ज्ञानेश्वरांनी या चळवळीचा पाया घातला, तर १७व्या शतकात संत तुकारामांनी त्यावर कळस चढवला. 
                  या संप्रदायाचे आराध्य दैवत पंढरपूरचे विठ्ठल (पांडुरंग) असून, लक्षावधी वारकरी वर्षानुवर्षे चंद्रभागेच्या काठावर जमा होतात.
                </p>
                <div className="grid gap-6 sm:grid-cols-2 mt-8">
                  <div className="bg-saffron-50/10 rounded-2xl p-6 border border-saffron/10">
                    <Heart className="w-8 h-8 text-saffron mb-4" />
                    <h3 className="text-xl font-marathi font-bold text-saffron mb-2">भागवत धर्माची गुढी</h3>
                    <p className="text-sm text-muted-foreground font-marathi leading-relaxed">
                      "संतकृपा झाली, इमारत फळ आली" या उक्तीप्रमाणे ज्ञानेश्वर, नामदेव, एकनाथ आणि तुकाराम महाराजांनी भागवत धर्माचा प्रसार सामान्य माणसापर्यंत केला.
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

          {/* Section 2: Timeline */}
          {activeSection === 'timeline' && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-saffron-300 text-xl font-marathi font-medium">ऐतिहासिक वाटचाल</h2>
              <div className="relative border-l border-saffron/20 ml-4 pl-6 space-y-8">
                {TIMELINE_EVENTS.map((event, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-10 top-1.5 w-7 h-7 rounded-full bg-saffron flex items-center justify-center text-xs font-bold text-white border-4 border-background">
                      {idx + 1}
                    </span>
                    <span className="text-saffron text-sm font-bold tracking-wide">{event.century}</span>
                    <h3 className="text-lg font-marathi font-bold text-foreground mt-0.5">{event.saint}</h3>
                    <p className="text-sm text-muted-foreground font-marathi mt-1.5 leading-relaxed">
                      {event.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Traditions */}
          {activeSection === 'traditions' && (
            <div className="grid gap-6 sm:grid-cols-2 animate-fadeIn">
              {TRADITIONS.map((trad, idx) => (
                <div
                  key={idx}
                  className="bg-card rounded-2xl p-6 border border-saffron/10 hover:border-saffron/30 hover:shadow-lg transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-saffron/15 flex items-center justify-center mb-4 text-saffron font-bold text-lg">
                    {idx + 1}
                  </div>
                  <h3 className="text-xl font-marathi font-bold text-saffron mb-2">
                    {trad.title}
                  </h3>
                  <p className="text-sm text-muted-foreground font-marathi leading-relaxed">
                    {trad.desc}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Section 4: Concepts */}
          {activeSection === 'concepts' && (
            <div className="grid gap-6 sm:grid-cols-2 animate-fadeIn">
              {CONCEPTS.map((concept, idx) => (
                <div
                  key={idx}
                  className="bg-card rounded-2xl p-6 border border-saffron/10 hover:border-saffron/30 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Sun className="w-5 h-5 text-saffron animate-pulse" />
                    <h3 className="text-xl font-marathi font-bold text-saffron">
                      {concept.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground font-marathi leading-relaxed">
                    {concept.desc}
                  </p>
                </div>
              ))}
            </div>
          )}

        </div>
      </V4PageShell>
    </>
  );
}
