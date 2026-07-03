import { canonicalMetadata } from '@/src/lib/seo';
import Link from 'next/link';

export const metadata = {
  title: 'डिजिटल पंढरपूरबद्दल — About Digital Pandharpur',
  description: 'डिजिटल पंढरपूर — मराठी भक्ती साहित्याचा वाढता डिजिटल संग्रह. वारकरी संप्रदायाचे साहित्य, संत, अभंग आणि परंपरा डिजिटल रूपात सुरक्षित करण्याचे आमचे ध्येय.',
  ...canonicalMetadata({ canonical: '/about' }),
};

const FEATURES = [
  {
    title: 'शोध व संकलन',
    titleEn: 'Search & Discovery',
    desc: 'Meilisearch द्वारे देवनागरी आणि ट्रान्स्लिटरेशनमध्ये तात्काळ शोध. अभंग, भजन, आरत्या, स्तोत्रे आणि संत साहित्य शोधा.',
  },
  {
    title: 'वाचन अनुभव',
    titleEn: 'Reading Experience',
    desc: 'वाचन मोड, अर्थ, ऑडियो एम्बेड, बुकमार्क आणि क्वोट कार्ड निर्मिती — सर्व एका ठिकाणी.',
  },
  {
    title: 'समुदाय',
    titleEn: 'Community',
    desc: 'सुधारणा सूचना, आवृत्ती इतिहास, लीडरबोर्ड आणि सामूहिक योगदान — वारकरी समुदायासोबत एकत्र.',
  },
  {
    title: 'पुस्तक व्यवसाय',
    titleEn: 'Book Commerce',
    desc: 'छापील प्रती, कॉफी टेबल बुक्स आणि भेट वस्तू — भक्ती साहित्य भौतिक रूपात उपलब्ध.',
  },
  {
    title: 'ज्ञान ग्राफ',
    titleEn: 'Knowledge Graph',
    desc: 'संत, देवता, उत्सव आणि रचना यांच्या दुव्यांचे संबंध शोधा — एक अंतर्दृष्टीपूर्ण नकाशा.',
  },
  {
    title: 'AI समृद्धी',
    titleEn: 'AI Enrichment',
    desc: 'स्वतंत्र LLM प्रदात्द्वारे (Groq, Gemini, Ollama) अर्थ, व्याख्या आणि संदर्भ समृद्ध करा.',
  },
];

const TECH_STACK = [
  { name: 'Next.js 15', role: 'App Router, Server Components, Streaming' },
  { name: 'React 19', role: 'UI Framework' },
  { name: 'TypeScript', role: 'Type Safety' },
  { name: 'Prisma', role: 'ORM (CockroachDB/PostgreSQL)' },
  { name: 'Meilisearch', role: 'Full-Text Search' },
  { name: 'Tailwind CSS', role: 'Design System' },
  { name: 'next-auth', role: 'Authentication' },
];

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="ब्रेडक्रंब">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li><Link href="/" className="hover:text-saffron">मुख्यपृष्ठ</Link></li>
          <li aria-hidden="true">›</li>
          <li className="text-foreground">बद्दल</li>
        </ol>
      </nav>

      {/* Hero */}
      <header className="mb-12 text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-marathiHeading text-maroon dark:text-saffron font-bold">
          डिजिटल पंढरपूरबद्दल 🙏
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          मराठी भक्ती साहित्याचा वाढता डिजिटल संग्रह — अभंग, भजन, गौळणी, आरत्या, स्तोत्रे आणि संत साहित्य एका ठिकाणी.
        </p>
      </header>

      {/* Mission */}
      <section className="mb-12 bg-card rounded-2xl p-8 border border-saffron/10">
        <h2 className="text-2xl font-marathiHeading text-maroon dark:text-saffron font-bold mb-4">
          आमचे ध्येय
        </h2>
        <div className="space-y-4 text-foreground/80 leading-relaxed">
          <p>
            डिजिटल पंढरपूर हा महाराष्ट्राच्या वारकरी संप्रदायाच्या समृद्ध साहित्यिक संपदेचा डिजिटल संग्रह आहे.
            आमचे ध्येय म्हणजे हजारो वर्षांचे भक्ती साहित्य — अभंग, भजन, गौळणी, आरत्या आणि स्तोत्रे —
            डिजिटल रूपात सुरक्षित करणे आणि सर्वांना सुलभ करणे.
          </p>
          <p>
            हा प्लॅटफॉर्म केवळ व्यावसायिक नाही — हा एक सांस्कृतिक आणि आध्यात्मिक उपक्रम आहे.
            प्रत्येक डिझाइन निर्णय पवित्रता, प्रामाणिकता आणि सांस्कृतिक अधिकारप्राप्तीला प्राधान्य देतो.
          </p>
          <p className="font-medium text-saffron dark:text-saffron-400">
            "विठ्ठलाच्या चरणी अर्पण" — ही आमची प्रेरणा आणि दिशा आहे.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mb-12">
        <h2 className="text-2xl font-marathiHeading text-maroon dark:text-saffron font-bold mb-6">
          प्रमुख वैशिष्ट्ये
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-card rounded-xl p-6 border border-saffron/10 hover:border-saffron/30 transition-colors">
              <h3 className="text-lg font-marathiHeading font-bold text-foreground mb-1">{f.title}</h3>
              <p className="text-xs text-muted-foreground mb-2">{f.titleEn}</p>
              <p className="text-sm text-foreground/70 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="mb-12 bg-card rounded-2xl p-8 border border-saffron/10">
        <h2 className="text-2xl font-marathiHeading text-maroon dark:text-saffron font-bold mb-6">
          तंत्रज्ञान स्टॅक
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TECH_STACK.map((t) => (
            <div key={t.name} className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
              <span className="text-saffron font-mono text-sm font-bold mt-0.5">{t.name}</span>
              <span className="text-sm text-muted-foreground">{t.role}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Community & Contributing */}
      <section className="mb-12">
        <h2 className="text-2xl font-marathiHeading text-maroon dark:text-saffron font-bold mb-4">
          समुदाय आणि योगदान
        </h2>
        <div className="space-y-4 text-foreground/80 leading-relaxed">
          <p>
            डिजिटल पंढरपूर समुदायावर आधारित आहे. तुम्ही खालील मार्गांनी योगदान करू शकता:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>रचनांमधील चुका दुरुस्त करा (सुधारणा सूचना)</li>
            <li>नवीन साहित्य समाविष्ट करा</li>
            <li>संतांच्या चरित्रांची माहिती भरा</li>
            <li>ऑडियो रेकॉर्डिंग आणि सामग्री दान करा</li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-8">
        <Link
          href="/explore"
          className="inline-block bg-saffron text-white font-medium py-3 px-8 rounded-full hover:bg-saffron/90 transition-colors"
        >
          आत्ताच अन्वेषण करा →
        </Link>
      </section>
    </div>
  );
}
