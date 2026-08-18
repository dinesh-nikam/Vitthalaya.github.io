/**
 * Digital Pandharpur — WER / CER evaluation metrics (pure, testable).
 *
 * Word Error Rate and Character Error Rate between a golden reference
 * transcript and a model's hypothesis. Both sides are normalized with the
 * project's Marathi comparison normalization (NFC, OCR fixes, chandrabindu
 * → anusvara, punctuation stripped) so Devanagari variants and ॥/|| markers
 * never inflate the error rate artificially.
 *
 * This module is pure — no I/O — so the metrics are unit-testable and can be
 * reused by the offline evaluation harness, CI gates and the admin A/B flow.
 */

import { normalizeForComparison } from '@/src/canonical/normalization';

export interface EditCounts {
  substitutions: number;
  insertions: number;
  deletions: number;
}

export interface TranscriptMetrics {
  wer: number; // 0..1 — word error rate (1 when nothing matches)
  cer: number; // 0..1 — character error rate
  refWords: number;
  hypWords: number;
  substitutions: number;
  insertions: number;
  deletions: number;
  evaluated: boolean; // false when the reference is empty (cannot score)
}

/** Classic Wagner–Fischer edit distance over a sequence of items. */
export function editDistance<T>(reference: T[], hypothesis: T[]): number {
  const n = reference.length;
  const m = hypothesis.length;
  if (n === 0) return m;
  if (m === 0) return n;

  // Two rolling rows — O(min(n,m)) memory.
  let prev = new Array<number>(m + 1);
  let curr = new Array<number>(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;

  for (let i = 1; i <= n; i++) {
    curr[0] = i;
    for (let j = 1; j <= m; j++) {
      const cost = reference[i - 1] === hypothesis[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost // substitution / match
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[m];
}

/** Break an edit distance into substitution/insertion/deletion counts (backtrace). */
export function decomposeEdits<T>(
  reference: T[],
  hypothesis: T[]
): EditCounts {
  const n = reference.length;
  const m = hypothesis.length;

  // Full DP table for backtrace (metrics are small; clarity over memory).
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = reference[i - 1] === hypothesis[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  const counts: EditCounts = { substitutions: 0, insertions: 0, deletions: 0 };
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && reference[i - 1] === hypothesis[j - 1]) {
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      counts.substitutions++;
      i--;
      j--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      counts.insertions++;
      j--;
    } else {
      counts.deletions++;
      i--;
    }
  }
  return counts;
}

/** Words of a transcript after Marathi normalization. */
export function wordsOf(text: string): string[] {
  return normalizeForComparison(text)
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/** Characters of a transcript after Marathi normalization (spaces stripped). */
export function charsOf(text: string): string[] {
  return [...normalizeForComparison(text).replace(/\s+/g, '')];
}

/**
 * WER + CER for one reference/hypothesis pair.
 * An empty reference is unscorable — `evaluated: false`, wer/cer 0.
 */
export function computeMetrics(reference: string, hypothesis: string): TranscriptMetrics {
  const refWords = wordsOf(reference);
  const hypWords = wordsOf(hypothesis);

  if (refWords.length === 0) {
    return {
      wer: 0,
      cer: 0,
      refWords: 0,
      hypWords: hypWords.length,
      substitutions: 0,
      insertions: 0,
      deletions: 0,
      evaluated: false,
    };
  }

  const wordEdits = editDistance(refWords, hypWords);
  const counts = decomposeEdits(refWords, hypWords);

  const refChars = charsOf(reference);
  const hypChars = charsOf(hypothesis);
  const charEdits = editDistance(refChars, hypChars);

  return {
    wer: wordEdits / refWords.length,
    cer: refChars.length > 0 ? charEdits / refChars.length : 0,
    refWords: refWords.length,
    hypWords: hypWords.length,
    substitutions: counts.substitutions,
    insertions: counts.insertions,
    deletions: counts.deletions,
    evaluated: true,
  };
}
