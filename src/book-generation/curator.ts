/**
 * AI Curation Engine — selects the best compositions for a book based on criteria.
 *
 * Scoring dimensions:
 * - Popularity: views, bookmarks, saves (from DB)
 * - Historical significance: saint era, composition age
 * - Authenticity: canonical confidence score
 * - Literary value: AI-enriched quality score
 * - Spiritual relevance: keyword/thematic alignment
 * - Diversity bonus: ensures variety in type, saint, deity
 */

import { db } from '../db/client';
import type { CompositionType, CurationCriteria, CurationScore, CuratedSelection, BookSection } from './types';

// ── Scoring Weights ────────────────────────────────────────────────────────────

const WEIGHTS = {
  popularity: 0.15,
  historicalSignificance: 0.20,
  authenticity: 0.25,
  literaryValue: 0.20,
  spiritualRelevance: 0.10,
  diversityBonus: 0.10,
};

// ── Compose Filter Query ──────────────────────────────────────────────────────

interface CompositionRow {
  id: string;
  titleMarathi: string;
  fullText: string;
  meaning: string | null;
  type: string;
  saintId: string | null;
  deityId: string | null;
  saint?: { nameMarathi: string } | null;
  deity?: { nameMarathi: string } | null;
}

async function fetchCandidates(criteria: CurationCriteria): Promise<CompositionRow[]> {
  const where: any = { reviewed: true };

  if (criteria.saintIds?.length) {
    where.saintId = { in: criteria.saintIds };
  }
  if (criteria.deityIds?.length) {
    where.deityId = { in: criteria.deityIds };
  }
  if (criteria.compositionTypes?.length) {
    where.type = { in: criteria.compositionTypes };
  }

  const compositions = await db.composition.findMany({
    where,
    select: {
      id: true,
      titleMarathi: true,
      fullText: true,
      meaning: true,
      type: true,
      saintId: true,
      deityId: true,
      saint: { select: { nameMarathi: true } },
      deity: { select: { nameMarathi: true } },
    },
    take: 5000,
  });

  return compositions;
}

// ── Scoring Functions ─────────────────────────────────────────────────────────

function scorePopularity(_comp: CompositionRow): number {
  // Phase 1: uniform score since we lack view/bookmark stats yet
  // Phase 2: query actual view/save counts from the DB
  return 0.7;
}

function scoreHistoricalSignificance(comp: CompositionRow): number {
  // Higher score for well-known composition types
  const typeScores: Record<string, number> = {
    abhang: 0.9, aarti: 0.8, haripath: 0.9, stotra: 0.7,
    bhajan: 0.7, gaulani: 0.8, deviche_gane: 0.6,
    namasmaran: 0.7, bharud: 0.8, kirtan: 0.7, powada: 0.5,
  };
  return typeScores[comp.type] ?? 0.5;
}

function scoreAuthenticity(_comp: CompositionRow): number {
  // Phase 1: uniform score
  // Phase 2: check canonical source mapping confidence scores
  return 0.8;
}

function scoreLiteraryValue(_comp: CompositionRow): number {
  // Phase 1: uniform score
  // Phase 2: use AiEnrichmentResult quality scores
  return 0.7;
}

function scoreSpiritualRelevance(comp: CompositionRow, criteria: CurationCriteria): number {
  if (!criteria.keywordFilters?.length) return 0.7;

  const text = (comp.titleMarathi + ' ' + comp.fullText).toLowerCase();
  let matches = 0;
  for (const kw of criteria.keywordFilters) {
    if (text.includes(kw.toLowerCase())) matches++;
  }

  return Math.min(1, matches / criteria.keywordFilters.length + 0.3);
}

function scoreDiversityBonus(
  comp: CompositionRow,
  selected: CompositionRow[],
): number {
  if (selected.length === 0) return 1.0;

  // Penalise if we already have many of this type or saint
  const typeCount = selected.filter((s) => s.type === comp.type).length;
  const saintCount = comp.saintId
    ? selected.filter((s) => s.saintId === comp.saintId).length
    : 0;

  let bonus = 1.0;
  if (typeCount > selected.length * 0.3) bonus -= 0.2;  // >30% same type
  if (saintCount > selected.length * 0.25) bonus -= 0.15; // >25% same saint

  return Math.max(0.3, bonus);
}

function computeComposite(scores: CurationScore['scores']): number {
  return (
    scores.popularity * WEIGHTS.popularity +
    scores.historicalSignificance * WEIGHTS.historicalSignificance +
    scores.authenticity * WEIGHTS.authenticity +
    scores.literaryValue * WEIGHTS.literaryValue +
    scores.spiritualRelevance * WEIGHTS.spiritualRelevance +
    scores.diversityBonus * WEIGHTS.diversityBonus
  );
}

// ── Section Builder ────────────────────────────────────────────────────────────

function buildSections(
  selected: CompositionRow[],
  criteria: CurationCriteria,
): BookSection[] {
  // Group by composition type, preserving order of priority
  const typeOrder: CompositionType[] = [
    'abhang', 'aarti', 'bhajan', 'stotra', 'haripath',
    'gaulani', 'deviche_gane', 'bharud', 'kirtan', 'namasmaran', 'powada',
  ];

  const grouped = new Map<string, CompositionRow[]>();
  for (const comp of selected) {
    const group = grouped.get(comp.type) ?? [];
    group.push(comp);
    grouped.set(comp.type, group);
  }

  const sections: BookSection[] = [];
  let globalIndex = 0;

  for (const type of typeOrder) {
    const group = grouped.get(type);
    if (!group?.length) continue;

    const indices: number[] = [];
    for (const _comp of group) {
      indices.push(globalIndex);
      globalIndex++;
    }

    sections.push({
      title: getSectionTitle(type),
      titleTranslit: getSectionTranslit(type),
      type,
      compositionIndices: indices,
    });
  }

  return sections;
}

function getSectionTitle(type: string): string {
  const titles: Record<string, string> = {
    abhang: 'अभंग',
    aarti: 'आरत्या',
    bhajan: 'भजने',
    stotra: 'स्तोत्रे',
    haripath: 'हरिपाठ',
    gaulani: 'गाऊळणी',
    deviche_gane: 'देवीची गाणी',
    bharud: 'भारुडे',
    kirtan: 'कीर्तने',
    namasmaran: 'नामस्मरण',
    powada: 'पोवाडे',
  };
  return titles[type] || type;
}

function getSectionTranslit(type: string): string {
  const titles: Record<string, string> = {
    abhang: 'Abhang', aarti: 'Aarti', bhajan: 'Bhajan',
    stotra: 'Stotra', haripath: 'Haripath', gaulani: 'Gaulani',
    deviche_gane: 'Deviche Gane', bharud: 'Bharud',
    kirtan: 'Kirtan', namasmaran: 'Namasmaran', powada: 'Powada',
  };
  return titles[type] || type;
}

// ── Main Curation Function ────────────────────────────────────────────────────

export async function curateBook(
  criteria: CurationCriteria,
): Promise<CuratedSelection> {
  // 1. Fetch candidates
  const candidates = await fetchCandidates(criteria);
  const maxCount = criteria.maxCount ?? 150;

  // 2. Score each candidate
  const scored: Array<{ comp: CompositionRow; score: CurationScore }> = [];

  for (const comp of candidates) {
    const popularity = scorePopularity(comp);
    const historicalSignificance = scoreHistoricalSignificance(comp);
    const authenticity = scoreAuthenticity(comp);
    const literaryValue = scoreLiteraryValue(comp);
    const spiritualRelevance = scoreSpiritualRelevance(comp, criteria);

    const score: CurationScore = {
      compositionId: comp.id,
      scores: {
        popularity,
        historicalSignificance,
        authenticity,
        literaryValue,
        spiritualRelevance,
        diversityBonus: 0, // computed after selection
      },
      compositeScore: 0,
      included: false,
      reason: '',
    };

    score.compositeScore = computeComposite(score.scores);
    scored.push({ comp, score });
  }

  // 3. Sort by composite score (descending)
  scored.sort((a, b) => b.score.compositeScore - a.score.compositeScore);

  // 4. Select top compositions with diversity pass
  const selected: CompositionRow[] = [];
  const selectedScores: CurationScore[] = [];

  for (const item of scored) {
    if (selected.length >= maxCount) break;

    // Compute diversity bonus based on already-selected
    item.score.scores.diversityBonus = scoreDiversityBonus(item.comp, selected);
    item.score.compositeScore = computeComposite(item.score.scores);

    if (item.score.compositeScore < (criteria.minScore ?? 0.3)) {
      item.score.reason = 'Below minimum score threshold';
      continue;
    }

    item.score.included = true;
    item.score.reason = `Score: ${item.score.compositeScore.toFixed(2)}`;
    selected.push(item.comp);
    selectedScores.push(item.score);
  }

  // 5. Build sections
  const sections = buildSections(selected, criteria);

  // 6. Compile stats
  const byType: Record<string, number> = {};
  const bySaint: Record<string, number> = {};
  for (const comp of selected) {
    byType[comp.type] = (byType[comp.type] ?? 0) + 1;
    if (comp.saint?.nameMarathi) {
      bySaint[comp.saint.nameMarathi] = (bySaint[comp.saint.nameMarathi] ?? 0) + 1;
    }
  }

  return {
    compositions: selected.map((comp, i) => ({
      compositionId: comp.id,
      titleMarathi: comp.titleMarathi,
      fullText: comp.fullText,
      meaning: comp.meaning ?? undefined,
      type: comp.type,
      saintName: comp.saint?.nameMarathi ?? undefined,
      deityName: comp.deity?.nameMarathi ?? undefined,
      score: selectedScores[i]?.compositeScore ?? 0,
    })),
    sections,
    totalScore: selectedScores.reduce((sum, s) => sum + s.compositeScore, 0),
    stats: { totalCandidates: candidates.length, included: selected.length, byType, bySaint },
  };
}
