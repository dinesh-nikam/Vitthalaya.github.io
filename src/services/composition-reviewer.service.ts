/**
 * Digital Pandharpur — Composition Reviewer & Quality Auditor Service
 *
 * Automatically inspects compositions and daily features to detect and resolve:
 * 1. STORY_IN_ABHANG: Prose explanations/stories stored or presented as abhang verses.
 * 2. EMBEDDED_MEANING: Full text containing inline 'अर्थ:' or 'भावार्थ:' explanations.
 * 3. GENERIC_SCRAPER_TITLE: Generic scraper titles (e.g. 'संत एकनाथ गाथा अभंग क्रमांक ८२',
 *    'अभंग क्र. २७') instead of canonical first-line titles (ध्रुवपद).
 * 4. MISALIGNED_REFERENCE: Discrepancies between title/mudrika and saint attribution.
 * 5. DAILY_FEATURE_MISCONFIGURED: DailyFeature ABHANG slot holding meaning rather than verse.
 */

import { PrismaClient } from '@prisma/client';

export type ReviewIssueType =
  | 'STORY_IN_ABHANG'
  | 'EMBEDDED_MEANING'
  | 'GENERIC_SCRAPER_TITLE'
  | 'MISALIGNED_REFERENCE'
  | 'DAILY_FEATURE_MISCONFIGURED';

export interface ReviewIssue {
  type: ReviewIssueType;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
  currentValue: string;
  proposedFix?: string;
  metadata?: Record<string, unknown>;
}

export interface CompositionCandidate {
  id: string;
  titleMarathi: string;
  titleTranslit?: string | null;
  fullText: string | null;
  meaning?: string | null;
  type?: string | null;
  source?: string | null;
  saintId?: string | null;
  saintNameMarathi?: string | null;
  alternateTitles?: unknown;
}

export interface FixPlan {
  id: string;
  newTitleMarathi?: string;
  newTitleTranslit?: string;
  newFullText?: string;
  newMeaning?: string;
  newAlternateTitles?: string[];
  newSaintId?: string;
  issuesResolved: ReviewIssueType[];
}

export interface DailyFeatureCandidate {
  id: string;
  slot: string;
  titleMarathi: string;
  bodyMarathi: string | null;
  compositionId: string | null;
  composition?: {
    id: string;
    titleMarathi: string;
    fullText: string | null;
    meaning: string | null;
    saint?: { nameMarathi: string } | null;
  } | null;
}

// ─── Devanagari & Marathi Constants ──────────────────────────────────────────

const DEVANAGARI_CHAR = /[\u0900-\u097F]/;

/** Pattern identifying generic scraper number titles */
export const GENERIC_TITLE_PATTERN =
  /^(?:(?:संत\s+[\u0900-\u097F]+\s+)?(?:गाथा\s+)?(?:अभंग|ओवी|पद|श्लोक|कडवे)\s*(?:क्र\.|क्रमांक|\s+)\s*[०-९0-9]+(?:(?:ते|–|-)[०-९0-9]+)?|अभंग\s+क्र\.\s*[०-९0-9]+|गाथा\s+अभंग\s+[०-९0-9]+)/iu;

/** Pattern for embedded meaning markers inside full text */
export const EMBEDDED_MEANING_PATTERN =
  /^(?<verse>[\s\S]+?)(?:[\n\s]+)(?<label>अर्थ|भावार्थ|तात्पर्य|कथा)\s*[:\-–]\s*(?<meaning>[\s\S]+)$/u;

/** Markers indicating typical Marathi narrative prose/story style */
const STORY_PROSE_MARKERS = [
  /मोठ्या डाम डौलाने/u,
  /म्हणून तिच्या मि[ऱ्या|या] ओढीत/u,
  /म्हणाली\s+सासूबाई/u,
  /रडू लागले/u,
  /विचारू लागले/u,
  /सांगू लागले/u,
  /अभिप्राय खरोखर कळत नाही/u,
  /लज्जायमान होऊन/u,
  /कथा अशी आहे/u,
  /गोष्ट अशी घडली/u,
  /तात्पर्य असा की/u,
];

/** Standard mudrika (saint signature) mappings in Varkari literature */
export const MUDRchannel_SIGNATURES: Array<{
  pattern: RegExp;
  saintSlug: string;
  saintNameMarathi: string;
}> = [
  { pattern: /एका\s+जनार्दनीं?/u, saintSlug: 'eknath-maharaj', saintNameMarathi: 'एकनाथ महाराज' },
  { pattern: /तुका\s+म्हणे|तुकाराम\s+म्हणे/u, saintSlug: 'sant-tukaram', saintNameMarathi: 'संत तुकाराम' },
  { pattern: /ज्ञानदेव\s+म्हणे|बापरखुमादेविवरू?|बापरखुमादेवीवर/u, saintSlug: 'sant-dnyaneshwar', saintNameMarathi: 'ज्ञानेश्वर महाराज' },
  { pattern: /नामा\s+म्हणे|विष्णुदास\s+नामा/u, saintSlug: 'sant-namdev', saintNameMarathi: 'संत नामदेव' },
  { pattern: /चोखा\s+म्हणे/u, saintSlug: 'sant-chokhamela', saintNameMarathi: 'संत चोखामेळा' },
  { pattern: /दासी\s+जनी|जनी\s+म्हणे/u, saintSlug: 'sant-janabai', saintNameMarathi: 'संत जनाबाई' },
  { pattern: /गोरा\s+म्हणे|गोरा\s+कुंभार/u, saintSlug: 'sant-gora-kumbhar', saintNameMarathi: 'संत गोरा कुंभार' },
  { pattern: /सांव?ता\s+म्हणे/u, saintSlug: 'sant-savata-mali', saintNameMarathi: 'संत सावता माळी' },
  { pattern: /सेना\s+म्हणे/u, saintSlug: 'sant-sena-maharaj', saintNameMarathi: 'संत सेना महाराज' },
  { pattern: /निवृत्ती\s+म्हणे/u, saintSlug: 'sant-nivruttinath', saintNameMarathi: 'संत निवृत्तीनाथ' },
  { pattern: /सोपान\s+म्हणे/u, saintSlug: 'sant-sopandev', saintNameMarathi: 'संत सोपानदेव' },
  { pattern: /मुक्ता\s+म्हणे/u, saintSlug: 'sant-muktabai', saintNameMarathi: 'संत मुक्ताबाई' },
  { pattern: /बहिणा\s+म्हणे/u, saintSlug: 'sant-bahinabai', saintNameMarathi: 'संत बहिणाबाई' },
];

// ─── Transliteration Utility (Devanagari to Latin) ───────────────────────────

const CONSONANTS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h', 'ळ': 'l',
};

const VOWELS: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ru',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'am', 'अः': 'aha',
};

const MATRAS: Record<string, string> = {
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ru',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ः': 'h',
};

export function transliterateDevanagariToLatin(devText: string): string {
  let result = '';
  const words = devText.trim().split(/\s+/);

  for (const word of words) {
    let wordLat = '';
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      const next = word[i + 1];

      if (CONSONANTS[ch]) {
        wordLat += CONSONANTS[ch];
        if (next === '्') {
          i++; // skip virama
        } else if (MATRAS[next]) {
          wordLat += MATRAS[next];
          i++;
        } else if (i < word.length - 1 && CONSONANTS[next]) {
          // Medial consonant has implicit schwa 'a'
          wordLat += 'a';
        }
      } else if (VOWELS[ch]) {
        wordLat += VOWELS[ch];
      } else if (MATRAS[ch]) {
        wordLat += MATRAS[ch];
      } else if (/[a-zA-Z0-9]/.test(ch)) {
        wordLat += ch;
      }
    }
    if (wordLat.length > 0) {
      result += (result ? ' ' : '') + wordLat.charAt(0).toUpperCase() + wordLat.slice(1);
    }
  }

  return result || 'Abhang';
}

// ─── Core Auditor Functions ──────────────────────────────────────────────────

/**
 * Extracts the canonical opening line (ध्रुवपद) from composition fullText.
 * Cleans off standard invocations, leading verse numbering, and trailing punctuation.
 */
export function extractCanonicalOpeningLine(fullText: string | null): string | null {
  if (!fullText) return null;

  // 1. Remove invocation banners e.g. ॥ श्रीगणेशाय नमः ॥, ॥ श्रीसद्गुरुरामचंद्राय नमः ॥
  let text = fullText
    .replace(/^॥\s*(?:श्री|ॐ)[\u0900-\u097F\s]+?नम[ः:]?\s*॥/u, '')
    .trim();

  // 2. Remove chapter / subheader titles e.g. "कौसल्येचे डोहाळे :"
  text = text.replace(/^[\u0900-\u097F\s]+:\s*/u, '').trim();

  // 3. Split by poetic delimiters (danda ॥ or । or newline)
  const segments = text.split(/[\n॥।]/).map((s) => s.trim()).filter(Boolean);

  for (const seg of segments) {
    // Strip leading / trailing verse numbers and symbols e.g. "१. ", "॥ १ ॥", "(१)"
    const cleaned = seg
      .replace(/^[०१२३४५६७८९\d\s\.\-–—\(\)\|॥।]+/, '')
      .replace(/[०१२३४५६७८९\d\s\.\-–—\(\)\|॥।]+$/, '')
      .trim();

    // Check if it's a valid meaningful verse line (between 6 and 80 chars, contains Devanagari)
    if (
      cleaned.length >= 6 &&
      cleaned.length <= 80 &&
      DEVANAGARI_CHAR.test(cleaned) &&
      !cleaned.startsWith('अर्थ') &&
      !cleaned.startsWith('भावार्थ')
    ) {
      return cleaned;
    }
  }

  return null;
}

/**
 * Checks whether a text snippet exhibits prose story characteristics rather than poetic meter.
 */
export function isProseStory(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  const trimmed = text.trim();

  // Check known narrative markers
  for (const marker of STORY_PROSE_MARKERS) {
    if (marker.test(trimmed)) return true;
  }

  // Check structural markers: lack of dandas combined with long average sentence length
  const hasDanda = /[।॥]/.test(trimmed);
  const sentences = trimmed.split(/[\.\n]/).filter((s) => s.trim().length > 0);
  const avgLen = trimmed.length / Math.max(sentences.length, 1);

  // Typical Marathi abhang stanzas have dandas or short rhyming lines (< 50 chars).
  // Prose stories have long running sentences without dandas.
  if (!hasDanda && avgLen > 90 && sentences.length <= 4) {
    return true;
  }

  return false;
}

/**
 * Splits fullText if it contains embedded 'अर्थ:' or 'भावार्थ:'.
 */
export function extractEmbeddedMeaning(fullText: string): {
  verse: string;
  meaning: string | null;
} {
  const match = fullText.match(EMBEDDED_MEANING_PATTERN);
  if (match?.groups?.verse && match.groups.meaning) {
    return {
      verse: match.groups.verse.trim(),
      meaning: match.groups.meaning.trim(),
    };
  }

  // Alternate regex: inline अर्थ: without preceding newline
  const inlineIdx = fullText.indexOf(' अर्थ:');
  if (inlineIdx > 20) {
    const verse = fullText.slice(0, inlineIdx).trim();
    const meaning = fullText.slice(inlineIdx + 6).trim();
    if (verse.length >= 20 && meaning.length >= 10) {
      return { verse, meaning };
    }
  }

  return { verse: fullText.trim(), meaning: null };
}

/**
 * Detects Mudrika (author saint signature) from the text.
 */
export function detectMudrikaSaint(text: string): {
  saintSlug: string;
  saintNameMarathi: string;
} | null {
  for (const sig of MUDRchannel_SIGNATURES) {
    if (sig.pattern.test(text)) {
      return {
        saintSlug: sig.saintSlug,
        saintNameMarathi: sig.saintNameMarathi,
      };
    }
  }
  return null;
}

/**
 * Analyzes a composition and generates a list of detected issues.
 */
export function analyzeComposition(comp: CompositionCandidate): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const fullText = comp.fullText?.trim() || '';
  const title = comp.titleMarathi?.trim() || '';
  const _meaning = comp.meaning?.trim() || '';

  // 1. Check for Embedded Meaning in FullText
  const embedded = extractEmbeddedMeaning(fullText);
  if (embedded.meaning) {
    issues.push({
      type: 'EMBEDDED_MEANING',
      severity: 'CRITICAL',
      description: 'Composition fullText contains embedded अर्थ/भावार्थ that should be in the meaning field',
      currentValue: fullText.slice(0, 100) + '...',
      proposedFix: `Split verse (${embedded.verse.slice(0, 60)}...) and meaning (${embedded.meaning.slice(0, 60)}...)`,
      metadata: { cleanVerse: embedded.verse, cleanMeaning: embedded.meaning },
    });
  }

  // 2. Check for Story in Verse
  if (isProseStory(fullText) || (_meaning && fullText === _meaning)) {
    issues.push({
      type: 'STORY_IN_ABHANG',
      severity: 'CRITICAL',
      description: 'Composition fullText appears to be prose explanation/story rather than sacred poetic verse',
      currentValue: fullText.slice(0, 120),
    });
  }

  // 3. Check for Generic Scraper Title
  if (GENERIC_TITLE_PATTERN.test(title)) {
    const canonical = extractCanonicalOpeningLine(embedded.verse || fullText);
    issues.push({
      type: 'GENERIC_SCRAPER_TITLE',
      severity: 'WARNING',
      description: 'Composition uses an arbitrary scraper/number title instead of the canonical first verse line (ध्रुवपद)',
      currentValue: title,
      proposedFix: canonical || undefined,
      metadata: { originalTitle: title, canonicalTitle: canonical },
    });
  }

  // 4. Check for Mudrika vs Saint Alignment
  const mudrika = detectMudrikaSaint(fullText);
  if (mudrika && comp.saintNameMarathi && !comp.saintNameMarathi.includes(mudrika.saintNameMarathi)) {
    issues.push({
      type: 'MISALIGNED_REFERENCE',
      severity: 'WARNING',
      description: `Composition mudrika indicates ${mudrika.saintNameMarathi}, but saint is set to ${comp.saintNameMarathi}`,
      currentValue: comp.saintNameMarathi,
      proposedFix: mudrika.saintNameMarathi,
      metadata: { mudrikaSaint: mudrika },
    });
  }

  return issues;
}

/**
 * Generates a FixPlan for a composition based on detected issues.
 */
export function generateCompositionFixPlan(
  comp: CompositionCandidate,
  issues: ReviewIssue[],
): FixPlan | null {
  if (issues.length === 0) return null;

  const plan: FixPlan = {
    id: comp.id,
    issuesResolved: [],
  };

  const currentAlternates: string[] = Array.isArray(comp.alternateTitles)
    ? (comp.alternateTitles as string[])
    : typeof comp.alternateTitles === 'string'
      ? JSON.parse(comp.alternateTitles || '[]')
      : [];

  // Handle Embedded Meaning
  const meaningIssue = issues.find((i) => i.type === 'EMBEDDED_MEANING');
  if (meaningIssue?.metadata) {
    const { cleanVerse, cleanMeaning } = meaningIssue.metadata as {
      cleanVerse: string;
      cleanMeaning: string;
    };
    plan.newFullText = cleanVerse;
    plan.newMeaning = comp.meaning ? `${comp.meaning}\n\n${cleanMeaning}` : cleanMeaning;
    plan.issuesResolved.push('EMBEDDED_MEANING');
  }

  // Handle Generic Title
  const titleIssue = issues.find((i) => i.type === 'GENERIC_SCRAPER_TITLE');
  if (titleIssue?.proposedFix) {
    plan.newTitleMarathi = titleIssue.proposedFix;
    plan.newTitleTranslit = transliterateDevanagariToLatin(titleIssue.proposedFix);

    // Ensure the old title is preserved in alternateTitles for search compatibility
    const oldTitle = comp.titleMarathi;
    const alternates = new Set(currentAlternates);
    alternates.add(oldTitle);
    if (comp.titleTranslit) alternates.add(comp.titleTranslit);
    plan.newAlternateTitles = Array.from(alternates);

    plan.issuesResolved.push('GENERIC_SCRAPER_TITLE');
  }

  return plan.issuesResolved.length > 0 ? plan : null;
}

/**
 * Audits a DailyFeature record.
 */
export function analyzeDailyFeature(feature: DailyFeatureCandidate): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  if (feature.slot === 'ABHANG') {
    const body = feature.bodyMarathi?.trim() || '';
    const compMeaning = feature.composition?.meaning?.trim() || '';
    const compFullText = feature.composition?.fullText?.trim() || '';

    // Check if the daily abhang body is actually the story/meaning
    if (
      (compMeaning && body === compMeaning) ||
      isProseStory(body) ||
      (compFullText && body !== compFullText && compMeaning && body.includes(compMeaning.slice(0, 50)))
    ) {
      issues.push({
        type: 'STORY_IN_ABHANG',
        severity: 'CRITICAL',
        description: 'DailyFeature ABHANG slot body holds prose story/meaning rather than authentic verse poetry',
        currentValue: body.slice(0, 100) + '...',
        proposedFix: compFullText ? compFullText.slice(0, 100) + '...' : undefined,
      });
    }

    // Check if daily feature title is generic
    if (GENERIC_TITLE_PATTERN.test(feature.titleMarathi)) {
      const canonical = extractCanonicalOpeningLine(compFullText || body);
      issues.push({
        type: 'GENERIC_SCRAPER_TITLE',
        severity: 'WARNING',
        description: 'DailyFeature uses generic scraper number title',
        currentValue: feature.titleMarathi,
        proposedFix: canonical || undefined,
      });
    }
  }

  return issues;
}

// ─── Database Operations & Orchestration ─────────────────────────────────────

export interface ReviewCatalogOptions {
  prisma: PrismaClient;
  dryRun?: boolean;
  limit?: number;
  batchSize?: number;
  compositionId?: string;
  onProgress?: (progress: { processed: number; total: number; fixed: number }) => void;
}

export interface CatalogReviewReport {
  totalScanned: number;
  issuesFoundCount: number;
  fixesAppliedCount: number;
  issuesByType: Record<ReviewIssueType, number>;
  sampleFixes: Array<{ id: string; issues: ReviewIssueType[]; plan: FixPlan }>;
}

/**
 * Reviews and fixes all DailyFeature entries in the database.
 */
export async function reviewAndFixDailyFeatures(
  prisma: PrismaClient,
  options: { dryRun?: boolean } = {},
): Promise<{
  scanned: number;
  fixed: number;
  details: Array<{ id: string; title: string; action: string }>;
}> {
  const { dryRun = false } = options;
  const features = await prisma.dailyFeature.findMany({
    where: { slot: 'ABHANG' },
    include: {
      composition: {
        select: {
          id: true,
          titleMarathi: true,
          fullText: true,
          meaning: true,
          saint: { select: { nameMarathi: true } },
        },
      },
    },
  });

  let fixedCount = 0;
  const details: Array<{ id: string; title: string; action: string }> = [];

  for (const feature of features) {
    const issues = analyzeDailyFeature(feature);
    if (issues.length > 0 && feature.composition?.fullText) {
      const canonicalTitle =
        extractCanonicalOpeningLine(feature.composition.fullText) || feature.composition.titleMarathi;
      const pureVerse = feature.composition.fullText;

      details.push({
        id: feature.id,
        title: feature.titleMarathi,
        action: `Replaced story with authentic verse. New title: "${canonicalTitle}"`,
      });

      if (!dryRun) {
        await prisma.dailyFeature.update({
          where: { id: feature.id },
          data: {
            titleMarathi: canonicalTitle,
            bodyMarathi: pureVerse,
          },
        });
      }
      fixedCount++;
    }
  }

  return { scanned: features.length, fixed: fixedCount, details };
}

/**
 * Scans the database catalog, audits for story/meaning/generic title issues,
 * and fixes them if dryRun is false.
 */
export async function reviewAndFixCatalog(
  options: ReviewCatalogOptions,
): Promise<CatalogReviewReport> {
  const { prisma, dryRun = true, limit, batchSize = 100, compositionId, onProgress } = options;

  const whereClause: Record<string, unknown> = {};
  if (compositionId) {
    whereClause.id = compositionId;
  }

  const total = await prisma.composition.count({ where: whereClause });
  const takeTotal = limit ? Math.min(limit, total) : total;

  let processed = 0;
  let fixesApplied = 0;
  let issuesFound = 0;

  const issuesByType: Record<ReviewIssueType, number> = {
    STORY_IN_ABHANG: 0,
    EMBEDDED_MEANING: 0,
    GENERIC_SCRAPER_TITLE: 0,
    MISALIGNED_REFERENCE: 0,
    DAILY_FEATURE_MISCONFIGURED: 0,
  };

  const sampleFixes: Array<{ id: string; issues: ReviewIssueType[]; plan: FixPlan }> = [];

  for (let skip = 0; skip < takeTotal; skip += batchSize) {
    const batchTake = Math.min(batchSize, takeTotal - skip);
    const comps = await prisma.composition.findMany({
      where: whereClause,
      skip,
      take: batchTake,
      select: {
        id: true,
        titleMarathi: true,
        titleTranslit: true,
        fullText: true,
        meaning: true,
        type: true,
        source: true,
        saintId: true,
        alternateTitles: true,
        saint: { select: { id: true, nameMarathi: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    for (const comp of comps) {
      processed++;
      const candidate: CompositionCandidate = {
        id: comp.id,
        titleMarathi: comp.titleMarathi,
        titleTranslit: comp.titleTranslit,
        fullText: comp.fullText,
        meaning: comp.meaning,
        type: comp.type,
        source: comp.source,
        saintId: comp.saintId,
        saintNameMarathi: comp.saint?.nameMarathi ?? null,
        alternateTitles: comp.alternateTitles,
      };

      const issues = analyzeComposition(candidate);
      if (issues.length > 0) {
        issuesFound += issues.length;
        for (const iss of issues) {
          issuesByType[iss.type]++;
        }

        const plan = generateCompositionFixPlan(candidate, issues);
        if (plan) {
          if (sampleFixes.length < 15) {
            sampleFixes.push({ id: comp.id, issues: issues.map((i) => i.type), plan });
          }

          if (!dryRun) {
            const updateData: Record<string, unknown> = {};
            if (plan.newTitleMarathi) updateData.titleMarathi = plan.newTitleMarathi;
            if (plan.newTitleTranslit) updateData.titleTranslit = plan.newTitleTranslit;
            if (plan.newFullText) updateData.fullText = plan.newFullText;
            if (plan.newMeaning) updateData.meaning = plan.newMeaning;
            if (plan.newAlternateTitles) updateData.alternateTitles = plan.newAlternateTitles;

            await prisma.composition.update({
              where: { id: comp.id },
              data: updateData,
            });
            fixesApplied++;
          }
        }
      }
    }

    if (onProgress) {
      onProgress({ processed, total: takeTotal, fixed: fixesApplied });
    }
  }

  return {
    totalScanned: processed,
    issuesFoundCount: issuesFound,
    fixesAppliedCount: fixesApplied,
    issuesByType,
    sampleFixes,
  };
}
