import { describe, expect, test } from 'bun:test';
import {
  extractTitleCandidate,
  bestMatchingFragment,
  scoreCandidate,
  rankCandidates,
  MATCH_CONFIRM_THRESHOLD,
  MATCH_MIN_SCORE,
  MAX_MATCH_CANDIDATES,
  type MatchComposition,
} from '@/src/canonical/composition-matcher';

const ABHANG: MatchComposition = {
  id: 'comp-1',
  titleMarathi: 'विठ्ठल विठ्ठल गा रे',
  titleTranslit: 'vitthal vitthal ga re',
  fullText: [
    'विठ्ठल विठ्ठल गा रे सुखाचा सागर',
    'पुंडलिका वरदा विठ्ठल सुंदर',
    'ज्ञानदेव तुका म्हणे विठ्ठल अंतर',
    'विठ्ठल विठ्ठल गा रे',
  ].join('\n'),
  slug: 'vitthal-vitthal-ga-re',
  type: 'abhang',
  saintNameMarathi: 'तुकाराम',
  saintNameTranslit: 'tukaram',
};

const OTHER_ABHANG: MatchComposition = {
  id: 'comp-2',
  titleMarathi: 'आला रे आला विठ्ठल',
  titleTranslit: 'ala re ala vitthal',
  fullText: [
    'आला रे आला विठ्ठल पंढरीत आला',
    'पुंडलिका वरदा विठ्ठल सुंदर',
    'विठ्ठल विठ्ठल गा रे',
  ].join('\n'),
  slug: 'ala-re-ala-vitthal',
  type: 'abhang',
  saintNameMarathi: null,
  saintNameTranslit: null,
};

const UNRELATED: MatchComposition = {
  id: 'comp-3',
  titleMarathi: 'ज्ञानेश्वरी अध्याय तेरावा',
  titleTranslit: 'dnyaneshwari adhyay terava',
  fullText: [
    'श्री गणेशाय नमः',
    'ज्ञानदेवांनी रचिली ज्ञानेश्वरी',
    'मराठी भाषेतील उत्कृष्ट ग्रंथ',
  ].join('\n'),
  slug: 'dnyaneshwari-adhyay-13',
  type: 'granth',
  saintNameMarathi: 'ज्ञानेश्वर',
  saintNameTranslit: 'dnyaneshwar',
};

describe('composition matcher — extractTitleCandidate', () => {
  test('TC-MATCH-001: takes the first line as the title candidate', () => {
    expect(extractTitleCandidate('विठ्ठल विठ्ठल गा रे\nपुंडलिका वरदा\n')).toBe(
      'विठ्ठल विठ्ठल गा रे'
    );
  });

  test('TC-MATCH-002: explicit title wins over the first line', () => {
    expect(extractTitleCandidate('विठ्ठल विठ्ठल गा रे', 'माझा अभंग')).toBe('माझा अभंग');
    expect(extractTitleCandidate('विठ्ठल विठ्ठल गा रे', '  ')).toBe('विठ्ठल विठ्ठल गा रे');
  });
});

describe('composition matcher — bestMatchingFragment', () => {
  test('TC-MATCH-003: returns the composition line closest to a transcript line', () => {
    const fragment = bestMatchingFragment('पुंडलिका वरदा विठ्ठल सुंदर', ABHANG.fullText);
    expect(fragment).toContain('पुंडलिका वरदा');
  });

  test('TC-MATCH-004: null when nothing is close', () => {
    expect(bestMatchingFragment('xyz abc def ghi', ABHANG.fullText)).toBeNull();
    expect(bestMatchingFragment('', ABHANG.fullText)).toBeNull();
  });
});

describe('composition matcher — scoreCandidate', () => {
  test('TC-MATCH-005: matching title + shared verses scores above threshold, method=title', () => {
    const transcript = [
      'विठ्ठल विठ्ठल गा रे',
      'विठ्ठल विठ्ठल गा रे सुखाचा सागर',
      'पुंडलिका वरदा विठ्ठल सुंदर',
      'ज्ञानदेव तुका म्हणे विठ्ठल अंतर',
    ].join('\n');
    const { score, method, matchedText } = scoreCandidate(
      transcript,
      extractTitleCandidate(transcript),
      ABHANG
    );
    expect(score).toBeGreaterThan(MATCH_CONFIRM_THRESHOLD);
    expect(method).toBe('title');
    expect(matchedText).not.toBeNull();
  });

  test('TC-MATCH-006: shared verses but different title → method=verse', () => {
    const transcript = [
      'माझा आनंद गा रे सुखाचा सागर',
      'पुंडलिका वरदा विठ्ठल सुंदर',
      'विठ्ठल विठ्ठल गा रे',
    ].join('\n');
    const { score, method } = scoreCandidate(transcript, extractTitleCandidate(transcript), ABHANG);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(MATCH_CONFIRM_THRESHOLD); // wrong title drags it down
    expect(method).toBe('verse');
  });

  test('TC-MATCH-007: unrelated composition scores near zero', () => {
    const transcript = [
      'विठ्ठल विठ्ठल गा रे',
      'पुंडलिका वरदा विठ्ठल सुंदर',
    ].join('\n');
    const { score } = scoreCandidate(transcript, extractTitleCandidate(transcript), UNRELATED);
    expect(score).toBeLessThan(MATCH_MIN_SCORE);
  });
});

describe('composition matcher — rankCandidates', () => {
  test('TC-MATCH-008: ranks best first, drops no-signal candidates, caps at MAX', () => {
    const transcript = [
      'विठ्ठल विठ्ठल गा रे',
      'विठ्ठल विठ्ठल गा रे सुखाचा सागर',
      'पुंडलिका वरदा विठ्ठल सुंदर',
      'ज्ञानदेव तुका म्हणे विठ्ठल अंतर',
      'विठ्ठल विठ्ठल गा रे',
    ].join('\n');
    const title = extractTitleCandidate(transcript);

    // 6 compositions: the real one, a partial one, and four unrelated
    const many = [
      ABHANG,
      OTHER_ABHANG,
      UNRELATED,
      { ...UNRELATED, id: 'comp-4' },
      { ...UNRELATED, id: 'comp-5' },
      { ...UNRELATED, id: 'comp-6' },
    ];

    const ranked = rankCandidates(transcript, title, many);

    expect(ranked.length).toBeLessThanOrEqual(MAX_MATCH_CANDIDATES);
    expect(ranked.length).toBeGreaterThanOrEqual(2);
    expect(ranked[0].compositionId).toBe('comp-1');
    expect(ranked[0].meetsThreshold).toBe(true);
    // Unrelated compositions are dropped entirely
    expect(ranked.some((c) => c.compositionId === 'comp-3')).toBe(false);
    // Strictly descending scores
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].score).toBeLessThanOrEqual(ranked[i - 1].score);
    }
  });

  test('TC-MATCH-009: partial overlap lands above the drop floor but below threshold', () => {
    const transcript = [
      'माझा आनंद गा रे सुखाचा सागर',
      'पुंडलिका वरदा विठ्ठल सुंदर',
      'विठ्ठल विठ्ठल गा रे',
    ].join('\n');
    const ranked = rankCandidates(transcript, extractTitleCandidate(transcript), [
      ABHANG,
      UNRELATED,
    ]);
    const partial = ranked.find((c) => c.compositionId === 'comp-1');
    expect(partial).toBeDefined();
    expect(partial!.score).toBeGreaterThanOrEqual(MATCH_MIN_SCORE);
    expect(partial!.meetsThreshold).toBe(false);
  });

  test('TC-MATCH-010: empty transcript yields no candidates', () => {
    expect(rankCandidates('', '', [ABHANG])).toEqual([]);
  });
});
