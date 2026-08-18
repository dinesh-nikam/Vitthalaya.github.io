/**
 * Digital Pandharpur — Canonical Corrector (Audio Platform, T2)
 *
 * Aligns an ASR transcript against the canonical text of the CONFIRMED
 * matched composition and corrects only *obvious* ASR errors using the
 * canonical text.
 *
 * Honesty contract (spec §6): the original ASR is preserved verbatim, never
 * silently overwritten. A line is corrected only when it aligns to a
 * canonical line with high similarity (≥ LINE_CORRECT_THRESHOLD); everything
 * else stays as the ASR produced it. Outputs:
 *   - correctedText      — ASR corrected in place (canonical-dominant on
 *                          confident lines, ASR verbatim otherwise)
 *   - diffJson           — line + word-level alignment for audit/display
 *   - confidence         — 0..1, weighted by similarity and coverage
 *   - errorType          — dominant error class across corrected lines
 *
 * The correction is stored as a pending TranscriptCorrection; a moderator
 * verifies it before it can ever feed training data.
 */

import { db } from '../db/client';
import {
  levenshteinSimilarity,
  jaccardWordSimilarity,
} from './fuzzy-matcher';
import { normalizeForComparison, splitIntoLines } from './normalization';
import { getCompositionMatches } from './composition-matcher';
import { appendApprovedCorrection } from '../eval/datasets';

// ─── Thresholds ─────────────────────────────────────────────────────────────

/** Line similarity at/above which the canonical line replaces the ASR line. */
export const LINE_CORRECT_THRESHOLD = 0.8;
/** Token similarity at/above which two words are treated as the same word. */
export const WORD_SIMILARITY_THRESHOLD = 0.75;
/** Minimum similarity for a line pair to count toward confidence. */
export const MIN_ALIGNED_SIMILARITY = 0.5;

export const ERROR_TYPES = [
  'vocabulary',
  'homophone',
  'transliteration',
  'segmentation',
  'none',
] as const;

export type ErrorType = (typeof ERROR_TYPES)[number];

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WordDiff {
  /** ASR word (normalized for comparison); '' when the word is new in canonical. */
  original: string;
  /** Canonical word; '' when the ASR word was dropped. */
  corrected: string;
}

export interface LineAlignment {
  /** Original ASR line, verbatim ('' for canonical-only lines). */
  asr: string;
  /** Aligned canonical line ('' for ASR-only lines). */
  canonical: string;
  similarity: number;
  corrected: boolean;
  wordDiffs: WordDiff[];
}

export interface CorrectionResult {
  /** The ASR transcript exactly as the speech engine produced it. */
  originalAsr: string;
  /** ASR corrected in place — never reorders, never invents content. */
  correctedText: string;
  /** The canonical reference used for correction. */
  canonicalText: string;
  diffJson: Record<string, unknown>;
  confidence: number;
  errorType: ErrorType;
  linesTotal: number;
  linesCorrected: number;
  wordsChanged: number;
  /** False when nothing was confidently corrected. */
  changed: boolean;
}

// ─── Pure core (no I/O, unit-tested) ────────────────────────────────────────

function lineSimilarity(asrLine: string, canonicalLine: string): number {
  if (!asrLine || !canonicalLine) return 0;
  const lev = levenshteinSimilarity(asrLine, canonicalLine);
  const jac = jaccardWordSimilarity(asrLine, canonicalLine);
  return 0.6 * lev + 0.4 * jac;
}

/**
 * Longest common subsequence over tokens, using normalized equality.
 * Returns the index pairs (asrIdx, canIdx) in order.
 */
function lcsTokenPairs(
  asrTokens: string[],
  canTokens: string[]
): Array<{ a: number; c: number }> {
  const norm = (t: string) => normalizeForComparison(t);
  const n = asrTokens.length;
  const m = canTokens.length;
  if (n === 0 || m === 0) return [];

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (norm(asrTokens[i]) === norm(canTokens[j])) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const pairs: Array<{ a: number; c: number }> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (norm(asrTokens[i]) === norm(canTokens[j])) {
      pairs.push({ a: i, c: j });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
}

/** Word-level diff between one ASR line and its canonical counterpart. */
export function computeWordDiffs(asrLine: string, canonicalLine: string): WordDiff[] {
  const asrTokens = asrLine.split(/\s+/).filter(Boolean);
  const canTokens = canonicalLine.split(/\s+/).filter(Boolean);
  const pairs = lcsTokenPairs(asrTokens, canTokens);

  const inLcsA = new Set(pairs.map((p) => p.a));
  const inLcsC = new Set(pairs.map((p) => p.c));

  const removed = asrTokens.filter((_, idx) => !inLcsA.has(idx));
  const added = canTokens.filter((_, idx) => !inLcsC.has(idx));

  const diffs: WordDiff[] = [];
  const count = Math.max(removed.length, added.length);
  for (let k = 0; k < count; k++) {
    diffs.push({
      original: removed[k] ?? '',
      corrected: added[k] ?? '',
    });
  }
  return diffs;
}

/**
 * Needleman-Wunsch alignment of ASR lines to canonical lines (maximizes total
 * line similarity, gap penalty for unaligned lines). Preserves order.
 */
export function alignLines(asrLines: string[], canonicalLines: string[]): LineAlignment[] {
  const n = asrLines.length;
  const m = canonicalLines.length;

  if (n === 0) {
    return canonicalLines.map((line) => ({
      asr: '',
      canonical: line,
      similarity: 0,
      corrected: false,
      wordDiffs: [],
    }));
  }
  if (m === 0) {
    return asrLines.map((line) => ({
      asr: line,
      canonical: '',
      similarity: 0,
      corrected: false,
      wordDiffs: [],
    }));
  }

  const GAP = -1.2;
  // Pairs below the alignment floor score worse than a gap, so unrelated
  // lines are left unaligned (and thus uncorrected) instead of being paired.
  const UNALIGNED = -2.0;
  const sim = (i: number, j: number) => {
    const raw = lineSimilarity(asrLines[i], canonicalLines[j]);
    return raw >= MIN_ALIGNED_SIMILARITY ? 2 * raw - 1 : UNALIGNED;
  };

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(-Infinity));
  const trace: string[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(''));

  dp[0][0] = 0;
  for (let i = 1; i <= n; i++) {
    dp[i][0] = dp[i - 1][0] + GAP;
    trace[i][0] = 'up';
  }
  for (let j = 1; j <= m; j++) {
    dp[0][j] = dp[0][j - 1] + GAP;
    trace[0][j] = 'left';
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diag = dp[i - 1][j - 1] + sim(i - 1, j - 1);
      const up = dp[i - 1][j] + GAP;
      const left = dp[i][j - 1] + GAP;
      if (diag >= up && diag >= left) {
        dp[i][j] = diag;
        trace[i][j] = 'diag';
      } else if (up >= left) {
        dp[i][j] = up;
        trace[i][j] = 'up';
      } else {
        dp[i][j] = left;
        trace[i][j] = 'left';
      }
    }
  }

  const alignments: LineAlignment[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const step = trace[i][j];
    if (step === 'diag') {
      const asr = asrLines[i - 1];
      const canonical = canonicalLines[j - 1];
      const similarity = lineSimilarity(asr, canonical);
      const corrected = similarity >= LINE_CORRECT_THRESHOLD;
      alignments.unshift({
        asr,
        canonical,
        similarity,
        corrected,
        wordDiffs: corrected ? computeWordDiffs(asr, canonical) : [],
      });
      i--;
      j--;
    } else if (step === 'up') {
      alignments.unshift({ asr: asrLines[i - 1], canonical: '', similarity: 0, corrected: false, wordDiffs: [] });
      i--;
    } else {
      alignments.unshift({ asr: '', canonical: canonicalLines[j - 1], similarity: 0, corrected: false, wordDiffs: [] });
      j--;
    }
  }

  return alignments;
}

/** Classify the dominant error type across corrected line pairs. */
export function classifyErrorType(asrLine: string, canonicalLine: string): ErrorType {
  const lev = levenshteinSimilarity(asrLine, canonicalLine);
  const jac = jaccardWordSimilarity(asrLine, canonicalLine);
  const asrHasLatin = /[a-zA-Z]/.test(asrLine);
  const canHasLatin = /[a-zA-Z]/.test(canonicalLine);
  if (asrHasLatin !== canHasLatin) return 'transliteration';
  if (lev >= 0.8) return 'homophone';
  if (jac >= 0.6 && lev < 0.6) return 'segmentation';
  return 'vocabulary';
}

/**
 * Align the transcript to the canonical text and produce a conservative
 * correction. Pure — no DB, no I/O.
 */
export function alignAndCorrect(transcript: string, canonicalText: string): CorrectionResult {
  const asrLines = splitIntoLines(transcript);
  const canonicalLines = splitIntoLines(canonicalText);

  if (asrLines.length === 0) {
    return {
      originalAsr: transcript,
      correctedText: transcript,
      canonicalText,
      diffJson: { version: 1, alignedLines: [], stats: { linesTotal: 0, linesCorrected: 0, wordsChanged: 0 } },
      confidence: 0,
      errorType: 'none',
      linesTotal: 0,
      linesCorrected: 0,
      wordsChanged: 0,
      changed: false,
    };
  }

  const alignments = alignLines(asrLines, canonicalLines);

  const correctedLines: string[] = [];
  const typeVotes: ErrorType[] = [];
  let weightedSim = 0;
  let totalWeight = 0;
  let coveredChars = 0;
  let asrChars = 0;
  let wordsChanged = 0;

  for (const alignment of alignments) {
    if (alignment.asr === '') continue; // canonical-only line — nothing to correct

    asrChars += alignment.asr.length;
    if (alignment.corrected) {
      correctedLines.push(alignment.canonical);
      coveredChars += alignment.asr.length;
      wordsChanged += alignment.wordDiffs.length;
      // Only lines with an actual word change vote on the error type — a
      // line that aligned to an identical canonical line is not an error.
      if (alignment.wordDiffs.length > 0) {
        typeVotes.push(classifyErrorType(alignment.asr, alignment.canonical));
      }
      const weight = Math.max(alignment.asr.length, alignment.canonical.length);
      weightedSim += alignment.similarity * weight;
      totalWeight += weight;
    } else {
      correctedLines.push(alignment.asr); // verbatim — never silently changed
    }
  }

  const linesCorrected = alignments.filter((a) => a.corrected && a.asr !== '').length;

  // Confidence: average similarity of corrected pairs weighted by length,
  // scaled by how much of the ASR the corrections actually covered.
  const coverage = asrChars > 0 ? coveredChars / asrChars : 0;
  const avgSim = totalWeight > 0 ? weightedSim / totalWeight : 0;
  const confidence = Math.max(0, Math.min(1, 0.5 * avgSim + 0.5 * coverage));

  const errorType: ErrorType = typeVotes.length > 0 ? majorityVote(typeVotes) : 'none';

  return {
    originalAsr: transcript,
    correctedText: correctedLines.join('\n'),
    canonicalText,
    diffJson: {
      version: 1,
      alignedLines: alignments,
      stats: {
        linesTotal: asrLines.length,
        linesCorrected,
        wordsChanged,
        coveredChars,
        asrChars,
      },
    },
    confidence,
    errorType,
    linesTotal: asrLines.length,
    linesCorrected,
    wordsChanged,
    // "Changed" means the corrected text actually differs — lines that
    // aligned to an identical canonical line produce no visible change.
    changed: wordsChanged > 0,
  };
}

export interface ManualEditResult {
  /** The ASR exactly as the speech engine produced it (never overwritten). */
  originalAsr: string;
  /** The user's edited text, verbatim. */
  correctedText: string;
  diffJson: Record<string, unknown>;
  confidence: number;
  errorType: ErrorType;
  linesTotal: number;
  linesCorrected: number;
  wordsChanged: number;
  changed: boolean;
}

/**
 * Pure alignment for a MANUAL user edit: aligns the original ASR lines
 * against the user's edited lines and reports an honest word-level diff.
 * The user's text is always kept verbatim (never re-corrected), the original
 * ASR is never touched — this only describes what the user changed.
 */
export function alignManualEdit(originalAsr: string, editedText: string): ManualEditResult {
  const asrLines = splitIntoLines(originalAsr);
  const editedLines = splitIntoLines(editedText);

  if (asrLines.length === 0) {
    return {
      originalAsr,
      correctedText: editedText,
      diffJson: {
        version: 1,
        alignedLines: [],
        stats: { linesTotal: 0, linesCorrected: 0, wordsChanged: 0 },
      },
      confidence: 0,
      errorType: 'none',
      linesTotal: 0,
      linesCorrected: 0,
      wordsChanged: 0,
      changed: editedText.trim().length > 0,
    };
  }

  const alignments = alignLines(asrLines, editedLines);

  const typeVotes: ErrorType[] = [];
  let weightedSim = 0;
  let totalWeight = 0;
  let coveredChars = 0;
  let asrChars = 0;
  let wordsChanged = 0;
  let linesAdded = 0;

  for (const alignment of alignments) {
    if (alignment.asr === '') {
      // Edited-only line — pure addition (nothing in ASR to compare). It is
      // still a real change the user made, so it counts toward `changed`.
      if (alignment.canonical.trim().length > 0) linesAdded++;
      continue;
    }
    asrChars += alignment.asr.length;
    if (alignment.wordDiffs.length > 0) {
      coveredChars += alignment.asr.length;
      wordsChanged += alignment.wordDiffs.length;
      typeVotes.push(classifyErrorType(alignment.asr, alignment.canonical));
      const weight = Math.max(alignment.asr.length, alignment.canonical.length);
      weightedSim += alignment.similarity * weight;
      totalWeight += weight;
    } else {
      // Unchanged line — adds zero diff weight; counted as fully similar so
      // coverage is the only driver of confidence for untouched text.
      const weight = alignment.asr.length;
      weightedSim += alignment.similarity * weight;
      totalWeight += weight;
    }
  }

  const linesCorrected = alignments.filter((a) => a.asr !== '' && a.wordDiffs.length > 0).length;
  const coverage = asrChars > 0 ? coveredChars / asrChars : 0;
  const avgSim = totalWeight > 0 ? weightedSim / totalWeight : 0;
  const confidence = Math.max(0, Math.min(1, 0.5 * avgSim + 0.5 * coverage));
  const errorType: ErrorType = typeVotes.length > 0 ? majorityVote(typeVotes) : 'none';

  return {
    originalAsr,
    correctedText: editedText,
    diffJson: {
      version: 1,
      alignedLines: alignments,
      stats: {
        linesTotal: asrLines.length,
        linesCorrected,
        wordsChanged,
        coveredChars,
        asrChars,
        linesAdded,
      },
    },
    confidence,
    errorType,
    linesTotal: asrLines.length,
    linesCorrected,
    wordsChanged,
    changed: wordsChanged > 0 || linesAdded > 0,
  };
}

function majorityVote(votes: ErrorType[]): ErrorType {
  const counts = new Map<ErrorType, number>();
  for (const vote of votes) {
    counts.set(vote, (counts.get(vote) ?? 0) + 1);
  }
  let best: ErrorType = votes[0];
  let bestCount = -1;
  for (const [type, count] of counts) {
    if (count > bestCount) {
      best = type;
      bestCount = count;
    }
  }
  return best;
}

// ─── Persistence ────────────────────────────────────────────────────────────

export interface SaveCorrectionInput {
  uploadedFileId: string;
  authorId: string;
  originalAsr: string;
  correctedText: string;
  canonicalText: string;
  diffJson: Record<string, unknown>;
  confidence: number;
  errorType: string;
  modelVersion?: string | null;
  notes?: string | null;
}

/**
 * Store a correction. One pending correction per upload — a newer model run
 * replaces the previous pending one instead of stacking duplicates. Approved
 * corrections are never overwritten.
 */
export async function saveTranscriptCorrection(
  input: SaveCorrectionInput
): Promise<{ id: string; status: string; created: boolean }> {
  const existing = await db.transcriptCorrection.findFirst({
    where: { uploadedFileId: input.uploadedFileId, status: 'pending' },
    select: { id: true },
  });

  const data = {
    uploadedFileId: input.uploadedFileId,
    authorId: input.authorId,
    originalAsr: input.originalAsr,
    correctedText: input.correctedText,
    canonicalText: input.canonicalText,
    diffJson: JSON.stringify(input.diffJson),
    confidence: input.confidence,
    errorType: input.errorType,
    modelVersion: input.modelVersion ?? null,
    notes: input.notes ?? null,
  };

  if (existing) {
    await db.transcriptCorrection.update({ where: { id: existing.id }, data });
    return { id: existing.id, status: 'pending', created: false };
  }

  const created = await db.transcriptCorrection.create({ data });
  return { id: created.id, status: created.status, created: true };
}

export interface RunCorrectionInput {
  uploadedFileId: string;
  transcript: string;
  authorId: string;
  modelVersion?: string | null;
}

export interface RunCorrectionResult extends CorrectionResult {
  correctionId: string | null;
  reason?: string;
}

/**
 * Orchestrate a correction for an upload. Correction only runs against a
 * CONFIRMED composition match — never a mere candidate — so the canonical
 * reference is trustworthy. Returns an honest `reason` when there is no
 * confirmed match or nothing could be corrected.
 */
export async function runCanonicalCorrection(
  input: RunCorrectionInput
): Promise<RunCorrectionResult> {
  const matches = await getCompositionMatches(input.uploadedFileId);
  const confirmed = matches.find(
    (match) => match.status === 'confirmed' && match.userConfirmed
  );

  if (!confirmed) {
    return {
      originalAsr: input.transcript,
      correctedText: input.transcript,
      canonicalText: '',
      diffJson: { version: 1, alignedLines: [], stats: {} },
      confidence: 0,
      errorType: 'none',
      linesTotal: 0,
      linesCorrected: 0,
      wordsChanged: 0,
      changed: false,
      correctionId: null,
      reason: 'No confirmed composition match — correction skipped (never correct against a guess).',
    };
  }

  const canonicalText = confirmed.composition.fullText;
  if (!canonicalText || canonicalText.trim().length === 0) {
    return {
      originalAsr: input.transcript,
      correctedText: input.transcript,
      canonicalText: '',
      diffJson: { version: 1, alignedLines: [], stats: {} },
      confidence: 0,
      errorType: 'none',
      linesTotal: 0,
      linesCorrected: 0,
      wordsChanged: 0,
      changed: false,
      correctionId: null,
      reason: 'Confirmed composition has no canonical text to correct against.',
    };
  }

  const result = alignAndCorrect(input.transcript, canonicalText);

  if (!result.changed) {
    return {
      ...result,
      correctionId: null,
      reason: 'ASR already aligns with the canonical text — no correction needed.',
    };
  }

  const saved = await saveTranscriptCorrection({
    uploadedFileId: input.uploadedFileId,
    authorId: input.authorId,
    originalAsr: result.originalAsr,
    correctedText: result.correctedText,
    canonicalText: result.canonicalText,
    diffJson: result.diffJson,
    confidence: result.confidence,
    errorType: result.errorType,
    modelVersion: input.modelVersion ?? null,
    notes: `Composition: ${confirmed.composition.titleTranslit || confirmed.composition.titleMarathi}`,
  });

  return { ...result, correctionId: saved.id };
}

/** Moderator verification — the gate before a correction can feed training data. */
export async function verifyTranscriptCorrection(
  correctionId: string,
  verifierId: string,
  approve: boolean,
  notes?: string | null
): Promise<void> {
  const correction = await db.transcriptCorrection.findUnique({
    where: { id: correctionId },
    select: {
      id: true,
      originalAsr: true,
      correctedText: true,
      modelVersion: true,
      notes: true,
      upload: {
        select: {
          originalName: true,
          extractedMetadata: true,
        },
      },
    },
  });
  if (!correction) {
    throw new Error('Correction not found.');
  }
  await db.transcriptCorrection.update({
    where: { id: correctionId },
    data: {
      verifierId,
      status: approve ? 'approved' : 'rejected',
      notes: notes ?? correction.notes,
    },
  });

  // Approved corrections feed the T3 eval loop as real golden samples —
  // reference = approved corrected text, hypothesis provenance = original ASR.
  if (approve) {
    let audioUrl: string | null = null;
    if (correction.upload.extractedMetadata) {
      try {
        const meta = JSON.parse(correction.upload.extractedMetadata);
        if (typeof meta.audioUrl === 'string') audioUrl = meta.audioUrl;
      } catch {
        // best-effort
      }
    }
    await appendApprovedCorrection({
      correctionId: correction.id,
      originalAsr: correction.originalAsr,
      correctedText: correction.correctedText,
      modelVersion: correction.modelVersion,
      audioUrl,
      uploadName: correction.upload.originalName,
    });
  }
}

/** Latest correction for an upload (for the status API / record page). */
export async function getLatestCorrection(uploadedFileId: string) {
  return db.transcriptCorrection.findFirst({
    where: { uploadedFileId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      originalAsr: true,
      correctedText: true,
      canonicalText: true,
      diffJson: true,
      confidence: true,
      errorType: true,
      modelVersion: true,
      status: true,
      createdAt: true,
    },
  });
}
