/**
 * Semantic Search Engine for Digital Pandharpur
 * 
 * Hybrid search combining:
 * 1. Lexical search (Meilisearch) - exact matches, typo tolerance
 * 2. Semantic search (embeddings) - conceptual similarity
 * 
 * Uses Reciprocal Rank Fusion (RRF) to merge results from both sources.
 * This enables users to find conceptually related content even when
 * the exact words don't match.
 */

import { db } from '@/src/db/client';
import { getEmbedding } from './embeddings';
import { searchCompositions, type SearchDocument } from './search-client';
import { expandTransliteration } from './search-transliteration';

// ─── Configuration ──────────────────────────────────────────────────────────

/** Weight for lexical vs semantic results */
const LEXICAL_WEIGHT = 0.6;
const SEMANTIC_WEIGHT = 0.4;

/** Number of candidates from each source */
const LEXICAL_CANDIDATES = 20;
const SEMANTIC_CANDIDATES = 20;

/** RRF constant (k in the RRF formula) */
const RRF_K = 60;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HybridSearchResult {
  id: string;
  titleMarathi: string;
  titleTranslit: string;
  fullText: string;
  type: string;
  slug: string;
  saintName: string | null;
  deityName: string | null;
  hasAudio: boolean;
  score: number;
  /** Which source contributed this result */
  source: 'lexical' | 'semantic' | 'both';
  /** Lexical rank (lower = better) */
  lexicalRank?: number;
  /** Semantic rank (lower = better) */
  semanticRank?: number;
  /** Cosine similarity score (0-1) */
  similarity?: number;
}

export interface HybridSearchOptions {
  limit?: number;
  type?: string;
  deityName?: string;
  saintName?: string;
  /** Whether to use semantic search (default: true) */
  useSemantic?: boolean;
}

// ─── Embedding Storage ──────────────────────────────────────────────────────

/**
 * Generate and store embedding for a composition.
 * Called during enrichment or when indexing compositions.
 */
export async function generateCompositionEmbedding(
  compositionId: string
): Promise<number[] | null> {
  try {
    // Fetch composition content
    const composition = await db.composition.findUnique({
      where: { id: compositionId },
      select: {
        titleMarathi: true,
        titleTranslit: true,
        fullText: true,
        meaning: true,
        type: true,
      },
    });

    if (!composition) return null;

    // Build text for embedding (combine title, type, and meaning for rich representation)
    const textParts = [
      composition.titleMarathi,
      composition.titleTranslit,
      composition.type,
      composition.meaning || '',
      // First 200 chars of full text for context
      composition.fullText.substring(0, 200),
    ].filter(Boolean);

    const embeddingText = textParts.join(' | ');

    // Generate embedding
    const embedding = await getEmbedding(embeddingText);

    // Store in database (upsert)
    await db.$executeRawUnsafe(`
      INSERT INTO composition_embeddings (composition_id, embedding, updated_at)
      VALUES ($1, $2::vector, NOW())
      ON CONFLICT (composition_id) 
      DO UPDATE SET embedding = $2::vector, updated_at = NOW()
    `, compositionId, JSON.stringify(embedding));

    return embedding;
  } catch (error) {
    console.error(`Failed to generate embedding for composition ${compositionId}:`, error);
    return null;
  }
}

// ─── Semantic Search ────────────────────────────────────────────────────────

/**
 * Find semantically similar compositions using cosine similarity.
 * Uses pgvector for efficient vector search.
 */
async function semanticSearch(
  queryEmbedding: number[],
  options: { limit: number; type?: string }
): Promise<Array<{ id: string; score: number }>> {
  try {
    // Build the query with optional type filter
    const typeFilter = options.type 
      ? `AND c.type = '${options.type}'`
      : '';

    const results = await db.$queryRawUnsafe(`
      SELECT 
        ce.composition_id as id,
        1 - (ce.embedding <=> $1::vector) as score
      FROM composition_embeddings ce
      JOIN compositions c ON c.id = ce.composition_id
      WHERE c.reviewed = true
        ${typeFilter}
      ORDER BY ce.embedding <=> $1::vector
      LIMIT $2
    `, JSON.stringify(queryEmbedding), options.limit);

    return (results as Array<{ id: string; score: number }>).map(r => ({
      id: r.id,
      score: Math.max(0, Math.min(1, Number(r.score))), // Clamp to [0, 1]
    }));
  } catch (error) {
    console.warn('Semantic search failed, falling back to lexical only:', error);
    return [];
  }
}

// ─── Hybrid Search ──────────────────────────────────────────────────────────

/**
 * Perform hybrid search combining lexical and semantic results.
 * 
 * @param query - User's search query
 * @param options - Search options (filters, limits)
 * @returns Ranked results with combined scores
 */
export async function hybridSearch(
  query: string,
  options: HybridSearchOptions = {}
): Promise<HybridSearchResult[]> {
  const {
    limit = 10,
    type,
    deityName,
    saintName,
    useSemantic = true,
  } = options;

  // Expand transliteration for lexical search
  const expandedQuery = expandTransliteration(query);

  // Run lexical search
  const lexicalPromise = searchCompositions(
    expandedQuery,
    { type, deityName, saintName },
    { limit: LEXICAL_CANDIDATES }
  ).catch(err => {
    console.warn('Lexical search failed:', err);
    return [];
  });

  // Run semantic search (if enabled)
  const semanticPromise = useSemantic
    ? getEmbedding(query)
        .then(embedding => semanticSearch(embedding, { limit: SEMANTIC_CANDIDATES, type }))
        .catch(err => {
          console.warn('Semantic search failed:', err);
          return [];
        })
    : Promise.resolve([]);

  // Wait for both to complete
  const [lexicalResults, semanticResults] = await Promise.all([
    lexicalPromise,
    semanticPromise,
  ]);

  // Build rank maps
  const lexicalRankMap = new Map<string, number>();
  lexicalResults.forEach((result, index) => {
    lexicalRankMap.set(result.id, index + 1);
  });

  const semanticRankMap = new Map<string, number>();
  const semanticScoreMap = new Map<string, number>();
  semanticResults.forEach((result, index) => {
    semanticRankMap.set(result.id, index + 1);
    semanticScoreMap.set(result.id, result.score);
  });

  // Combine all unique IDs
  const allIds = new Set([
    ...lexicalResults.map(r => r.id),
    ...semanticResults.map(r => r.id),
  ]);

  // Calculate RRF scores
  const scoredResults: HybridSearchResult[] = [];
  const lexicalResultMap = new Map<string, SearchDocument>(
    lexicalResults.map((r: SearchDocument) => [r.id, r] as const)
  );

  for (const id of allIds) {
    const lexicalRank = lexicalRankMap.get(id);
    const semanticRank = semanticRankMap.get(id);
    const semanticScore = semanticScoreMap.get(id);

    // RRF formula: score = sum(1 / (k + rank))
    let rrfScore = 0;
    if (lexicalRank) rrfScore += LEXICAL_WEIGHT * (1 / (RRF_K + lexicalRank));
    if (semanticRank) rrfScore += SEMANTIC_WEIGHT * (1 / (RRF_K + semanticRank));

    // Determine source
    let source: 'lexical' | 'semantic' | 'both';
    if (lexicalRank && semanticRank) source = 'both';
    else if (lexicalRank) source = 'lexical';
    else source = 'semantic';

    // Get base data from lexical results or fetch from DB
    const lexicalData = lexicalResultMap.get(id);
    
    scoredResults.push({
      id,
      titleMarathi: lexicalData?.titleMarathi || '',
      titleTranslit: lexicalData?.titleTranslit || '',
      fullText: lexicalData?.fullText || '',
      type: lexicalData?.type || '',
      slug: lexicalData?.slug || '',
      saintName: lexicalData?.saintName || null,
      deityName: lexicalData?.deityName || null,
      hasAudio: lexicalData?.hasAudio || false,
      score: rrfScore,
      source,
      lexicalRank: lexicalRank || undefined,
      semanticRank: semanticRank || undefined,
      similarity: semanticScore || undefined,
    });
  }

  // Sort by RRF score (descending)
  scoredResults.sort((a, b) => b.score - a.score);

  // Return top results
  return scoredResults.slice(0, limit);
}

// ─── Index Management ──────────────────────────────────────────────────────

/**
 * Generate embeddings for all reviewed compositions.
 * Run as a background job or during indexing.
 */
export async function generateAllEmbeddings(): Promise<{
  total: number;
  success: number;
  failed: number;
}> {
  const compositions = await db.composition.findMany({
    where: { reviewed: true },
    select: { id: true },
  });

  let success = 0;
  let failed = 0;

  // Process in batches of 10
  for (let i = 0; i < compositions.length; i += 10) {
    const batch = compositions.slice(i, i + 10);
    const results = await Promise.allSettled(
      batch.map(comp => generateCompositionEmbedding(comp.id))
    );

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) success++;
      else failed++;
    });

    // Progress logging
    if ((i + 10) % 100 === 0) {
      console.log(`Embedding progress: ${i + 10}/${compositions.length}`);
    }
  }

  return { total: compositions.length, success, failed };
}
