/**
 * Digital Pandharpur — Lyrics cleaning & quality scoring (pure, testable).
 *
 * Many catalog entries were imported from YouTube descriptions, where the
 * "lyrics" field carries video metadata: timestamps, ►/▶ markers, URLs,
 * hashtags, "Singer -", "Label -", track lists, subscribe/copyright
 * boilerplate, and English-only description lines. This module removes those
 * lines conservatively — a Devanagari line is NEVER rewritten or dropped
 * unless it matches a hard noise signal — and scores how lyric-like a text
 * is, so importers and the denoise script can act honestly.
 */

const DEVANAGARI = /[\u0900-\u097F]/;

/** Hard noise signals that mark a line as video metadata, not lyrics. */
const NOISE_LINE_PATTERNS: RegExp[] = [
  // Timestamps: 00:00, 12:34, 1:02:03, 1:02.03 (ASCII or Devanagari digits).
  // Note: \b is ASCII-\w based, so Devanagari digits never see a boundary —
  // anchor on start-of-line / whitespace instead.
  /(?:^|\s)[\d\u0966-\u096F]{1,2}:[\d\u0966-\u096F]{2}(?::[\d\u0966-\u096F]{2})?(?=$|\s|[-.,:])/,
  /(?:^|\s)[\d\u0966-\u096F]{1,2}:[\d\u0966-\u096F]{2}\.[\d\u0966-\u096F]{2}(?=$|\s|[-.,:])/,
  // Player/play markers
  /[►▶▸⏵⏭]/,
  // URLs
  /\b(https?:\/\/|www\.)\S+/i,
  // Pure hashtag lines (#shorts #vitthal)
  /^[#＃]\S+(\s+[#＃]\S+)*$/,
  // Video/description boilerplate
  /\b(subscribe|share this|like this|comment|hit the bell|turn on notifications|watch full video|thanks for watching|thank you for watching|sing along|karaoke|live streaming|prism live studio|all rights reserved|copyright|do not reupload|follow me on)\b/i,
  /\b(lyrical video|lyric video|video song|official video|full song|album song)\b/i,
  // Credit lines: Singer / Label / Album / Song / Music / Lyrics by ...
  /^\s*(singer|singers|label|album|song|music|lyrics?|composer|director|producer|channel|copyrights?|tune|cast|movie|film|presented by|audio on|digital partner)\s*[:—-]/i,
  // YouTube compilation titles (non-stop, best of, top ... bhakti geete)
  /^\s*(non[- ]stop|best of|top \d+|most popular|old marathi songs)\b/i,
];

/** A line that is purely whitespace. */
function isBlank(line: string): boolean {
  return line.trim().length === 0;
}

/** Structural separators (danda, dashes, dots) keep stanza structure. */
const STRUCTURAL_LINE = /^[॥।|,\.\-–—~…\s]+$/;

export interface CleanLyricsResult {
  cleaned: string;
  kept: string[];
  removedLines: { line: string; reason: string }[];
  changed: boolean;
}

/** Drop one line and explain why (used by the report/tests). */
export function classifyLine(line: string): { keep: boolean; reason: string } {
  const trimmed = line.trim();
  if (isBlank(trimmed)) return { keep: false, reason: 'blank' };
  // Stanza separators (॥, ॥॥, —) are structure, not noise.
  if (STRUCTURAL_LINE.test(trimmed)) return { keep: true, reason: 'structural' };
  for (const pattern of NOISE_LINE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { keep: false, reason: `noise: ${pattern.source}` };
    }
  }
  // English-only lines (no Devanagari) are almost always YouTube description
  // text inside a lyrics field. Real lyric lines carry Devanagari.
  if (!DEVANAGARI.test(trimmed)) {
    return { keep: false, reason: 'no Devanagari content' };
  }
  return { keep: true, reason: '' };
}

/**
 * Clean a raw lyrics text. Returns the cleaned text, the kept lines, and what
 * was removed. The function is pure — callers decide whether to persist.
 */
export function cleanLyrics(raw: string): CleanLyricsResult {
  const lines = raw.split(/\r?\n/);
  const kept: string[] = [];
  const removedLines: { line: string; reason: string }[] = [];

  for (const line of lines) {
    const { keep, reason } = classifyLine(line);
    if (keep) {
      kept.push(line.trim());
    } else if (line.trim().length > 0) {
      removedLines.push({ line: line.trim(), reason });
    }
  }

  const cleaned = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return {
    cleaned,
    kept,
    removedLines,
    changed: cleaned !== raw.trim(),
  };
}

/**
 * How lyric-like is this text? 0..1 — the share of non-empty lines that are
 * Devanagari and clean, weighted by length. 1.0 = clean lyrics.
 */
export function lyricsQualityScore(fullText: string): number {
  const lines = fullText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return 0;

  let cleanLines = 0;
  for (const line of lines) {
    const { keep } = classifyLine(line);
    if (keep) cleanLines++;
  }
  const ratio = cleanLines / lines.length;
  // Very short texts are more likely to be fragments — a small length penalty.
  const lengthFactor = Math.min(1, lines.length / 8);
  return ratio * lengthFactor;
}

export type LyricsClass = 'lyrics' | 'noisy' | 'fragment';

/** Coarse, honest classification used by the denoise report. */
export function classifyLyrics(fullText: string): LyricsClass {
  const score = lyricsQualityScore(fullText);
  const devanagariLines = fullText
    .split(/\r?\n/)
    .filter((l) => DEVANAGARI.test(l)).length;
  if (score >= 0.7 && devanagariLines >= 4) return 'lyrics';
  if (devanagariLines < 4) return 'fragment';
  return 'noisy';
}
