import { describe, expect, test } from 'bun:test';

import {
  cleanLyrics,
  classifyLine,
  classifyLyrics,
  lyricsQualityScore,
} from '@/src/lib/lyrics-clean';

describe('TC-LYRICS-001 noise line removal', () => {
  test('timestamp lines are dropped', () => {
    expect(classifyLine('00:00:00 - Intro').keep).toBe(false);
    expect(classifyLine('02:57 केशवा माधवा').keep).toBe(false);
    expect(classifyLine('१२:३४ test').keep).toBe(false);
  });

  test('play-marker lines are dropped', () => {
    expect(classifyLine('►Jya suka karni dev ORIGINAL').keep).toBe(false);
  });

  test('URL and hashtag lines are dropped', () => {
    expect(classifyLine('https://www.youtube.com/watch?v=x').keep).toBe(false);
    expect(classifyLine('#shorts #vitthal #abhang').keep).toBe(false);
  });

  test('credit and boilerplate lines are dropped', () => {
    expect(classifyLine('Singer - Mahesh Hiremath').keep).toBe(false);
    expect(classifyLine('Label - Naina Music Co').keep).toBe(false);
    expect(classifyLine('Lyrical video of heart touching Marathi song').keep).toBe(false);
    expect(classifyLine('Please subscribe to our channel').keep).toBe(false);
    expect(classifyLine('Copyright Disclaimer under section 107').keep).toBe(false);
    expect(classifyLine('Non- Stop Prahlad Shinde Bhakti Geete').keep).toBe(false);
  });

  test('English-only description lines are dropped', () => {
    expect(classifyLine('Shorts remixing this video 55 Shorts').keep).toBe(false);
    expect(classifyLine('Enjoy & stay tuned with us!').keep).toBe(false);
  });

  test('structural danda separators are kept', () => {
    expect(classifyLine('॥').keep).toBe(true);
    expect(classifyLine('॥ श्री ॥').keep).toBe(true);
  });
});

describe('TC-LYRICS-002 lyric lines are preserved verbatim', () => {
  const LYRICS = [
    'ज्ञानदेवा तुझ्या नामाची',
    'जोडी चाले सदा गर्जना',
    '॥ ध्रु ॥',
  ].join('\n');

  test('clean lyrics are unchanged', () => {
    const result = cleanLyrics(LYRICS);
    expect(result.changed).toBe(false);
    expect(result.cleaned).toBe(LYRICS);
    expect(result.removedLines).toEqual([]);
  });

  test('Devanagari lines are never rewritten around noise', () => {
    const raw = [
      'ज्ञानदेवा तुझ्या नामाची',
      '►This stream is created with #PRISMLiveStudio',
      'जोडी चाले सदा गर्जना',
      'Singer - Mahesh Hiremath',
      '00:00:00 - Intro',
    ].join('\n');
    const result = cleanLyrics(raw);
    expect(result.cleaned).toContain('ज्ञानदेवा तुझ्या नामाची');
    expect(result.cleaned).toContain('जोडी चाले सदा गर्जना');
    expect(result.cleaned).not.toContain('►');
    expect(result.cleaned).not.toContain('Singer');
    expect(result.cleaned).not.toContain('00:00');
    expect(result.removedLines.length).toBe(3);
    expect(result.changed).toBe(true);
  });
});

describe('TC-LYRICS-003 quality scoring', () => {
  test('clean multi-line lyrics score high', () => {
    const clean = Array.from({ length: 8 }, (_, i) => `ओवी ${i + 1} संपूर्ण पाठ्य`).join('\n');
    const score = lyricsQualityScore(clean);
    expect(score).toBeGreaterThanOrEqual(0.9);
    expect(classifyLyrics(clean)).toBe('lyrics');
  });

  test('noisy description text scores low', () => {
    const noisy = [
      'Non-Stop Bhakti Geete',
      '00:00:00 - Intro',
      'Singer - X',
      '#shorts',
      'https://youtube.com/watch?v=abc',
    ].join('\n');
    const score = lyricsQualityScore(noisy);
    expect(score).toBeLessThan(0.5);
    expect(classifyLyrics(noisy)).toBe('fragment');
  });

  test('short fragments are flagged, not silently passed', () => {
    expect(classifyLyrics('एक ओळ')).toBe('fragment');
  });
});
