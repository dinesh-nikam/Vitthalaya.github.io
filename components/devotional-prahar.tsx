'use client';

import * as React from 'react';
import Link from 'next/link';
import { Sun, Moon, Sunset, Sunrise, BookOpen, ArrowRight } from 'lucide-react';
import { TanpuraDrone } from './tanpura-drone';

interface PraharInfo {
  name: string;
  timeRange: string;
  tagline: string;
  verseMarathi: string;
  slug: string;
  actionLabel: string;
  icon: typeof Sunrise;
}

function getCurrentPrahar(hour: number): PraharInfo {
  if (hour >= 4 && hour < 8) {
    return {
      name: 'काकड आरती व प्रभात भक्ती',
      timeRange: 'पहाटे ०४:०० ते सकाळी ०८:००',
      tagline: 'प्रभात समयीं मंगल नामस्मरण आणि भूपाळीचा पावन प्रहर',
      verseMarathi: 'उठा पांडुरंगा आता प्रभात समयो पातला ।\nवैष्णवांचा मेळा गरुडपारीं दाटला ॥',
      slug: '/search?type=aarti',
      actionLabel: 'काकड आरत्या पहा',
      icon: Sunrise,
    };
  }
  if (hour >= 8 && hour < 12) {
    return {
      name: 'सकाळ महापूजा व नैवेद्य प्रहर',
      timeRange: 'सकाळी ०८:०० ते दुपारी १२:००',
      tagline: 'श्री विठ्ठलाचे मनोहर स्वरूप आणि नित्य दर्शन',
      verseMarathi: 'सुंदर ते ध्यान उभे विटेवरी ।\nकर कटावरी ठेवोनिया ॥\nतुळशी हार गळां कासे पितांबर ।\nआवडें निरंतर हेंचि रूप ॥',
      slug: '/search?q=सुंदर+ते+ध्यान',
      actionLabel: 'संपूर्ण अभंग पहा',
      icon: Sun,
    };
  }
  if (hour >= 12 && hour < 17) {
    return {
      name: 'दुपार गाथा पारायण व चिंतन',
      timeRange: 'दुपारी १२:०० ते सायंकाळी ०५:००',
      tagline: 'ज्ञानेश्वरी व संत तुकाराम गाथेचे शांत पारायण',
      verseMarathi: 'जे का रंजले गांजले ।\nत्यांसी म्हणे जो आपुले ॥\nतोचि साधू ओळखावा ।\nदेव तेथेचि जाणावा ॥',
      slug: '/books',
      actionLabel: 'पवित्र ग्रंथ वाचा',
      icon: BookOpen,
    };
  }
  if (hour >= 17 && hour < 21) {
    return {
      name: 'संध्या महाआरती व कीर्तन प्रहर',
      timeRange: 'सायंकाळी ०५:०० ते रात्री ०९:००',
      tagline: 'दीप प्रज्वलन, धूप आरती आणि टाळ-मृदंगाचा गजर',
      verseMarathi: 'येई हो विठ्ठले माझे माऊली ये ।\nनिढळावरी कर ठेवूनि वाट मी पाहें ॥\nआळविल्याविण कोणास ठावी अंतरीची व्यथा ।\nप्रेमळ भक्तांचे काज सारिसी सर्वथा ॥',
      slug: '/search?type=aarti',
      actionLabel: 'संध्या आरत्या ऐका',
      icon: Sunset,
    };
  }
  return {
    name: 'शेजारती व शांत निद्रा प्रहर',
    timeRange: 'रात्री ०९:०० ते पहाटे ०४:००',
    tagline: 'परमात्म्याच्या चरणी संपूर्ण समर्पण व विश्रांती',
    verseMarathi: 'घालीन लोटांगण वंदिन चरण ।\nडोळ्यांनी पाहीन रूप तुझें ॥\nप्रेमें आलिंगन आनंदे पूजिन ।\nभावें ओवाळिन म्हणे नामा ॥',
    slug: '/abhang/ghalin-lotangan',
    actionLabel: 'शेजारती अभंग पहा',
    icon: Moon,
  };
}

export function DevotionalPrahar() {
  const [prahar, setPrahar] = React.useState<PraharInfo>(() => getCurrentPrahar(new Date().getHours()));

  React.useEffect(() => {
    const update = () => {
      setPrahar(getCurrentPrahar(new Date().getHours()));
    };
    const interval = setInterval(update, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const Icon = prahar.icon;

  return (
    <div className="vitthalaya-card rounded p-6 sm:p-8 border border-[var(--dp-rule)] mb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--dp-rule)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--dp-ground-well)] border border-[var(--dp-gold)] flex items-center justify-center text-[var(--dp-gold)] shrink-0">
            <Icon size={18} aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--dp-gold)] font-marathi font-semibold">
                सध्याचा मंदिर प्रहर
              </span>
              <span className="text-[10px] text-[var(--dp-muted)] font-marathi">
                ({prahar.timeRange})
              </span>
            </div>
            <h3 className="vitthalaya-display text-xl font-bold mt-0.5">
              {prahar.name}
            </h3>
          </div>
        </div>

        <div className="shrink-0">
          <TanpuraDrone />
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-8 bg-[var(--dp-ground-well)] p-5 rounded border border-[var(--dp-rule)]">
          <p className="text-xs text-[var(--dp-muted)] font-marathi mb-2">
            {prahar.tagline}
          </p>
          <p className="vitthalaya-display text-base sm:text-lg leading-relaxed text-[var(--dp-ink)] whitespace-pre-line font-medium">
            {prahar.verseMarathi}
          </p>
        </div>

        <div className="md:col-span-4 flex flex-col justify-center space-y-3">
          <p className="text-xs text-[var(--dp-ink-dim)] font-marathi leading-relaxed">
            या पावन प्रहरातील उपासना, नामस्मरण आणि संबंधित भक्ती साहित्याचे वाचन करा.
          </p>
          <div>
            <Link
              href={prahar.slug}
              className="vitthalaya-btn-primary text-xs inline-flex items-center gap-1.5 active:translate-y-px"
            >
              <span>{prahar.actionLabel}</span>
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
