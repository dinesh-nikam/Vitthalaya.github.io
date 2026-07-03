/**
 * Vitthalaya — AI Metadata Extraction
 *
 * Enriches extracted compositions with AI-detected metadata:
 *   - Saint attribution
 *   - Deity attribution
 *   - Composition type (abhang, aarti, bhajan, etc.)
 *   - Festival association
 *   - Category classification
 *   - Key themes
 *   - Reading difficulty
 *
 * This module integrates with the existing AI enrichment pipeline
 * at src/ai-enrichment/ for LLM-powered extraction.
 * When the AI pipeline is unavailable, it falls back to pattern matching.
 */

import type { ExtractedComposition } from './types';
import { enqueueComposition as enqueueForEnrichment } from '../ai-enrichment/queue';

// ─── Known Saint Patterns ─────────────────────────────────────

interface SaintPattern {
  names: string[];        // Name variations in Marathi
  translit: string;       // Transliterated name
  type: string;           // Composition types typically associated
  keywords: string[];     // Keywords / phrases associated
}

const KNOWN_SAINTS: SaintPattern[] = [
  {
    names: ['तुकाराम', 'तुकाराम महाराज', 'संत तुकाराम'],
    translit: 'tukaram',
    type: 'abhang',
    keywords: ['तुका', 'तुकाराम', 'अभंग'],
  },
  {
    names: ['ज्ञानेश्वर', 'ज्ञानेश्वर महाराज', 'संत ज्ञानेश्वर', 'ज्ञानदेव'],
    translit: 'dnyaneshwar',
    type: 'haripath',
    keywords: ['ज्ञानेश्वर', 'ज्ञानदेव', 'हरिपाठ', 'ज्ञानेश्वरी'],
  },
  {
    names: ['एकनाथ', 'एकनाथ महाराज', 'संत एकनाथ'],
    translit: 'eknath',
    type: 'bharud',
    keywords: ['एकनाथ', 'भारूड'],
  },
  {
    names: ['नामदेव', 'संत नामदेव'],
    translit: 'namdev',
    type: 'abhang',
    keywords: ['नामदेव'],
  },
  {
    names: ['मीराबाई', 'मीरा', 'संत मीराबाई'],
    translit: 'meera',
    type: 'bhajan',
    keywords: ['मीरा', 'मीराबाई'],
  },
  {
    names: ['जनाबाई', 'संत जनाबाई'],
    translit: 'janabai',
    type: 'abhang',
    keywords: ['जनाबाई', 'जना'],
  },
  {
    names: ['गोरा कुंभार', 'संत गोरा कुंभार'],
    translit: 'gora-kumbhar',
    type: 'abhang',
    keywords: ['गोरा', 'कुंभार'],
  },
  {
    names: ['सावता माळी', 'संत सावता माळी'],
    translit: 'savata-mali',
    type: 'abhang',
    keywords: ['सावता', 'माळी'],
  },
  {
    names: ['चोखामेळा', 'संत चोखामेळा'],
    translit: 'chokhamela',
    type: 'abhang',
    keywords: ['चोखा', 'चोखामेळा'],
  },
  {
    names: ['समर्थ रामदास', 'रामदास स्वामी', 'समर्थ'],
    translit: 'ramdas',
    type: 'dasbodh',
    keywords: ['रामदास', 'समर्थ', 'मनाचे श्लोक'],
  },
];

// ─── Known Deity Patterns ─────────────────────────────────────

interface DeityPattern {
  names: string[];
  translit: string;
  forms: string[];
}

const KNOWN_DEITIES: DeityPattern[] = [
  {
    names: ['विठ्ठल', 'विठोबा', 'पांडुरंग', 'श्री विठ्ठल', 'श्रीपति'],
    translit: 'vitthal',
    forms: ['पांडुरंग', 'विठोबा', 'विठ्ठल'],
  },
  {
    names: ['ज्ञानेश्वर', 'ज्ञानदेव'],
    translit: 'dnyaneshwar-mauli',
    forms: ['माऊली', 'ज्ञानदेव'],
  },
  {
    names: ['शिव', 'महादेव', 'शंकर', 'महेश्वर'],
    translit: 'shiva',
    forms: ['शिव', 'शंकर'],
  },
  {
    names: ['दत्तात्रेय', 'दत्त', 'श्री दत्त'],
    translit: 'dattatreya',
    forms: ['दत्त', 'दत्तात्रेय'],
  },
  {
    names: ['राम', 'श्रीराम', 'रामचंद्र', 'प्रभू राम'],
    translit: 'rama',
    forms: ['राम', 'रघुनंदन', 'राघव'],
  },
  {
    names: ['कृष्ण', 'श्रीकृष्ण', 'विठोबा', 'पांडुरंग'],
    translit: 'krishna',
    forms: ['कृष्ण', 'गोपाळ', 'माधव'],
  },
  {
    names: ['गणपती', 'गणेश', 'श्रीगणेश', 'विघ्नहर्ता'],
    translit: 'ganesh',
    forms: ['गणपती', 'गणेश'],
  },
  {
    names: ['देवी', 'अंबे', 'जगदंबे', 'दुर्गा', 'भवानी'],
    translit: 'devi',
    forms: ['अंबे', 'देवी', 'माता'],
  },
];

// ─── Composition Types ────────────────────────────────────────

const TYPE_KEYWORDS: Record<string, string[]> = {
  abhang: ['अभंग', 'अभंग गाथा', 'अभंगवाणी'],
  aarti: ['आरती', 'ओवाळू', 'करू आरती'],
  bhajan: ['भजन', 'भक्तीगीत', 'भक्ती संगीत'],
  haripath: ['हरिपाठ', 'हरिनाम'],
  stotra: ['स्तोत्र', 'स्तुती', 'प्रार्थना'],
  bharud: ['भारूड', 'एकनाथी भारूड'],
  gaulani: ['गौळण', 'गवळण'],
  kirtan: ['कीर्तन', 'हरिकथा'],
  commentary: ['ज्ञानेश्वरी', 'टीका', 'टीकाग्रंथ', 'व्याख्या', 'दासबोध'],
  namasmaran: ['नामस्मरण', 'नामजप', 'हरिनाम'],
};

// ─── Festival Patterns ────────────────────────────────────────

const FESTIVAL_PATTERNS: Array<{ names: string[]; translit: string }> = [
  { names: ['आषाढी एकादशी', 'आषाढी', 'पंढरपूरची वारी'], translit: 'ashadi-ekadashi' },
  { names: ['कार्तिकी एकादशी', 'कार्तिकी'], translit: 'kartiki-ekadashi' },
  { names: ['दसरा', 'विजयादशमी'], translit: 'dussehra' },
  { names: ['दिवाळी', 'दीपावली'], translit: 'diwali' },
  { names: ['गणेश चतुर्थी', 'गणपती उत्सव'], translit: 'ganesh-chaturthi' },
  { names: ['शिवरात्रि', 'महाशिवरात्रि'], translit: 'shivaratri' },
  { names: ['होळी', 'धुळवड'], translit: 'holi' },
  { names: ['जन्माष्टमी', 'कृष्ण जन्माष्टमी'], translit: 'janmashtami' },
  { names: ['रामनवमी', 'श्रीराम नवमी'], translit: 'ramanavami' },
  { names: ['मकर संक्रांत', 'संक्रांत'], translit: 'makar-sankrant' },
];

export class MetadataExtractor {
  /**
   * Match a word in Devanagari text, handling suffixes and compound words.
   *
   * Matching rules:
   * - Exact token match (standalone word)
   * - Prefix match when word is followed by a vowel sign (suffix), virama (conjunct),
   *   or any consonant (compound word boundary like \u0935\u093f\u0920\u094d\u0920\u0932\u0928\u093e\u092e\u093e\u091a\u093e)
   *
   * Prevents false positives like "\u0930\u093e\u092e" matching inside "\u0924\u0941\u0915\u093e\u0930\u093e\u092e"
   * because \u0930\u093e\u092e is not a prefix of \u0924\u0941\u0915\u093e\u0930\u093e\u092e.
   */
  private containsWord(text: string, word: string): boolean {
    const tokens = text.split(/[\s,;:\-!?।॥()""''\u2014\u2013\u2018\u2019\u0964\u0965]+/);
    return tokens.some((token) => {
      if (token === word) return true;
      // Prefix match for suffix/compound boundaries
      if (token.startsWith(word)) {
        const next = token[word.length];
        if (!next) return true;
        // Accept vowel sign (suffix), virama (conjunct), or Devanagari consonant as boundary
        return /[\u0900-\u097F]/.test(next);
      }
      return false;
    });
  }

  /**
   * Extract metadata from a composition using pattern matching.
   * Returns detected saint, deity, type, categories, and festivals.
   */
  extractLocal(
    composition: ExtractedComposition,
  ): ExtractedMetadata {
    const text = composition.fullText;
    const title = composition.titleMarathi;

    const saint = this.detectSaint(text, title);
    const deity = this.detectDeity(text, title);
    const type = composition.type ?? this.detectType(text, title);
    const festivals = this.detectFestivals(text, title);
    const categories = this.detectCategories(type, saint);

    return {
      saintNameMarathi: saint?.name ?? null,
      saintNameTranslit: saint?.translit ?? null,
      saintConfidence: saint?.confidence ?? 0,
      deityNameMarathi: deity?.name ?? null,
      deityNameTranslit: deity?.translit ?? null,
      deityConfidence: deity?.confidence ?? 0,
      type,
      typeConfidence: composition.type ? 1.0 : 0.6,
      festivals,
      categories,
    };
  }

  /**
   * Queue composition for deep AI enrichment via the AI enrichment pipeline.
   * This provides additional metadata (themes, summary, sentiment, difficulty).
   */
  async enqueueAIEnrichment(compositionId: string): Promise<void> {
    await enqueueForEnrichment(compositionId);
  }

  /**
   * Batch enqueue multiple compositions for AI enrichment.
   */
  async enqueueAIEnrichmentBatch(compositionIds: string[]): Promise<void> {
    for (const id of compositionIds) {
      await enqueueForEnrichment(id);
    }
  }

  // ─── Saint Detection ────────────────────────────────────────

  private detectSaint(
    text: string,
    title: string,
  ): { name: string; translit: string; confidence: number } | null {
    const searchText = title + '\n' + text;
    const allText = title + text;

    for (const saint of KNOWN_SAINTS) {
      const matched = saint.names.some((name) => this.containsWord(searchText, name));
      if (!matched) continue;

      // Check for stronger signals (title mention or multiple occurrences)
      const titleMatch = saint.names.some((name) => this.containsWord(title, name));
      const occurrenceCount = saint.names.reduce(
        (sum, name) => sum + (allText.split(name).length - 1),
        0,
      );

      let confidence = 0.5;
      if (titleMatch) confidence += 0.3;
      if (occurrenceCount >= 3) confidence += 0.2;

      return {
        name: saint.names[0],
        translit: saint.translit,
        confidence: Math.min(1, confidence),
      };
    }

    return null;
  }

  // ─── Deity Detection ────────────────────────────────────────

  private detectDeity(
    text: string,
    title: string,
  ): { name: string; translit: string; confidence: number } | null {
    const searchText = title + '\n' + text;

    for (const deity of KNOWN_DEITIES) {
      // Check all forms
      const allForms = [...deity.names, ...deity.forms];
      const matched = allForms.some((form) => this.containsWord(searchText, form));
      if (!matched) continue;

      const titleMatch = allForms.some((form) => this.containsWord(title, form));
      const occurrenceCount = allForms.reduce(
        (sum, form) => sum + (searchText.split(form).length - 1),
        0,
      );

      let confidence = 0.4;
      if (titleMatch) confidence += 0.3;
      if (occurrenceCount >= 2) confidence += 0.2;

      // Vitthal/Vithoba is default deity for Varkari — slightly higher base
      if (deity.translit === 'vitthal') confidence += 0.1;

      return {
        name: deity.names[0],
        translit: deity.translit,
        confidence: Math.min(1, confidence),
      };
    }

    return null;
  }

  // ─── Type Detection ─────────────────────────────────────────

  private detectType(text: string, title: string): string {
    const searchText = title + '\n' + text;

    for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
      if (keywords.some((kw) => this.containsWord(searchText, kw))) {
        return type;
      }
    }

    // Default when no type keywords match
    return 'stotra';
  }

  // ─── Festival Detection ─────────────────────────────────────

  private detectFestivals(text: string, title: string): string[] {
    const searchText = title + '\n' + text;
    const found: string[] = [];

    for (const festival of FESTIVAL_PATTERNS) {
      if (festival.names.some((name) => this.containsWord(searchText, name))) {
        found.push(festival.translit);
      }
    }

    return found;
  }

  // ─── Category Detection ─────────────────────────────────────

  private detectCategories(type?: string, saint?: { translit: string } | null): string[] {
    const categories: string[] = [];

    if (type) {
      categories.push(type);
    }

    if (saint) {
      categories.push(saint.translit);
    }

    categories.push('varkari');
    return categories.filter(Boolean);
  }
}

// ─── Types ────────────────────────────────────────────────────

export interface ExtractedMetadata {
  saintNameMarathi: string | null;
  saintNameTranslit: string | null;
  saintConfidence: number;
  deityNameMarathi: string | null;
  deityNameTranslit: string | null;
  deityConfidence: number;
  type: string;
  typeConfidence: number;
  festivals: string[];
  categories: string[];
}
