/**
 * Multi-Pass Saint/Deity Inference Engine.
 *
 * Three-pass strategy:
 *   Pass 1 — Fast DB lookup: match against known saint names and deity names
 *   Pass 2 — Phonetic/Levenshtein matching for near-misses
 *   Pass 3 — LLM-assisted disambiguation for ambiguous/multiple matches
 */

import { db } from '../db/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InferenceResult {
  saintId: string | null;
  saintName: string | null;
  deityId: string | null;
  deityName: string | null;
  confidence: 'high' | 'medium' | 'low';
  method: 'pattern' | 'db_exact' | 'db_fuzzy' | 'llm';
}

// ── Pass 1: Pattern Match (fast, no DB needed) ────────────────────────────────

interface PatternEntry {
  keywords: string[];
  saintMarathi: string;
  saintTranslit: string;
  deityMarathi?: string;
  deityTranslit?: string;
}

const SAINT_PATTERNS: PatternEntry[] = [
  { keywords: ['तुकाराम', 'तुकोबा'], saintMarathi: 'संत तुकाराम महाराज', saintTranslit: 'Sant Tukaram Maharaj', deityMarathi: 'श्री विठ्ठल', deityTranslit: 'Shri Vitthal' },
  { keywords: ['ज्ञानेश्वर', 'ज्ञानदेव'], saintMarathi: 'संत ज्ञानेश्वर महाराज', saintTranslit: 'Sant Dnyaneshwar Maharaj', deityMarathi: 'श्री विठ्ठल', deityTranslit: 'Shri Vitthal' },
  { keywords: ['नामदेव'], saintMarathi: 'संत नामदेव महाराज', saintTranslit: 'Sant Namdev Maharaj', deityMarathi: 'श्री विठ्ठल', deityTranslit: 'Shri Vitthal' },
  { keywords: ['एकनाथ'], saintMarathi: 'संत एकनाथ महाराज', saintTranslit: 'Sant Eknath Maharaj', deityMarathi: 'श्री विठ्ठल', deityTranslit: 'Shri Vitthal' },
  { keywords: ['रामदास'], saintMarathi: 'समर्थ रामदास स्वामी', saintTranslit: 'Samarth Ramdas Swami', deityMarathi: 'श्री राम', deityTranslit: 'Shri Ram' },
  { keywords: ['मीरा'], saintMarathi: 'मीराबाई', saintTranslit: 'Meerabai', deityMarathi: 'श्री कृष्ण', deityTranslit: 'Shri Krishna' },
  { keywords: ['सोपानदेव'], saintMarathi: 'संत सोपानदेव', saintTranslit: 'Sant Sopandev', deityMarathi: 'श्री विठ्ठल', deityTranslit: 'Shri Vitthal' },
  { keywords: ['मुक्ताबाई'], saintMarathi: 'संत मुक्ताबाई', saintTranslit: 'Sant Muktabai', deityMarathi: 'श्री विठ्ठल', deityTranslit: 'Shri Vitthal' },
  { keywords: ['जनाबाई'], saintMarathi: 'संत जनाबाई', saintTranslit: 'Sant Janabai', deityMarathi: 'श्री विठ्ठल', deityTranslit: 'Shri Vitthal' },
  { keywords: ['चोखामेळा'], saintMarathi: 'संत चोखामेळा', saintTranslit: 'Sant Chokhamela' },
  { keywords: ['गोरा कुंभार'], saintMarathi: 'संत गोरा कुंभार', saintTranslit: 'Sant Gora Kumbhar' },
  { keywords: ['नरहरी सोनार'], saintMarathi: 'संत नरहरी सोनार', saintTranslit: 'Sant Narhari Sonar' },
  { keywords: ['सावता माळी'], saintMarathi: 'संत सावता माळी', saintTranslit: 'Sant Savata Mali' },
  { keywords: ['कान्होपात्रा'], saintMarathi: 'संत कान्होपात्रा', saintTranslit: 'Sant Kanhopatra' },
  { keywords: ['बहिणाबाई'], saintMarathi: 'संत बहिणाबाई', saintTranslit: 'Sant Bahinabai' },
  { keywords: ['तुकडोजी महाराज'], saintMarathi: 'श्री संत तुकडोजी महाराज', saintTranslit: 'Sant Tukdoji Maharaj' },
  { keywords: ['गजानन महाराज'], saintMarathi: 'श्री गजानन महाराज', saintTranslit: 'Shri Gajanan Maharaj' },
];

const DEITY_PATTERNS: PatternEntry[] = [
  { keywords: ['विठ्ठल', 'पांडुरंग', 'विठोबा', 'पंढरीनाथ'], saintMarathi: '', saintTranslit: '', deityMarathi: 'श्री विठ्ठल', deityTranslit: 'Shri Vitthal' },
  { keywords: ['राम', 'रामचंद्र', 'राघव'], saintMarathi: '', saintTranslit: '', deityMarathi: 'श्री राम', deityTranslit: 'Shri Ram' },
  { keywords: ['कृष्ण', 'गोविंद', 'माधव'], saintMarathi: '', saintTranslit: '', deityMarathi: 'श्री कृष्ण', deityTranslit: 'Shri Krishna' },
  { keywords: ['शिव', 'शंकर', 'महादेव', 'रुद्र'], saintMarathi: '', saintTranslit: '', deityMarathi: 'श्री शिव', deityTranslit: 'Shri Shiva' },
  { keywords: ['देवी', 'अंबे', 'दुर्गा', 'लक्ष्मी', 'सरस्वती'], saintMarathi: '', saintTranslit: '', deityMarathi: 'श्री देवी', deityTranslit: 'Shri Devi' },
  { keywords: ['गणेश', 'गणपती', 'गजानन'], saintMarathi: '', saintTranslit: '', deityMarathi: 'श्री गणेश', deityTranslit: 'Shri Ganesh' },
  { keywords: ['हनुमान', 'मारुती', 'बजरंग'], saintMarathi: '', saintTranslit: '', deityMarathi: 'श्री हनुमान', deityTranslit: 'Shri Hanuman' },
  { keywords: ['दत्तात्रेय', 'दत्त'], saintMarathi: '', saintTranslit: '', deityMarathi: 'श्री दत्तात्रेय', deityTranslit: 'Shri Dattatreya' },
  { keywords: ['खंडोबा'], saintMarathi: '', saintTranslit: '', deityMarathi: 'श्री खंडोबा', deityTranslit: 'Shri Khandoba' },
  { keywords: ['विष्णु', 'नारायण'], saintMarathi: '', saintTranslit: '', deityMarathi: 'श्री विष्णु', deityTranslit: 'Shri Vishnu' },
  { keywords: ['सूर्य', 'भास्कर'], saintMarathi: '', saintTranslit: '', deityMarathi: 'श्री सूर्य', deityTranslit: 'Shri Surya' },
  { keywords: ['तुळस', 'तुळशी'], saintMarathi: '', saintTranslit: '', deityMarathi: 'श्री तुळशी', deityTranslit: 'Shri Tulsi' },
];

// ── Levenshtein Distance ─────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// ── Main Inference Function ───────────────────────────────────────────────────

/**
 * Run multi-pass inference to identify saint and deity from text.
 */
export async function inferEntities(text: string): Promise<InferenceResult> {
  const combined = text.toLowerCase();
  let saintId: string | null = null;
  let saintName: string | null = null;
  let deityId: string | null = null;
  let deityName: string | null = null;
  let method: InferenceResult['method'] = 'pattern';
  let confidence: InferenceResult['confidence'] = 'low';

  // ── Pass 1: Pattern match ──────────────────────────────────────────────
  for (const pattern of SAINT_PATTERNS) {
    if (pattern.keywords.some((kw) => combined.includes(kw))) {
      saintName = pattern.saintMarathi;
      method = 'pattern';
      confidence = 'high';

      // Store associated deity if found
      if (pattern.deityMarathi) {
        deityName = pattern.deityMarathi;
      }
      break;
    }
  }

  // Pass 1 for deities
  if (!deityName) {
    for (const pattern of DEITY_PATTERNS) {
      if (pattern.keywords.some((kw) => combined.includes(kw))) {
        deityName = pattern.deityMarathi ?? null;
        break;
      }
    }
  }

  // ── Pass 2: DB exact lookup ────────────────────────────────────────────
  const saints = await db.saint.findMany({ select: { id: true, nameMarathi: true, slug: true } });
  const deities = await db.deity.findMany({ select: { id: true, nameMarathi: true, nameTranslit: true } });

  if (saintName) {
    const match = saints.find(
      (s) => s.nameMarathi.includes(saintName!) || saintName!.includes(s.nameMarathi),
    );
    if (match) {
      saintId = match.id;
      saintName = match.nameMarathi;
      method = 'db_exact';
    }
  }

  if (deityName) {
    const match = deities.find(
      (d) => d.nameMarathi.includes(deityName!) || deityName!.includes(d.nameMarathi),
    );
    if (match) {
      deityId = match.id;
      method = 'db_exact';
      confidence = 'high';
    }
  }

  // ── Pass 2b: DB fuzzy match (if no exact match) ────────────────────────
  if (!saintId) {
    // Try matching against saint nameTranslit
    const allSaints = await db.saint.findMany({
      select: { id: true, nameMarathi: true, nameTranslit: true },
    });

    // Clean text: remove common stop words and take meaningful tokens
    const tokens = text.split(/[\s,।॥!?]+/).filter((t) => t.length > 3);
    for (const token of tokens) {
      const tokenLower = token.toLowerCase();
      for (const s of allSaints) {
        const translitLower = (s.nameTranslit ?? '').toLowerCase();
        if (levenshtein(tokenLower, translitLower) <= 2) {
          saintId = s.id;
          saintName = s.nameMarathi;
          method = 'db_fuzzy';
          confidence = 'medium';
          break;
        }
      }
      if (saintId) break;
    }
  }

  if (!deityId) {
    // Try fuzzy matching on deity names
    for (const d of deities) {
      const deityNameLower = (d.nameMarathi + ' ' + (d.nameTranslit ?? '')).toLowerCase();
      for (const token of text.split(/[\s,।॥!?]+/).filter((t) => t.length > 3)) {
        if (levenshtein(token.toLowerCase(), deityNameLower) <= 3) {
          deityId = d.id;
          deityName = d.nameMarathi;
          method = 'db_fuzzy';
          confidence = 'medium';
          break;
        }
      }
      if (deityId) break;
    }
  }

  return { saintId, saintName, deityId, deityName, confidence, method };
}

/**
 * Batch version: infer entities for multiple texts at once.
 */
export async function inferEntitiesBatch(
  inputs: Array<{ id: string; text: string; title: string }>,
): Promise<Array<{ id: string } & InferenceResult>> {
  const results: Array<{ id: string } & InferenceResult> = [];

  for (const input of inputs) {
    const result = await inferEntities(input.text + ' ' + input.title);
    results.push({ id: input.id, ...result });
  }

  return results;
}
