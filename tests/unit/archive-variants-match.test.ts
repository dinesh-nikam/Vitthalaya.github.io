import { describe, expect, test } from 'bun:test';
import {
  bigramDice,
  buildIndex,
  confirmFullText,
  DEFAULT_FULL_THRESHOLD,
  firstMeaningfulLine,
  levenshteinRatio,
  normalizeLine,
  retrieveBest,
} from '../../scripts/import-archive-variants';

// Real Tukaram abhang first lines (from the Wikisource corpus).
const REAL = {
  a: 'तुका म्हणे पांडुरंगा । घडो आतां माझा संगा',
  b: 'उभा विठ्ठल विटेवरी । कर कटेवरी ठेवूनिया',
  c: 'जनी जनी जनार्दनीं भक्ति ठेविली । तया भावें केली विठ्ठल आठवण',
  d: 'नको नको रे संसारा । तूं मज विषम व्यवहारा',
};

// Full abhang texts (normalized) for the confirmation stage.
const FULL: Record<string, string> = {
  a: 'तुका म्हणे पांडुरंगा घडो आतां माझा संगा सद्गुरुचरणीं ठेविलें मन ध्यान संगा विठ्ठल नाम घेता पापें जाती तरि पांडुरंगा',
  b: 'उभा विठ्ठल विटेवरी कर कटेवरी ठेवूनिया पांडुरंग माझा धनी करुणा करी सर्व जनी',
  c: 'जनी जनी जनार्दनीं भक्ति ठेविली तया भावें केली विठ्ठल आठवण विठ्ठल नामें तुटलें भवबंधन ध्रुव',
  d: 'नको नको रे संसारा तूं मज विषम व्यवहारा मज तरि पांडुरंग रक्षिता सर्व प्रकारा',
};

const ENTRIES = Object.entries(REAL).map(([k, v]) => ({
  id: `ws-${k}`,
  titleMarathi: `तुकाराम अभंग ${k.toUpperCase()}`,
  line: firstMeaningfulLine(v),
  fullNorm: FULL[k],
}));

function buildFuzzy() {
  return buildIndex(ENTRIES);
}

describe('normalizeLine / firstMeaningfulLine', () => {
  test('strips dandas, digits, brackets, OCR junk', () => {
    // [पं. कृष्णांजन.] is an editorial annotation — fully removed.
    expect(normalizeLine('[पं. कृष्णांजन.] तुका म्हणे ॥ १ ॥')).toBe('तुका म्हणे');
  });

  test('skips OCR-garbage header lines', () => {
    const text = '** ४४५५८५०८५0 0 ४00 शीतक\nतुका म्हणे पांडुरंगा । घडो आतां माझा संगा';
    expect(firstMeaningfulLine(text)).toBe(normalizeLine('तुका म्हणे पांडुरंगा । घडो आतां माझा संगा'));
  });
});

describe('bigramDice / levenshteinRatio', () => {
  test('identical strings score 1', () => {
    expect(bigramDice('तुका म्हणे', 'तुका म्हणे')).toBe(1);
    expect(levenshteinRatio('तुका म्हणे', 'तुका म्हणे')).toBe(1);
  });

  test('completely different strings score low', () => {
    expect(bigramDice(REAL.a, REAL.d)).toBeLessThan(0.4);
    expect(levenshteinRatio(REAL.a, REAL.d)).toBeLessThan(0.4);
  });
});

describe('retrieveBest (stage 1)', () => {
  test('OCR-noisy first line retrieves the right entry', () => {
    const { index } = buildFuzzy();
    const noisy = 'तुका म्हणे पांडुरंगा । घडो आतां माझा संगा'.replace('पांडुरंगा', 'पांडुरंग');
    const r = retrieveBest(normalizeLine(noisy), index, 0.5);
    expect(r.reason).toBe('retrieved');
    expect(r.entry.id).toBe('ws-a');
  });

  test('unknown first line is rejected at retrieval', () => {
    const { index } = buildFuzzy();
    const r = retrieveBest('नवल काय करावें जगीं तूंचि जगीं अगोचर', index, 0.8);
    expect(r.reason).toBe('below-retrieval');
  });
});

describe('confirmFullText (stage 2)', () => {
  test('matching full texts confirm above threshold', () => {
    const conf = confirmFullText(FULL.a, FULL.a, DEFAULT_FULL_THRESHOLD);
    expect(conf.confirmed).toBe(true);
    expect(conf.reason).toBe('confirmed');
  });

  test('heavy OCR noise still confirms (majority of bigrams survive)', () => {
    const noisy = FULL.a.replace('पांडुरंगा', 'पांडुरंग').replace('संगा', 'सगा');
    const conf = confirmFullText(noisy, FULL.a, DEFAULT_FULL_THRESHOLD);
    expect(conf.confirmed).toBe(true);
  });

  test('different abhang fails the full-threshold gate', () => {
    const conf = confirmFullText(FULL.a, FULL.d, DEFAULT_FULL_THRESHOLD);
    expect(conf.confirmed).toBe(false);
    expect(conf.reason).toBe('below-full-threshold');
  });

  test('fragment (partial OCR) fails confirmation', () => {
    // First ~38% of a longer abhang: still shares many bigrams (Dice ≈ 0.55,
    // above a 0.5 threshold) but the length ratio 0.38 < 0.4 → rejected.
    const fragment = FULL.a.slice(0, Math.floor(FULL.a.length * 0.38));
    const conf = confirmFullText(fragment, FULL.a, 0.5);
    expect(conf.confirmed).toBe(false);
    expect(conf.reason).toBe('bad-length-ratio');
  });

  test('merged row (3x longer) fails the length-ratio gate', () => {
    // 3x duplication: Dice ≈ 0.5 (above a 0.4 threshold) but ratio 3.0 > 2.5.
    const merged = FULL.c + FULL.c + FULL.c + ' अतिरिक्त मजकूर';
    const conf = confirmFullText(merged, FULL.c, 0.4);
    expect(conf.confirmed).toBe(false);
    expect(conf.reason).toBe('bad-length-ratio');
  });

  test('full pipeline: noisy OCR row links to the right abhang', () => {
    const { index } = buildFuzzy();
    const noisyLine = 'तुका म्हणे पांडुरंगा । घडो आतां माझा संगा'.replace('घडो', 'घड़ो');
    const noisyFull = FULL.a.replace('घडो', 'घड़ो');
    const r = retrieveBest(normalizeLine(noisyLine), index, 0.5);
    expect(r.reason).toBe('retrieved');
    expect(r.entry.id).toBe('ws-a');
    const conf = confirmFullText(noisyFull, r.entry.fullNorm, DEFAULT_FULL_THRESHOLD);
    expect(conf.confirmed).toBe(true);
  });
});
