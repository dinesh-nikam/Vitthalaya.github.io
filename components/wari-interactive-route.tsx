'use client';

import * as React from 'react';
import Link from 'next/link';
import { Footprints, ArrowRight, Waves } from 'lucide-react';

interface WariStop {
  day: number;
  location: string;
  distanceKm: number;
  highlight: string;
  riverOrPass?: string;
  significance: string;
}

const DNYANESHWAR_STOPS: WariStop[] = [
  { day: 1, location: 'आळंदी (प्रस्थान)', distanceKm: 0, highlight: 'समाधी मंदिर प्रस्थान', riverOrPass: 'इंद्रायणी काठ', significance: 'संत ज्ञानेश्वर महाराज पालखीचे प्रस्थान, ज्ञानोबा-माऊली नामाचा अखंड गजर.' },
  { day: 2, location: 'पुणे (भवानी पेठ)', distanceKm: 22, highlight: 'पालखी विठोबा मंदिर', significance: 'पुणे शहरात वैष्णवांचा अथांग मेळा, दोन दिवसांचा पवित्र मुक्काम.' },
  { day: 4, location: 'सासवड', distanceKm: 52, highlight: 'संत सोपानदेव समाधी', riverOrPass: 'दिवे घाट पायथा', significance: 'दिवे घाटातील विहंगम पालखी सोहळा व बंधू सोपानदेवांच्या चरणी नमन.' },
  { day: 5, location: 'जेजुरी', distanceKm: 68, highlight: 'खंडोबा भंडारा उधळण', riverOrPass: 'कऱ्हा नदी', significance: 'सोनेरी भंडाऱ्याची उधळण आणि टाळ-मृदंगाचा अनुपम संगम.' },
  { day: 6, location: 'वाल्हा', distanceKm: 83, highlight: 'महर्षी वाल्मिकी भूमी', significance: 'वारकऱ्यांची भावपूर्ण सेवा आणि अखंड हरिनाम सप्ताह.' },
  { day: 7, location: 'लोणंद', distanceKm: 99, highlight: 'चांदोबाचा लिंब उभे रिंगण', riverOrPass: 'नीरा नदी खोरे', significance: 'पालखी सोहळ्यातील पहिले प्रसिद्ध उभे रिंगण आणि अश्वांची दौड.' },
  { day: 8, location: 'तरडगाव', distanceKm: 114, highlight: 'दत्त मंदिर मुक्काम', significance: 'ग्रामीण महाराष्ट्राचे उत्स्फूर्त आदरातिथ्य आणि भजन कीर्तन.' },
  { day: 9, location: 'फलटण', distanceKm: 134, highlight: 'विमानतळ गोल रिंगण', significance: 'भव्य गोल रिंगणात माऊलींच्या अश्वांची नेत्रदीपक प्रदक्षिणा.' },
  { day: 10, location: 'बरड', distanceKm: 152, highlight: 'वारकरी विश्रांती तळ', significance: 'भक्ती, सेवा आणि अन्नदान परंपरेचा आदर्श दर्शन.' },
  { day: 11, location: 'नातेपुते', distanceKm: 172, highlight: 'दुपारचे उभे रिंगण', significance: 'लाखो वारकऱ्यांची शिस्तबद्ध रांग आणि नामाचा अखंड जयघोष.' },
  { day: 12, location: 'माळशिरस', distanceKm: 190, highlight: 'सदाशिव मंदिर मुक्काम', significance: 'सोलापूर जिल्ह्यात पालखीचे भव्य स्वागत.' },
  { day: 13, location: 'वेळापूर', distanceKm: 208, highlight: 'ठाकूरबुवा समाधी रिंगण', significance: 'पंढरीच्या समीपे पोहोचल्याचा वारकऱ्यांच्या चेहऱ्यावरील विलोभनीय आनंद.' },
  { day: 14, location: 'भंडीशेगाव', distanceKm: 224, highlight: 'तुंगत मुक्काम', significance: 'पंढरपूर सीमेवरील शेवटचा मुक्काम.' },
  { day: 15, location: 'वाखरी', distanceKm: 234, highlight: 'सर्व पालख्यांचे महा-रिंगण', riverOrPass: 'पंढरपूर प्रवेशद्वार', significance: 'माऊली व तुकोबाराय पालख्यांचा ऐतिहासिक मिलाफ आणि महा-रिंगण.' },
  { day: 16, location: 'पंढरपूर (नगरप्रवेश)', distanceKm: 240, highlight: 'चंद्रभागा स्नान व विठ्ठल दर्शन', riverOrPass: 'चंद्रभागा (भीमा)', significance: 'आषाढी एकादशी, पवित्र चंद्रभागा स्नान आणि विठ्ठल चरणी दंडवत.' }
];

const TUKARAM_STOPS: WariStop[] = [
  { day: 1, location: 'देहू (प्रस्थान)', distanceKm: 0, highlight: 'वैकुंठगमन मंदिर प्रस्थान', riverOrPass: 'इंद्रायणी काठ', significance: 'जगद्गुरु तुकाराम महाराजांच्या पादुकांचे विठ्ठल भेटीसाठी भावपूर्ण प्रस्थान.' },
  { day: 2, location: 'आकुर्डी', distanceKm: 16, highlight: 'विठ्ठल मंदिर मुक्काम', significance: 'देहूरोड ते आकुर्डी वारकऱ्यांचे अखंड नामस्मरण.' },
  { day: 3, location: 'पुणे (निवडुंग्या विठ्ठल)', distanceKm: 34, highlight: 'पुणे शहर मुक्काम', significance: 'ज्ञानेश्वर महाराज व तुकाराम महाराज दोन्ही पालख्यांचे पुण्यात एकाच दिवशी दर्शन.' },
  { day: 5, location: 'लोणी काळभोर', distanceKm: 54, highlight: 'हवेली तालुका मुक्काम', riverOrPass: 'मुळा-मुठा खोरे', significance: 'पुण्याहून पूर्वेकडे कूच, वारकऱ्यांची अखंड ज्ञानोबा-तुकाराम भजन सेवा.' },
  { day: 6, location: 'यवत', distanceKm: 76, highlight: 'भैरवनाथ मंदिर मुक्काम', significance: 'ग्रामीण भक्तांकडून मोठ्या उत्साहाने अन्नदान.' },
  { day: 7, location: 'वरवंड', distanceKm: 94, highlight: 'नागेश्वर मंदिर मुक्काम', significance: 'तलावाकाठची शांत संध्याकाळ आणि कीर्तनाचा रंग.' },
  { day: 8, location: 'उंडवडी', distanceKm: 116, highlight: 'बारामती सीमा मुक्काम', significance: 'कष्टाळू शेतकऱ्यांचे माऊली-तुकोबांच्या चरणी समर्पण.' },
  { day: 9, location: 'बारामती', distanceKm: 136, highlight: 'शारदानगर मुक्काम', significance: 'अश्व धाव व गोल रिंगणाचा नेत्रदीपक सोहळा.' },
  { day: 10, location: 'सणसर', distanceKm: 156, highlight: 'बेलवंडी मुक्काम', significance: 'उसाच्या शेतामधून जाणारी भक्तीची पायवाट.' },
  { day: 11, location: 'अंथुर्णे', distanceKm: 172, highlight: 'इंदापूर मार्ग मुक्काम', significance: 'भक्तांचा मेळा आणि कीर्तनातील भाव समाधी.' },
  { day: 12, location: 'इंदापूर', distanceKm: 192, highlight: 'भव्य गोल रिंगण', significance: 'इंदापूरच्या ऐतिहासिक मैदानात तुकोबारायांच्या अश्वाचे प्रसिद्ध रिंगण.' },
  { day: 13, location: 'सराटी', distanceKm: 210, highlight: 'नीरा नदी पवित्र स्नान', riverOrPass: 'नीरा नदी घाट', significance: 'नीरा नदीच्या पावन पात्रात पादुकांचे स्नान आणि पायी परिक्रमा.' },
  { day: 14, location: 'अकलूज', distanceKm: 226, highlight: 'माने विद्यालय रिंगण', significance: 'माळशिरस तालुक्यात तुकाराम महाराज पालखीचे प्रचंड स्वागत.' },
  { day: 15, location: 'वाखरी', distanceKm: 244, highlight: 'उभे रिंगण व पालखी भेट', significance: 'सर्व संतांच्या पालख्या एकत्र येऊन पंढरीच्या वेशीवर विसावतात.' },
  { day: 16, location: 'पंढरपूर', distanceKm: 250, highlight: 'चंद्रभागा स्नान व दर्शन', riverOrPass: 'चंद्रभागा काठ', significance: 'विठ्ठल भेटीचा अवर्णनीय आनंद आणि वारीची पूर्णता.' }
];

export function WariInteractiveRoute() {
  const [selectedRoute, setSelectedRoute] = React.useState<'dnyaneshwar' | 'tukaram'>('dnyaneshwar');
  const [activeStopIndex, setActiveStopIndex] = React.useState(0);

  const stops = selectedRoute === 'dnyaneshwar' ? DNYANESHWAR_STOPS : TUKARAM_STOPS;
  const currentStop = stops[activeStopIndex] || stops[0];

  return (
    <div className="vitthalaya-card rounded p-6 sm:p-8 border border-[var(--dp-rule)]">
      {/* Header with Route Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--dp-rule)]">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] text-[var(--dp-gold)] text-xs font-marathi mb-2">
            <Footprints size={12} aria-hidden="true" />
            पवित्र पदभ्रमण नकाशा
          </span>
          <h2 className="vitthalaya-display text-2xl font-bold">
            आषाढी वारी पालखी मार्ग
          </h2>
          <p className="vitthalaya-prose text-xs text-[var(--dp-ink-dim)] mt-1">
            आळंदी व देहू ते पंढरपूर पर्यंतच्या २५० किमी पायी प्रवासाचे दिवसनिहाय मुक्काम व रिंगण दर्शन.
          </p>
        </div>

        {/* Route Selector Tabs */}
        <div className="flex items-center gap-2 p-1 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] shrink-0" role="tablist" aria-label="पालखी मार्ग निवडा">
          <button
            type="button"
            role="tab"
            aria-selected={selectedRoute === 'dnyaneshwar'}
            onClick={() => {
              setSelectedRoute('dnyaneshwar');
              setActiveStopIndex(0);
            }}
            className={`px-3 py-1.5 rounded text-xs font-marathi transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedRoute === 'dnyaneshwar'
                ? 'bg-[var(--dp-gold)]/20 text-[var(--dp-gold)] font-bold border border-[var(--dp-gold)]/30'
                : 'text-[var(--dp-muted)] hover:text-[var(--dp-ink)]'
            }`}
          >
            ज्ञानेश्वर माऊली (आळंदी)
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={selectedRoute === 'tukaram'}
            onClick={() => {
              setSelectedRoute('tukaram');
              setActiveStopIndex(0);
            }}
            className={`px-3 py-1.5 rounded text-xs font-marathi transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedRoute === 'tukaram'
                ? 'bg-[var(--dp-gold)]/20 text-[var(--dp-gold)] font-bold border border-[var(--dp-gold)]/30'
                : 'text-[var(--dp-muted)] hover:text-[var(--dp-ink)]'
            }`}
          >
            तुकाराम महाराज (देहू)
          </button>
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Scrollable Milestones Track */}
        <div className="md:col-span-5 space-y-2 max-h-[380px] overflow-y-auto pr-2 border-r border-[var(--dp-rule)]" aria-label="मुक्काम यादी">
          {stops.map((stop, idx) => {
            const isSelected = idx === activeStopIndex;
            return (
              <button
                key={`${stop.day}-${stop.location}`}
                type="button"
                onClick={() => setActiveStopIndex(idx)}
                className={`w-full text-left p-3 rounded transition-colors flex items-center justify-between border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed ${
                  isSelected
                    ? 'bg-[var(--dp-ground-well)] border-[var(--dp-gold)] text-[var(--dp-ink)]'
                    : 'border-transparent hover:border-[var(--dp-rule)] text-[var(--dp-ink-dim)]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-marathi shrink-0 ${
                    isSelected
                      ? 'bg-[var(--dp-gold)] text-[var(--dp-ground)]'
                      : 'bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] text-[var(--dp-muted)]'
                  }`}>
                    {stop.day}
                  </span>
                  <div className="min-w-0">
                    <p className={`font-marathi text-xs font-semibold truncate ${isSelected ? 'text-[var(--dp-gold)]' : ''}`}>
                      {stop.location}
                    </p>
                    <p className="text-[10px] text-[var(--dp-muted)] font-marathi truncate">
                      {stop.highlight}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] text-[var(--dp-muted)] font-marathi shrink-0 ml-2">
                  {stop.distanceKm} किमी
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Column: Detailed Stop Preview Card */}
        <div className="md:col-span-7 bg-[var(--dp-ground-well)] p-6 rounded border border-[var(--dp-rule)] space-y-4">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--dp-rule)]">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[var(--dp-gold)]/20 text-[var(--dp-gold)] border border-[var(--dp-gold)]/30 text-[10px] font-bold font-marathi">
                  दिवस {currentStop.day}
                </span>
                <span className="text-xs text-[var(--dp-muted)] font-marathi">
                  एकूण अंतर: {currentStop.distanceKm} किमी
                </span>
              </div>
              <h3 className="vitthalaya-display text-2xl font-bold mt-1 text-[var(--dp-ink)]">
                {currentStop.location}
              </h3>
            </div>

            {currentStop.riverOrPass && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--dp-ground)] border border-[var(--dp-rule)] text-xs text-[var(--dp-gold)] font-marathi shrink-0">
                <Waves size={12} aria-hidden="true" />
                {currentStop.riverOrPass}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-[var(--dp-gold)] font-marathi">
              विशेष महत्त्व व सोहळा:
            </h4>
            <p className="vitthalaya-prose text-xs sm:text-sm leading-relaxed text-[var(--dp-ink-dim)]">
              {currentStop.significance}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="pt-3 border-t border-[var(--dp-rule)]">
            <div className="flex items-center justify-between text-[11px] font-marathi text-[var(--dp-muted)] mb-1.5">
              <span>वारी प्रगती: {Math.round((currentStop.distanceKm / 250) * 100)}%</span>
              <span>पंढरपूर अंतर: {250 - currentStop.distanceKm} किमी शिल्लक</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--dp-ground)] overflow-hidden border border-[var(--dp-rule)]">
              <div
                className="h-full bg-[var(--dp-gold)]"
                style={{ width: `${Math.max(4, Math.round((currentStop.distanceKm / 250) * 100))}%` }}
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Link
              href="/wari"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--dp-gold)] hover:underline font-marathi focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px"
            >
              <span>संपूर्ण वारी मार्गदर्शिका पहा</span>
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
