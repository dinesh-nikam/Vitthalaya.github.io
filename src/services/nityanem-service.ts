import { db } from '../db/client';

export type ProharId = 'KAKAD_AARTI' | 'HARIPATH' | 'GAULANI' | 'DHUPARTI' | 'SHEJARTI';

export interface ProharDefinition {
  id: ProharId;
  titleMarathi: string;
  subtitleMarathi: string;
  timeRange: string;
  startHour: number; // 0-23 in IST
  endHour: number;   // 0-23 in IST
  description: string;
  recommendedTypes: string[];
  searchKeywords: string[];
  icon: string;
  suggestedTheka: string;
  suggestedBpm: number;
}

export interface TaalDefinition {
  id: string;
  nameMarathi: string;
  beatsCount: number;
  division: string;
  bol: string[];
  mridangaPattern: ('dhum' | 'taap' | 'both' | 'rest')[];
  cymbalsPattern: ('chipli' | 'rest')[];
  defaultBpm: number;
  description: string;
}

export const PROHAR_DEFINITIONS: Record<ProharId, ProharDefinition> = {
  KAKAD_AARTI: {
    id: 'KAKAD_AARTI',
    titleMarathi: 'प्रातःकाल : काकड आरती व भूपाळी',
    subtitleMarathi: 'पहाटेची मंगल साधना (०४:०० ते ०७:००)',
    timeRange: '०४:०० - ०७:००',
    startHour: 4,
    endHour: 7,
    description: 'पहाटे विठ्ठल-रुक्मिणीची काकड आरती, जागृत भूपाळ्या आणि ज्ञानोबा-तुकाराम माऊलींचे नमन.',
    recommendedTypes: ['AARTI', 'ABHANG'],
    searchKeywords: ['काकड', 'भूपाळी', 'उठा'],
    icon: 'Sun',
    suggestedTheka: 'bhajani',
    suggestedBpm: 75,
  },
  HARIPATH: {
    id: 'HARIPATH',
    titleMarathi: 'सकाळ : हरिपाठ व नामस्मरण',
    subtitleMarathi: 'दैनिक अखंड नामसाधना (०७:०० ते १२:००)',
    timeRange: '०७:०० - १२:००',
    startHour: 7,
    endHour: 12,
    description: 'श्री ज्ञानेश्वर महाराज व संत तुकाराम महाराजांचा नित्य हरिपाठ आणि विठ्ठल नामाचा गजर.',
    recommendedTypes: ['HARIPATH', 'ABHANG'],
    searchKeywords: ['हरिपाठ', 'नाम', 'स्मरण'],
    icon: 'BookOpen',
    suggestedTheka: 'bhajani',
    suggestedBpm: 90,
  },
  GAULANI: {
    id: 'GAULANI',
    titleMarathi: 'दुपार : गावळणी, रूपक व भजन',
    subtitleMarathi: 'गोपाळकृष्ण लीला व संतांचे उपदेश (१२:०० ते १६:००)',
    timeRange: '१२:०० - १६:००',
    startHour: 12,
    endHour: 16,
    description: 'माखनचोरी, यमुनातटावरील कृष्णलीला आणि संतांच्या रूपक अभंगांचे मधुर चिंतन.',
    recommendedTypes: ['BHAJAN', 'ABHANG'],
    searchKeywords: ['गवळण', 'गोपाळ', 'कान्हा', 'मुरली'],
    icon: 'Music',
    suggestedTheka: 'dadra',
    suggestedBpm: 105,
  },
  DHUPARTI: {
    id: 'DHUPARTI',
    titleMarathi: 'सायंकाळ : सांजवात व धुपारती',
    subtitleMarathi: 'संध्यासमयीची दीपपूजा व पंचपदी (१६:०० ते २०:००)',
    timeRange: '१६:०० - २०:००',
    startHour: 16,
    endHour: 20,
    description: 'सायंकालीन धुपारती, पंचपदी आणि संतांच्या स्तुतीपर स्तवनांचा पवित्र नाद.',
    recommendedTypes: ['AARTI', 'STOTRA', 'ABHANG'],
    searchKeywords: ['धूप', 'आरती', 'पंचपदी', 'सांज'],
    icon: 'Flame',
    suggestedTheka: 'roopak',
    suggestedBpm: 80,
  },
  SHEJARTI: {
    id: 'SHEJARTI',
    titleMarathi: 'रात्री : शेजारती व करुणाष्टके',
    subtitleMarathi: 'विश्रांती, हरिजागर व शांत ध्यान (२०:०० ते ०४:००)',
    timeRange: '२०:०० - ०४:००',
    startHour: 20,
    endHour: 4,
    description: 'श्रीविठ्ठलाची निद्रासमयीची करुणाष्टके, शेजारती व शांत आत्मचिंतन.',
    recommendedTypes: ['AARTI', 'ABHANG'],
    searchKeywords: ['शेज', 'करुणाष्टक', 'विश्रांती', 'प्रार्थना'],
    icon: 'Moon',
    suggestedTheka: 'bhajani',
    suggestedBpm: 68,
  },
};

export const VARKARI_TAALS: TaalDefinition[] = [
  {
    id: 'bhajani',
    nameMarathi: 'भजनी केरवा (८ मात्रा)',
    beatsCount: 8,
    division: '४ + ४',
    bol: ['धा', 'धिं', 'ना', 'क', 'तिं', 'ना', 'क', 'धी'],
    mridangaPattern: ['both', 'dhum', 'taap', 'rest', 'taap', 'taap', 'rest', 'both'],
    cymbalsPattern: ['chipli', 'rest', 'chipli', 'rest', 'chipli', 'rest', 'chipli', 'rest'],
    defaultBpm: 88,
    description: 'वारकरी भजने आणि हरिपाठात सर्वात जास्त वाजवला जाणारा लयबद्ध ठेका.',
  },
  {
    id: 'roopak',
    nameMarathi: 'रूपक ताल (७ मात्रा)',
    beatsCount: 7,
    division: '३ + २ + २',
    bol: ['ती', 'ती', 'ना', 'धी', 'ना', 'धी', 'ना'],
    mridangaPattern: ['taap', 'taap', 'rest', 'dhum', 'taap', 'both', 'taap'],
    cymbalsPattern: ['chipli', 'chipli', 'rest', 'chipli', 'rest', 'chipli', 'rest'],
    defaultBpm: 76,
    description: 'भावपूर्ण व ध्यानस्थ अभंगांसाठी वारकरी कीर्तनात प्रामुख्याने वापरला जातो.',
  },
  {
    id: 'dadra',
    nameMarathi: 'दादरा ताल (६ मात्रा)',
    beatsCount: 6,
    division: '३ + ३',
    bol: ['धा', 'धी', 'ना', 'धा', 'ती', 'ना'],
    mridangaPattern: ['both', 'dhum', 'taap', 'both', 'taap', 'taap'],
    cymbalsPattern: ['chipli', 'rest', 'chipli', 'chipli', 'rest', 'chipli'],
    defaultBpm: 108,
    description: 'गावळणी, बाललीला व आनंदी भजनांसाठी वेगवान व उल्हासित ठेका.',
  },
  {
    id: 'drut',
    nameMarathi: 'द्रुत कीर्तन गजर (४ मात्रा)',
    beatsCount: 4,
    division: '२ + २',
    bol: ['धा', 'गे', 'ना', 'ती'],
    mridangaPattern: ['both', 'dhum', 'taap', 'both'],
    cymbalsPattern: ['chipli', 'chipli', 'chipli', 'chipli'],
    defaultBpm: 130,
    description: 'कीर्तनाच्या कळसाच्या वेळी टाळ-मृदंगाच्या उत्तुंग गजरासाठी द्रुत लय.',
  },
];

/**
 * Returns the current hour in Indian Standard Time (UTC+5:30)
 */
export function getCurrentISTHour(date = new Date()): number {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 5.5 * 3600000);
  return istDate.getHours();
}

/**
 * Resolves the traditional Prohar based on an IST hour (0-23)
 */
export function resolveProharIdByHour(istHour: number): ProharId {
  if (istHour >= 4 && istHour < 7) {
    return 'KAKAD_AARTI';
  }
  if (istHour >= 7 && istHour < 12) {
    return 'HARIPATH';
  }
  if (istHour >= 12 && istHour < 16) {
    return 'GAULANI';
  }
  if (istHour >= 16 && istHour < 20) {
    return 'DHUPARTI';
  }
  return 'SHEJARTI';
}

export interface NityanemCompositionItem {
  id: string;
  slug: string;
  titleMarathi: string;
  titleTranslit: string;
  type: string;
  fullText: string;
  meaning: string | null;
  saint: {
    nameMarathi: string;
    slug: string;
  } | null;
}

export interface WariStopSevaItem {
  id: string;
  nameMarathi: string;
  distanceKm: number;
  sortOrder: number;
  significance: string | null;
  recommendedAbhangSlug?: string;
  recommendedAbhangTitle?: string;
}

export interface NityanemPayload {
  activeProhar: ProharDefinition;
  istHour: number;
  allProhars: ProharDefinition[];
  compositions: NityanemCompositionItem[];
  taals: TaalDefinition[];
  wariStops: WariStopSevaItem[];
}

/**
 * Service orchestrator fetching authentic Nityanem compositions and Wari linkages
 */
export async function getNityanemData(
  requestedProharId?: string | null,
  limit = 8
): Promise<NityanemPayload> {
  const istHour = getCurrentISTHour();
  const validProharId =
    requestedProharId && requestedProharId in PROHAR_DEFINITIONS
      ? (requestedProharId as ProharId)
      : resolveProharIdByHour(istHour);

  const activeProhar = PROHAR_DEFINITIONS[validProharId];

  // 1. Fetch compositions matching active prohar types and keywords
  const conditions: any[] = [];

  // Match by composition type
  if (activeProhar.recommendedTypes.length > 0) {
    conditions.push({
      type: { in: activeProhar.recommendedTypes },
    });
  }

  // Match by title or fullText keywords
  for (const kw of activeProhar.searchKeywords) {
    conditions.push({
      titleMarathi: { contains: kw },
    });
    conditions.push({
      fullText: { contains: kw },
    });
  }

  const compositionsRaw = await db.composition.findMany({
    where: {
      OR: conditions,
    },
    select: {
      id: true,
      slug: true,
      titleMarathi: true,
      titleTranslit: true,
      type: true,
      fullText: true,
      meaning: true,
      saint: {
        select: {
          nameMarathi: true,
          slug: true,
        },
      },
    },
    orderBy: [
      { reviewed: 'desc' },
      { id: 'asc' },
    ],
    take: limit,
  });

  // 2. Fetch Wari stops
  const rawStops = await db.wariStop.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      nameMarathi: true,
      distanceKm: true,
      sortOrder: true,
      description: true,
    },
  });

  const wariStops: WariStopSevaItem[] = rawStops.map((s) => ({
    id: s.id,
    nameMarathi: s.nameMarathi,
    distanceKm: s.distanceKm,
    sortOrder: s.sortOrder,
    significance: s.description,
  }));

  return {
    activeProhar,
    istHour,
    allProhars: Object.values(PROHAR_DEFINITIONS),
    compositions: compositionsRaw,
    taals: VARKARI_TAALS,
    wariStops,
  };
}
