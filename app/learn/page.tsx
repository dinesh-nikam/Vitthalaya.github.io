import { db } from '@/src/db/client';
import { LearnClient, type LearnConcept, type LearnSaint, type LearnTradition } from './learn-client';

export const metadata = {
  title: 'शिका — भक्ती चळवळीचा इतिहास | डिजिटल पंढरपूर',
  description: 'महाराष्ट्राच्या वारकरी संप्रदायाचा इतिहास, परंपरा, संकल्पना आणि संत साहित्य याबद्दल सखोल माहिती मिळवा.',
};

// Devanagari digits → Arabic for chronological ordering.
const DEVANAGARI_DIGITS: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

function centuryToNumber(period: string | null): number {
  if (!period) return 0;
  let arabic = '';
  for (const ch of period) {
    if (DEVANAGARI_DIGITS[ch]) arabic += DEVANAGARI_DIGITS[ch];
    else if (ch >= '0' && ch <= '9') arabic += ch;
  }
  return arabic ? parseInt(arabic, 10) : 0;
}

// Concept → real example compositions found by keyword in the corpus.
const CONCEPT_KEYWORDS: Array<{ keyword: string }> = [
  { keyword: 'नामस्मरण' },
  { keyword: 'समर्पण' },
  { keyword: 'समता' },
  { keyword: 'अद्वैत' },
];

export default async function LearnPage() {
  // ─── Timeline: real saints from the database ──────────────────────────
  const saints = await db.saint.findMany({
    select: {
      nameMarathi: true,
      nameTranslit: true,
      slug: true,
      period: true,
      biography: true,
      _count: { select: { compositions: true } },
    },
  });
  const timeline: LearnSaint[] = saints
    .map((s) => ({
      century: s.period ?? '',
      saint: s.nameMarathi,
      detail: s.biography ?? '',
      slug: s.slug,
      compositionCount: s._count.compositions,
    }))
    .sort((a, b) => centuryToNumber(a.century) - centuryToNumber(b.century));

  // ─── Traditions: real composition-type counts with search links ──────
  const byType = await db.composition.groupBy({
    by: ['type'],
    _count: { _all: true },
  });
  const countFor = (type: string): number =>
    byType.find((g) => g.type === type)?._count._all ?? 0;

  const traditions: LearnTradition[] = [
    { title: 'अभंग', desc: 'संत तुकाराम, ज्ञानेश्वर, नामदेव आणि इतर संतांचे अभंग — वारकरी संप्रदायाचा गाभा.', count: countFor('ABHANG'), searchQuery: 'अभंग' },
    { title: 'हरिपाठ पठण', desc: 'संत ज्ञानेश्वरांनी रचलेला हरिपाठ हा नित्यनियमाने म्हटला जाणारा नामस्मरणाचा पाया आहे.', count: countFor('HARIPATH'), searchQuery: 'हरिपाठ' },
    { title: 'आरती', desc: 'विठ्ठल आणि देवतांच्या आरती — संध्याकाळच्या उपासनेचा अविभाज्य भाग.', count: countFor('AARTI'), searchQuery: 'आरती' },
    { title: 'भजन', desc: 'भजन, गवळण आणि इतर भक्तिगीते — विठ्ठलाच्या नामाचा गजर.', count: countFor('BHAJAN'), searchQuery: 'भजन' },
  ].filter((t) => t.count > 0);

  // ─── Concepts: editorial definition + real example compositions ──────
  const concepts: LearnConcept[] = [];
  for (const { keyword } of CONCEPT_KEYWORDS) {
    const examples = await db.composition.findMany({
      where: { fullText: { contains: keyword } },
      select: { id: true, titleMarathi: true, titleTranslit: true, slug: true },
      take: 3,
    });
    concepts.push({
      keyword,
      exampleCount: examples.length,
      examples: examples.map((e) => ({
        title: e.titleMarathi,
        slug: e.slug,
      })),
    });
  }

  const stats = [
    { label: 'संत', value: String(saints.length) },
    { label: 'रचना', value: String(byType.reduce((sum, g) => sum + g._count._all, 0)) },
  ];

  return (
    <LearnClient
      timeline={timeline}
      traditions={traditions}
      concepts={concepts}
      stats={stats}
    />
  );
}
