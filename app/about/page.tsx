import { canonicalMetadata } from '@/src/lib/seo';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, ArrowRight, Compass, ShieldCheck, HeartHandshake, BookOpen, Network, Cpu } from 'lucide-react';
import '@/app/homepage.css';

export const metadata = {
  title: 'डिजिटल पंढरपूर : परिचय व ध्येय',
  description: 'डिजिटल पंढरपूर : मराठी भक्ती साहित्याचा वाढता डिजिटल संग्रह. वारकरी संप्रदायाचे साहित्य, संत, अभंग आणि परंपरा डिजिटल रूपात जतन करण्याचे आमचे उद्दिष्ट.',
  ...canonicalMetadata({ canonical: '/about' }),
};

const FEATURES = [
  {
    icon: Compass,
    title: 'शोध व संकलन',
    titleEn: 'Search & Discovery',
    desc: 'देवनागरी आणि इंग्रजी ट्रान्स्लिटरेशनमध्ये तात्काळ शोध. अभंग, भजन, आरत्या, स्तोत्रे आणि संत साहित्य सहज उपलब्ध.',
  },
  {
    icon: BookOpen,
    title: 'अमृततुल्य वाचन अनुभव',
    titleEn: 'Reading Experience',
    desc: 'विश्रामदायी वाचन मोड, भावार्थ, ऑडियो पठण, बुकमार्क आणि सुविचार कार्ड निर्मिती एकाच ठिकाणी.',
  },
  {
    icon: HeartHandshake,
    title: 'वारकरी समुदाय',
    titleEn: 'Community Collaboration',
    desc: 'सुधारणा सूचना, आवृत्ती इतिहास आणि वारकरी अभ्यासकांचे सामूहिक संपादन योगदान.',
  },
  {
    icon: ShieldCheck,
    title: 'प्रमाणित ग्रंथ भांडार',
    titleEn: 'Sacred Publications',
    desc: 'छापील ग्रंथ, पॉकेट गाथा आणि संग्राहक आवृत्त्या : भक्ती साहित्य प्रत्यक्ष ग्रंथरूपात उपलब्ध.',
  },
  {
    icon: Network,
    title: 'भक्ती ज्ञान नकाशा',
    titleEn: 'Knowledge Graph',
    desc: 'संत, आराध्य दैवते, तीर्थक्षेत्रे आणि रचना यांच्या परस्परसंबंधांचे ऐतिहासिक ज्ञान दर्शन.',
  },
  {
    icon: Cpu,
    title: 'कृत्रिम बुद्धिमत्ता समृद्धी',
    titleEn: 'AI Context & Meaning',
    desc: 'अमृततुल्य अभंगांचे भाषांतर, गूढ आध्यात्मिक भावार्थ आणि व्याकरण संदर्भांचे विश्लेषण.',
  },
];

const TECH_STACK = [
  { name: 'Next.js 14', role: 'App Router, Server Components' },
  { name: 'React', role: 'Responsive UI Architecture' },
  { name: 'TypeScript', role: 'End-to-End Type Safety' },
  { name: 'Prisma SQLite', role: 'Structured Devotional Storage' },
  { name: 'Three.js', role: 'Interactive 3D Manuscript Viewer' },
  { name: 'Tailwind CSS', role: 'Hallmark Devotional Token System' },
];

export default function AboutPage() {
  return (
    <div className="vitthalaya-shell min-h-screen py-10">
      <div className="vitthalaya-container max-w-4xl">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6" aria-label="ब्रेडक्रंब">
          <ol className="flex items-center gap-2 text-xs font-marathi text-[var(--dp-muted)]">
            <li>
              <Link href="/" className="hover:text-[var(--dp-gold)] transition-colors">
                मुख्यपृष्ठ
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li className="text-[var(--dp-ink)]">परिचय व ध्येय</li>
          </ol>
        </nav>

        {/* Hero Header */}
        <header className="mb-12 text-center max-w-3xl mx-auto">
          <p className="text-xs text-[var(--dp-gold)] font-marathi mb-2">
            ज्ञानोबा तुकाराम परंपरा
          </p>
          <h1 className="vitthalaya-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
            डिजिटल पंढरपूर : आमचे ध्येय व संकल्प
          </h1>
          <p className="vitthalaya-prose text-sm sm:text-base text-[var(--dp-ink-dim)] leading-relaxed mb-6">
            महाराष्ट्राच्या आठ शतकांच्या वारकरी भक्ती संपदेचे, संत साहित्याचे आणि पंढरपूर वारी परंपरेचे अधिकृत डिजिटल संकलन.
          </p>
        </header>

        {/* Mission Section */}
        <section className="vitthalaya-card rounded p-6 sm:p-8 mb-12 border border-[var(--dp-rule)]" aria-labelledby="mission-heading">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-4">
              <h2 id="mission-heading" className="vitthalaya-display text-2xl font-bold">
                अखंड भक्ती परंपरेचे जतन
              </h2>
              <div className="vitthalaya-prose text-sm space-y-3 leading-relaxed">
                <p>
                  डिजिटल पंढरपूर हा वारकरी संप्रदायातील समृद्ध संत साहित्याचा डिजिटल संग्रह आहे. हजारो वर्षांचे भक्ती साहित्य, अभंग, भजन, गौळणी, आरत्या आणि स्तोत्रे पुढील पिढ्यांसाठी विनामूल्य व शुद्ध स्वरूपात जतन करणे हे आमचे उद्दिष्ट आहे.
                </p>
                <p>
                  हा उपक्रम निव्वळ तांत्रिक नसून एक सांस्कृतिक आणि आध्यात्मिक सेवा आहे. प्रत्येक डिझाइन आणि तांत्रिक निर्णय प्रामाणिकता आणि सांस्कृतिक पवित्रतेला सर्वोच्च प्राधान्य देतो.
                </p>
                <p className="text-xs font-semibold text-[var(--dp-gold)] pt-1">
                  विठ्ठलाच्या चरणी सादर : आमची निष्ठा आणि सेवा.
                </p>
              </div>
            </div>
            <div className="md:col-span-5 relative aspect-[4/3] rounded overflow-hidden border border-[var(--dp-rule)]">
              <Image
                src="/images/realistic/pandharpur-temple.jpg"
                alt="पंढरपूर श्री विठ्ठल रुक्मिणी मंदिर शिखर"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--dp-ground)] via-transparent to-transparent opacity-60" />
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="mb-12" aria-labelledby="features-heading">
          <h2 id="features-heading" className="vitthalaya-display text-xl font-bold mb-6 pb-2 border-b border-[var(--dp-rule)]">
            व्यासपीठाची प्रमुख वैशिष्ट्ये
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="vitthalaya-card rounded p-5 border border-[var(--dp-rule)] hover:border-[var(--dp-gold)] transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] flex items-center justify-center text-[var(--dp-gold)] shrink-0">
                      <Icon size={16} aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="vitthalaya-display text-base font-bold text-[var(--dp-ink)]">
                        {f.title}
                      </h3>
                      <p className="text-[10px] text-[var(--dp-muted)] font-marathi">
                        {f.titleEn}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--dp-ink-dim)] font-marathi leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tech Stack */}
        <section className="vitthalaya-card rounded p-6 sm:p-8 mb-12 border border-[var(--dp-rule)]" aria-labelledby="tech-heading">
          <h2 id="tech-heading" className="vitthalaya-display text-xl font-bold mb-4 pb-2 border-b border-[var(--dp-rule)]">
            आधुनिक तंत्रज्ञान व वास्तुकला
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-marathi">
            {TECH_STACK.map((t) => (
              <div key={t.name} className="flex items-center justify-between p-3 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)]">
                <span className="font-semibold text-[var(--dp-gold)] font-mono">{t.name}</span>
                <span className="text-[var(--dp-muted)]">{t.role}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Community & Contributing */}
        <section className="vitthalaya-card rounded p-6 sm:p-8 mb-12 border border-[var(--dp-rule)]" aria-labelledby="community-heading">
          <h2 id="community-heading" className="vitthalaya-display text-xl font-bold mb-3 pb-2 border-b border-[var(--dp-rule)]">
            वारकरी समुदाय व सहभाग
          </h2>
          <p className="text-xs text-[var(--dp-ink-dim)] font-marathi leading-relaxed mb-4">
            हा संग्रह वारकरी अभ्यासक आणि भक्तांच्या सहकार्याने वृद्धिंगत होत आहे. आपण खालीलप्रमाणे योगदान देऊ शकता:
          </p>
          <ul className="space-y-2 text-xs font-marathi text-[var(--dp-ink)] list-disc pl-5">
            <li>रचनांमधील अक्षरांची व पाठभेदांची दुरुस्ती सुचवणे</li>
            <li>दुर्मीळ अप्रकाशित अभंग आणि गाथा संकलित करणे</li>
            <li>संतांच्या जीवनचरित्रातील ऐतिहासिक नोंदी समृद्ध करणे</li>
            <li>पारंपारिक वारकरी कीर्तन व भजनांचे ऑडिओ योगदान देणे</li>
          </ul>
        </section>

        {/* CTA */}
        <div className="text-center py-6">
          <Link
            href="/explore"
            className="vitthalaya-btn-primary text-sm inline-flex items-center gap-2"
          >
            <span>साहित्य अन्वेषण सुरू करा</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
