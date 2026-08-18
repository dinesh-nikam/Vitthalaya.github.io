/**
 * Digital Pandharpur — Composition Matcher (Audio Platform, T2)
 *
 * Matches a transcribed recording against the existing catalog:
 *
 *   transcript ──► candidate search (Meilisearch over titles + fullText)
 *              ──► local scoring (title similarity, verse/line overlap,
 *                                  trigram n-gram robustness)
 *              ──► top-N CompositionMatch candidates with confidence
 *              ──► threshold gate → "This may be: <Composition>" + user confirm
 *
 * Honesty contract (spec §11): the matcher NEVER silently misidentifies.
 * Candidates below MATCH_CONFIRM_THRESHOLD are presented as review material,
 * not as an answer; confirmation is always an explicit user action that
 * flips the stored row to status=confirmed.
 *
 * Scoring is pure (rankCandidates / scoreCandidate / bestMatchingFragment /
 * extractTitleCandidate) so the math is unit-tested without a database; the
 * DB/search wiring (findCompositionCandidates, persistCompositionMatches,
 * confirmCompositionMatch) sits on top.
 */

import { db } from '../db/client';
import { searchCompositions } from '../lib/search-client';
import {
  levenshteinSimilarity,
  lineLevelSimilarity,
  jaccardNgramSimilarity,
  titleSimilarity,
} from './fuzzy-matcher';
import { normalizeForComparison, splitIntoLines } from './normalization';

// ─── Thresholds (configurable, single source of truth) ─────────────────────

/** Above this, the matcher may suggest "This may be: <title>" for user confirmation. */
export const MATCH_CONFIRM_THRESHOLD = 0.62;
/** Below this, the candidate is dropped entirely — no signal. */
export const MATCH_MIN_SCORE = 0.25;
export const MAX_MATCH_CANDIDATES = 5;
export const MAX_SEARCH_CANDIDATES = 12;
export const MIN_TRANSCRIPT_LENGTH = 20;

export type MatchMethod = 'title' | 'verse' | 'ngram';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MatchComposition {
  id: string;
  titleMarathi: string;
  titleTranslit: string;
  fullText: string;
  slug: string;
  type: string;
  saintNameMarathi: string | null;
  saintNameTranslit: string | null;
}

export interface CompositionCandidate {
  compositionId: string;
  title: string;
  titleMarathi: string;
  score: number;
  method: MatchMethod;
  matchedText: string | null;
  meetsThreshold: boolean;
}

export interface MatchingResult {
  candidates: CompositionCandidate[];
  bestMatch: CompositionCandidate | null;
  bestMeetsThreshold: boolean;
  matched: boolean;
  skipped?: string;
}

// ─── Pure scoring (no I/O) ──────────────────────────────────────────────────

/** First non-empty line of the transcript is the natural title candidate. */
export function extractTitleCandidate(transcript: string, explicitTitle?: string | null): string {
  const explicit = explicitTitle?.trim();
  if (explicit && explicit.length > 0) return explicit.slice(0, 120);
  const firstLine = splitIntoLines(transcript)[0] ?? '';
  return firstLine.slice(0, 120);
}

/** The composition line most similar to any transcript line (display fragment). */
export function bestMatchingFragment(transcript: string, fullText: string): string | null {
  const transcriptLines = splitIntoLines(transcript);
  const compositionLines = splitIntoLines(fullText);
  if (transcriptLines.length === 0 || compositionLines.length === 0) return null;

  let bestLine: string | null = null;
  let bestScore = 0;

  for (const compLine of compositionLines) {
    for (const tLine of transcriptLines) {
      const score = levenshteinSimilarity(tLine, compLine);
      if (score > bestScore) {
        bestScore = score;
        bestLine = compLine;
      }
    }
  }

  return bestLine && bestScore >= 0.4 ? bestLine.slice(0, 160) : null;
}

export interface ScoredCandidate {
  score: number;
  method: MatchMethod;
  matchedText: string | null;
}

/**
 * Score one composition against the transcript. Weights favour the title
 * signal (abhangs are usually identified by their first ovi / title), then
 * verse-level structure, then trigram robustness for interleaved fragments.
 */
export function scoreCandidate(
  transcript: string,
  transcriptTitle: string,
  composition: MatchComposition
): ScoredCandidate {
  const titleScore = Math.max(
    titleSimilarity(transcriptTitle, composition.titleTranslit),
    titleSimilarity(transcriptTitle, composition.titleMarathi)
  );
  const verseScore = lineLevelSimilarity(transcript, composition.fullText);
  const ngramScore = jaccardNgramSimilarity(transcript, composition.fullText, 3);

  const score = 0.45 * titleScore + 0.35 * verseScore + 0.2 * ngramScore;

  let method: MatchMethod = 'ngram';
  if (titleScore >= 0.5 && titleScore >= verseScore && titleScore >= ngramScore) {
    method = 'title';
  } else if (verseScore >= ngramScore) {
    method = 'verse';
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    method,
    matchedText: bestMatchingFragment(transcript, composition.fullText),
  };
}

/**
 * Pure: rank a set of candidate compositions for a transcript. Sorts by
 * score, drops candidates with no signal, caps at MAX_MATCH_CANDIDATES, and
 * marks whether each meets the confirm threshold. Never picks a "best" the
 * user did not confirm — the threshold flag is only a suggestion gate.
 */
export function rankCandidates(
  transcript: string,
  title: string,
  compositions: MatchComposition[]
): CompositionCandidate[] {
  const scored: CompositionCandidate[] = [];

  for (const composition of compositions) {
    const { score, method, matchedText } = scoreCandidate(transcript, title, composition);
    if (score < MATCH_MIN_SCORE) continue;

    scored.push({
      compositionId: composition.id,
      title: composition.titleTranslit || composition.titleMarathi,
      titleMarathi: composition.titleMarathi,
      score,
      method,
      matchedText,
      meetsThreshold: score >= MATCH_CONFIRM_THRESHOLD,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_MATCH_CANDIDATES);
}

// ─── Candidate retrieval (search + DB) ─────────────────────────────────────

/**
 * Search Meilisearch (which expands transliteration + phonetic variants and
 * falls back to a DB contains-query when the engine is down) with both the
 * title fragment and the transcript head, then fetch full rows for scoring.
 */
export async function findCompositionCandidates(
  transcript: string,
  title?: string | null
): Promise<CompositionCandidate[]> {
  const titleQuery = extractTitleCandidate(transcript, title);
  const transcriptHead = normalizeForComparison(transcript).slice(0, 300);

  let searchIds: string[] = [];
  try {
    const [byTitle, byText] = await Promise.all([
      searchCompositions(titleQuery, undefined, { limit: MAX_SEARCH_CANDIDATES }),
      searchCompositions(transcriptHead, undefined, { limit: MAX_SEARCH_CANDIDATES }),
    ]);
    // Preserve search order — earlier hits are stronger evidence.
    searchIds = [...new Set([...byTitle.map((h: any) => h.id), ...byText.map((h: any) => h.id)])];
  } catch (err: any) {
    console.warn('[CompositionMatcher] Search unavailable:', err?.message ?? err);
    return [];
  }

  if (searchIds.length === 0) return [];

  const rows = await db.composition.findMany({
    where: { id: { in: searchIds }, reviewed: true },
    select: {
      id: true,
      titleMarathi: true,
      titleTranslit: true,
      fullText: true,
      slug: true,
      type: true,
      saint: { select: { nameMarathi: true, nameTranslit: true } },
    },
  });

  const byId = new Map(rows.map((row) => [row.id, row]));
  // Rank in search order so ties resolve toward the engine's ranking.
  const ordered = searchIds
    .map((id) => byId.get(id))
    .filter((row): row is (typeof rows)[number] => row != null);

  const compositions: MatchComposition[] = ordered.map((row) => ({
    id: row.id,
    titleMarathi: row.titleMarathi,
    titleTranslit: row.titleTranslit,
    fullText: row.fullText,
    slug: row.slug,
    type: row.type,
    saintNameMarathi: row.saint?.nameMarathi ?? null,
    saintNameTranslit: row.saint?.nameTranslit ?? null,
  }));

  return rankCandidates(transcript, titleQuery, compositions);
}

// ─── Persistence ────────────────────────────────────────────────────────────

/**
 * Replace the open (candidate) matches for an upload with the new ranking.
 * Confirmed/rejected rows are left untouched — a user's decision survives
 * re-matching.
 */
export async function persistCompositionMatches(
  uploadedFileId: string,
  candidates: CompositionCandidate[]
): Promise<number> {
  await db.compositionMatch.deleteMany({
    where: { uploadedFileId, status: 'candidate' },
  });

  if (candidates.length === 0) return 0;

  const created = await db.compositionMatch.createMany({
    data: candidates.map((candidate) => ({
      uploadedFileId,
      compositionId: candidate.compositionId,
      score: candidate.score,
      method: candidate.method,
      status: 'candidate',
      userConfirmed: false,
      matchedText: candidate.matchedText,
    })),
  });

  return created.count;
}

/** Confirm one candidate — the explicit user action that ends "never silent". */
export async function confirmCompositionMatch(
  uploadedFileId: string,
  compositionId: string
): Promise<void> {
  await db.$transaction([
    // Only one confirmed match per upload.
    db.compositionMatch.updateMany({
      where: { uploadedFileId, status: 'confirmed' },
      data: { status: 'rejected', userConfirmed: true },
    }),
    db.compositionMatch.updateMany({
      where: { uploadedFileId, compositionId, status: { not: 'confirmed' } },
      data: { status: 'confirmed', userConfirmed: true },
    }),
  ]);
}

export async function rejectCompositionMatch(
  uploadedFileId: string,
  compositionId: string
): Promise<void> {
  await db.compositionMatch.updateMany({
    where: { uploadedFileId, compositionId },
    data: { status: 'rejected' },
  });
}

// ─── Orchestrator ───────────────────────────────────────────────────────────

/**
 * Match a transcribed recording against the catalog and persist the top-N
 * candidates. Returns an honest result — `bestMeetsThreshold` tells the UI
 * whether it may *suggest* a composition; nothing is confirmed here.
 */
export async function runCompositionMatching(
  uploadedFileId: string,
  transcript: string,
  title?: string | null
): Promise<MatchingResult> {
  const normalizedLength = normalizeForComparison(transcript).length;
  if (normalizedLength < MIN_TRANSCRIPT_LENGTH) {
    return {
      candidates: [],
      bestMatch: null,
      bestMeetsThreshold: false,
      matched: false,
      skipped: `Transcript too short for reliable matching (${normalizedLength} chars).`,
    };
  }

  let candidates: CompositionCandidate[];
  try {
    candidates = await findCompositionCandidates(transcript, title);
  } catch (err: any) {
    return {
      candidates: [],
      bestMatch: null,
      bestMeetsThreshold: false,
      matched: false,
      skipped: `Matching error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  await persistCompositionMatches(uploadedFileId, candidates);

  const bestMatch = candidates[0] ?? null;
  return {
    candidates,
    bestMatch,
    bestMeetsThreshold: bestMatch?.meetsThreshold ?? false,
    matched: candidates.length > 0,
  };
}

/** Load stored matches for an upload with display data (status API / record page). */
export async function getCompositionMatches(uploadedFileId: string) {
  return db.compositionMatch.findMany({
    where: { uploadedFileId },
    orderBy: [{ status: 'asc' }, { score: 'desc' }],
    include: {
      composition: {
        select: {
          id: true,
          titleMarathi: true,
          titleTranslit: true,
          slug: true,
          type: true,
          saint: { select: { nameMarathi: true, nameTranslit: true } },
        },
      },
    },
  });
}
