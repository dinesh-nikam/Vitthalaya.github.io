/**
 * OpenSearch Client for Digital Pandharpur
 * Manages index mappings, indexing, and hybrid (lexical + k-NN vector) search.
 * Incorporates Marathi transliteration, synonyms expansion, and Reciprocal Rank Fusion.
 */

import { db } from '../db/client';
import { getEmbedding } from './embeddings';

const OPENSEARCH_URL = process.env.OPENSEARCH_URL || 'http://localhost:9200';
const OPENSEARCH_USER = process.env.OPENSEARCH_USER || 'admin';
const OPENSEARCH_PASS = process.env.OPENSEARCH_PASS || 'admin';
const INDEX_NAME = 'compositions';

// Flag to check if OpenSearch is configured/available
const isOSConfigured = typeof process.env.OPENSEARCH_URL === 'string' && process.env.OPENSEARCH_URL.length > 0;

export interface SearchDocument {
  id: string;
  slug: string;
  type: string;
  reviewed: boolean;
  titleMarathi: string;
  titleTranslit: string;
  fullText: string;
  meaning: string | null;
  saintName: string | null;
  saintTranslit: string | null;
  deityName: string | null;
  popularityScore: number;
  embedding: number[];
}

/**
 * Transliteration dictionary and rule mapper
 * Converts Latin script inputs to Devanagari (Marathi) for search expansion
 */
export function transliterateLatinToMarathi(query: string): string {
  const lowercaseQuery = query.toLowerCase().trim();
  
  // 1. Direct dictionary matches for common names & terms
  const dictionary: Record<string, string> = {
    'vitthal': 'विठ्ठल',
    'vithoba': 'विठोबा',
    'pandurang': 'पांडुरंग',
    'vithu': 'विठू',
    'pandharpur': 'पंढरपूर',
    'tukaram': 'तुकाराम',
    'tukoba': 'तुकोबा',
    'dnyaneshwar': 'ज्ञानेश्वर',
    'dnyanoba': 'ज्ञानेश्वर',
    'mauli': 'माउली',
    'eknath': 'एकनाथ',
    'namdev': 'नामदेव',
    'namdeo': 'नामदेव',
    'sophandev': 'सोपानदेव',
    'muktabai': 'मुक्ताबाई',
    'chokhamela': 'चोखामेळा',
    'janabai': 'जनाबाई',
    'haripath': 'हरिपाठ',
    'abhang': 'अभंग',
    'abhanga': 'अभंग',
    'aarti': 'आरती',
    'gaulani': 'गौळण',
    'gaulan': 'गौळण',
    'bhajan': 'भजन',
    'stotra': 'स्तोत्र',
    'deva': 'देवा',
    'dev': 'देव',
    'hari': 'हरी',
    'kirtan': 'कीर्तन',
    'varkari': 'वारकरी'
  };

  if (dictionary[lowercaseQuery]) {
    return dictionary[lowercaseQuery];
  }

  // 2. Fallback rule-based transliteration mapping (simple phonetic transliterator)
  let result = lowercaseQuery;
  const rules: [RegExp, string][] = [
    [/ksh/g, 'क्ष'],
    [/gy/g, 'ज्ञ'],
    [/dny/g, 'ज्ञ'],
    [/sh/g, 'श'],
    [/ch/g, 'च'],
    [/bh/g, 'भ'],
    [/dh/g, 'ध'],
    [/gh/g, 'घ'],
    [/kh/g, 'ख'],
    [/ph/g, 'फ'],
    [/th/g, 'थ'],
    [/jh/g, 'झ'],
    [/a/g, 'ा'],
    [/i/g, 'ि'],
    [/u/g, 'ु'],
    [/e/g, 'े'],
    [/o/g, 'ो'],
    [/k/g, 'क'],
    [/g/g, 'ग'],
    [/j/g, 'ज'],
    [/t/g, 'त'],
    [/d/g, 'द'],
    [/n/g, 'न'],
    [/p/g, 'प'],
    [/b/g, 'ब'],
    [/m/g, 'म'],
    [/y/g, 'य'],
    [/r/g, 'र'],
    [/l/g, 'ल'],
    [/v/g, 'व'],
    [/w/g, 'व'],
    [/h/g, 'ह'],
    [/s/g, 'स'],
  ];

  for (const [regex, replacement] of rules) {
    result = result.replace(regex, replacement);
  }

  // Strip trailing vowel markers that don't fit Marathi pronunciation well
  result = result.replace(/[ािुेो]$/, '');

  return result;
}

/**
 * Call OpenSearch REST API with Basic Auth
 */
async function callOpenSearch(path: string, method: string, body?: any): Promise<any> {
  const url = `${OPENSEARCH_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (OPENSEARCH_USER && OPENSEARCH_PASS) {
    const auth = Buffer.from(`${OPENSEARCH_USER}:${OPENSEARCH_PASS}`).toString('base64');
    headers['Authorization'] = `Basic ${auth}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenSearch API error [${response.status} ${response.statusText}]: ${text}`);
  }

  return response.json();
}

/**
 * Create index schema with custom analyzers and k-NN vector support
 */
export async function createOpenSearchIndex(): Promise<any> {
  if (!isOSConfigured) {
    console.warn('⚠️ OpenSearch URL not configured. Skipping createOpenSearchIndex.');
    return { success: false, reason: 'OpenSearch not configured' };
  }

  try {
    // Delete existing index if it exists
    try {
      await callOpenSearch(`/${INDEX_NAME}`, 'DELETE');
    } catch {
      // Ignore if index doesn't exist
    }

    const schema = {
      settings: {
        index: {
          number_of_shards: 1,
          number_of_replicas: 0,
          knn: true
        },
        analysis: {
          analyzer: {
            marathi_analyzer: {
              type: 'custom',
              tokenizer: 'icu_tokenizer',
              filter: [
                'icu_normalizer',
                'marathi_synonym_filter',
                'marathi_stop_filter',
                'icu_folding'
              ]
            },
            translit_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: [
                'lowercase',
                'asciifolding'
              ]
            },
            marathi_phonetic_analyzer: {
              type: 'custom',
              tokenizer: 'icu_tokenizer',
              filter: [
                'icu_normalizer',
                'marathi_phonetic_filter'
              ]
            }
          },
          filter: {
            marathi_stop_filter: {
              type: 'stop',
              stopwords: ['आणि', 'व', 'असे', 'आहे', 'या', 'ते', 'त्या', 'अून', 'ून']
            },
            marathi_synonym_filter: {
              type: 'synonym',
              synonyms: [
                'विठ्ठल, विठोबा, पांडुरंग, विठू, पंढरीनाथ, पांडुरंग हरी => विठ्ठल, पांडुरंग',
                'ज्ञानेश्वर, ज्ञाोबा, माउली, ज्ञानेश्वर महाराज => ज्ञानेश्वर, माउली',
                'तुकाराम, तुकोबा, तुकाराम महाराज => तुकाराम, तुकोबा',
                'एकनाथ, एकनाथ महाराज, नाथा => एकनाथ',
                'नामदेव, नामदेव महाराज, नामा => नामदेव',
                'अभंग, अभंगवाणी => अभंग',
                'आरती, आरत्या => आरती',
                'एकादशी, आषाढी, कार्तिकी => एकादशी'
              ]
            },
            marathi_phonetic_filter: {
              type: 'phonetic',
              encoder: 'double_metaphone',
              replace: false
            }
          }
        }
      },
      mappings: {
        properties: {
          id: { type: 'keyword' },
          slug: { type: 'keyword' },
          type: { type: 'keyword' },
          reviewed: { type: 'boolean' },
          titleMarathi: {
            type: 'text',
            analyzer: 'marathi_analyzer',
            fields: {
              phonetic: {
                type: 'text',
                analyzer: 'marathi_phonetic_analyzer'
              }
            }
          },
          titleTranslit: {
            type: 'text',
            analyzer: 'translit_analyzer'
          },
          fullText: {
            type: 'text',
            analyzer: 'marathi_analyzer'
          },
          meaning: {
            type: 'text',
            analyzer: 'marathi_analyzer'
          },
          saintName: {
            type: 'text',
            analyzer: 'marathi_analyzer',
            fields: {
              keyword: { type: 'keyword' }
            }
          },
          saintTranslit: {
            type: 'text',
            analyzer: 'translit_analyzer'
          },
          deityName: { type: 'keyword' },
          popularityScore: { type: 'float' },
          embedding: {
            type: 'knn_vector',
            dimension: 768,
            method: {
              name: 'hnsw',
              space_type: 'cosinesimil',
              engine: 'nmslib',
              parameters: {
                ef_construction: 128,
                m: 16
              }
            }
          }
        }
      }
    };

    const res = await callOpenSearch(`/${INDEX_NAME}`, 'PUT', schema);
    console.log('✓ OpenSearch index created successfully with schema mapping.');
    return res;
  } catch (err) {
    console.error('Failed to create OpenSearch index:', err);
    throw err;
  }
}

/**
 * Bulk index compositions from PostgreSQL/SQLite into OpenSearch
 */
export async function indexAllCompositions(): Promise<number> {
  const compositions = await db.composition.findMany({
    where: { reviewed: true },
    include: {
      saint: {
        select: {
          nameMarathi: true,
          nameTranslit: true,
        },
      },
      deity: {
        select: {
          nameMarathi: true,
        },
      },
    },
  });

  console.log(`Preparing to index ${compositions.length} compositions...`);

  if (!isOSConfigured) {
    console.warn('⚠️ OpenSearch is not running. Checked indexing in mock database mode.');
    return compositions.length;
  }

  const bulkBody: any[] = [];

  for (const comp of compositions) {
    // Generate semantic vector embedding
    const embeddingText = `${comp.titleMarathi} ${comp.fullText} ${comp.saint?.nameMarathi || ''}`.substring(0, 1000);
    const embedding = await getEmbedding(embeddingText);

    const doc: SearchDocument = {
      id: comp.id,
      slug: comp.slug,
      type: comp.type,
      reviewed: comp.reviewed,
      titleMarathi: comp.titleMarathi,
      titleTranslit: comp.titleTranslit,
      fullText: comp.fullText,
      meaning: comp.meaning,
      saintName: comp.saint?.nameMarathi || null,
      saintTranslit: comp.saint?.nameTranslit || null,
      deityName: comp.deity?.nameMarathi || null,
      popularityScore: 100, // Base popularity score
      embedding,
    };

    bulkBody.push({ index: { _index: INDEX_NAME, _id: doc.id } });
    bulkBody.push(doc);
  }

  if (bulkBody.length > 0) {
    // OpenSearch bulk request requires trailing newline and line-by-line format
    const bulkString = bulkBody.map((line) => JSON.stringify(line)).join('\n') + '\n';
    
    const url = `${OPENSEARCH_URL}/_bulk`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-ndjson',
    };
    if (OPENSEARCH_USER && OPENSEARCH_PASS) {
      const auth = Buffer.from(`${OPENSEARCH_USER}:${OPENSEARCH_PASS}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: bulkString,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenSearch Bulk indexing failed: ${text}`);
    }

    const result = await response.json();
    if (result.errors) {
      console.warn('⚠️ Bulk index complete but some errors occurred:', result.items.filter((item: any) => item.index.error));
    }
  }

  console.log(`✓ Indexed ${compositions.length} compositions in OpenSearch.`);
  return compositions.length;
}

/**
 * Reciprocal Rank Fusion (RRF) algorithm to merge and rank lexical + vector hits
 */
export function fuseRRF(lexicalHits: any[], vectorHits: any[], k = 60, popularityWeight = 0.15): any[] {
  const rrfScores: Record<string, { doc: any; rrfScore: number }> = {};

  // Score lexical hits
  lexicalHits.forEach((hit, idx) => {
    const id = hit._id || hit.id;
    const rank = idx + 1;
    const score = 1 / (k + rank);

    if (rrfScores[id]) {
      rrfScores[id].rrfScore += score;
    } else {
      rrfScores[id] = { doc: hit._source || hit, rrfScore: score };
    }
  });

  // Score vector hits
  vectorHits.forEach((hit, idx) => {
    const id = hit._id || hit.id;
    const rank = idx + 1;
    const score = 1 / (k + rank);

    if (rrfScores[id]) {
      rrfScores[id].rrfScore += score;
    } else {
      rrfScores[id] = { doc: hit._source || hit, rrfScore: score };
    }
  });

  // Convert to array and apply popularity boost
  const results = Object.values(rrfScores).map(({ doc, rrfScore }) => {
    const pop = doc.popularityScore || 100;
    // Boost formula: RRF * (1 + alpha * log10(1 + popularity))
    const popularityBoost = 1.0 + popularityWeight * Math.log10(1.0 + pop);
    const finalScore = rrfScore * popularityBoost;

    return {
      ...doc,
      score: Number(finalScore.toFixed(6)),
    };
  });

  // Sort descending by score
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Executes a hybrid lexical & k-NN semantic search
 */
export async function searchHybrid(
  query: string,
  filters?: {
    type?: string;
    saintId?: string;
    deityId?: string;
  },
  limit = 10,
  mode: 'keyword' | 'semantic' | 'hybrid' = 'hybrid'
): Promise<any[]> {
  if (!isOSConfigured) {
    // Graceful fallback to SQL mock search when OpenSearch cluster is missing
    return mockLocalSearch(query, filters, limit);
  }

  try {
    const mustFilters: any[] = [{ term: { reviewed: true } }];

    if (filters?.type) {
      mustFilters.push({ term: { type: filters.type } });
    }
    if (filters?.saintId) {
      // Find saint name to filter
      const saint = await db.saint.findUnique({
        where: { id: filters.saintId },
        select: { nameMarathi: true },
      });
      if (saint) {
        mustFilters.push({ term: { 'saintName.keyword': saint.nameMarathi } });
      }
    }
    if (filters?.deityId) {
      // Find deity name to filter
      const deity = await db.deity.findUnique({
        where: { id: filters.deityId },
        select: { nameMarathi: true },
      });
      if (deity) {
        mustFilters.push({ term: { deityName: deity.nameMarathi } });
      }
    }

    // Script detector: Check if input contains Latin letters
    const hasLatin = /[a-zA-Z]/.test(query);
    const expandedQuery = hasLatin ? transliterateLatinToMarathi(query) : query;

    // 1. Lexical Query (BM25)
    const lexicalQuery = {
      size: limit * 2,
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: query,
                fields: [
                  'titleMarathi^4',
                  'titleMarathi.phonetic^2',
                  'titleTranslit^3',
                  'fullText^1.5',
                  'meaning',
                  'saintName^2',
                  'saintTranslit^2',
                ],
                fuzziness: 'AUTO',
              },
            },
          ],
          filter: mustFilters,
          should: hasLatin ? [
            {
              multi_match: {
                query: expandedQuery,
                fields: ['titleMarathi^4', 'fullText^2', 'saintName^2'],
              },
            },
          ] : [],
        },
      },
    };

    // 2. Semantic Query (k-NN Vector)
    const queryVector = await getEmbedding(query);
    const vectorQuery = {
      size: limit * 2,
      query: {
        bool: {
          filter: mustFilters,
          must: [
            {
              knn: {
                embedding: {
                  vector: queryVector,
                  k: limit * 2,
                },
              },
            },
          ],
        },
      },
    };

    let lexicalHits: any[] = [];
    let vectorHits: any[] = [];

    if (mode === 'keyword' || mode === 'hybrid') {
      const res = await callOpenSearch(`/${INDEX_NAME}/_search`, 'POST', lexicalQuery);
      lexicalHits = res.hits?.hits || [];
    }

    if (mode === 'semantic' || mode === 'hybrid') {
      const res = await callOpenSearch(`/${INDEX_NAME}/_search`, 'POST', vectorQuery);
      vectorHits = res.hits?.hits || [];
    }

    // Merge and rank
    if (mode === 'keyword') {
      return lexicalHits.map((h) => ({ ...(h._source || h), score: h._score }));
    }
    if (mode === 'semantic') {
      return vectorHits.map((h) => ({ ...(h._source || h), score: h._score }));
    }

    // RRF Hybrid
    return fuseRRF(lexicalHits, vectorHits).slice(0, limit);
  } catch (err) {
    console.error('OpenSearch query failure, falling back to mock search:', err);
    return mockLocalSearch(query, filters, limit);
  }
}

/**
 * Fallback SQL-based mock search when OpenSearch is not running
 */
async function mockLocalSearch(
  query: string,
  filters?: {
    type?: string;
    saintId?: string;
    deityId?: string;
  },
  limit = 10
): Promise<any[]> {
  const hasLatin = /[a-zA-Z]/.test(query);
  const expandedQuery = hasLatin ? transliterateLatinToMarathi(query) : query;

  // Query PostgreSQL or SQLite database using Prisma
  const compositions = await db.composition.findMany({
    where: {
      reviewed: true,
      type: filters?.type || undefined,
      saintId: filters?.saintId || undefined,
      deityId: filters?.deityId || undefined,
      OR: [
        { titleMarathi: { contains: query } },
        { titleMarathi: { contains: expandedQuery } },
        { titleTranslit: { contains: query } },
        { fullText: { contains: query } },
        { fullText: { contains: expandedQuery } },
      ],
    },
    include: {
      saint: {
        select: {
          nameMarathi: true,
          nameTranslit: true,
        },
      },
      deity: {
        select: {
          nameMarathi: true,
        },
      },
    },
    take: limit,
  });

  return compositions.map((comp: any) => ({
    id: comp.id,
    slug: comp.slug,
    type: comp.type,
    reviewed: comp.reviewed,
    titleMarathi: comp.titleMarathi,
    titleTranslit: comp.titleTranslit,
    fullText: comp.fullText,
    meaning: comp.meaning,
    saintName: comp.saint?.nameMarathi || null,
    saintTranslit: comp.saint?.nameTranslit || null,
    deityName: comp.deity?.nameMarathi || null,
    popularityScore: 100,
    score: 1.0,
  }));
}

// Upsert a single composition to OpenSearch
export async function upsertCompositionToIndex(id: string): Promise<void> {
  const comp = await db.composition.findUnique({
    where: { id },
    include: {
      saint: {
        select: {
          nameMarathi: true,
          nameTranslit: true,
        },
      },
      deity: {
        select: {
          nameMarathi: true,
        },
      },
    },
  });

  if (!comp) {
    throw new Error(`Composition ${id} not found in database`);
  }

  if (!comp.reviewed) {
    await deleteCompositionFromIndex(id);
    return;
  }

  if (!isOSConfigured) {
    console.warn(`⚠️ OpenSearch is not running. Mock-upserted composition ${id} to index.`);
    return;
  }

  const embeddingText = `${comp.titleMarathi} ${comp.fullText} ${comp.saint?.nameMarathi || ''}`.substring(0, 1000);
  const embedding = await getEmbedding(embeddingText);

  const doc: SearchDocument = {
    id: comp.id,
    slug: comp.slug,
    type: comp.type,
    reviewed: comp.reviewed,
    titleMarathi: comp.titleMarathi,
    titleTranslit: comp.titleTranslit,
    fullText: comp.fullText,
    meaning: comp.meaning,
    saintName: comp.saint?.nameMarathi || null,
    saintTranslit: comp.saint?.nameTranslit || null,
    deityName: comp.deity?.nameMarathi || null,
    popularityScore: 100,
    embedding,
  };

  await callOpenSearch(`/${INDEX_NAME}/_doc/${doc.id}`, 'PUT', doc);
  console.log(`✓ Upserted composition ${doc.id} to OpenSearch.`);
}

// Delete a single composition from OpenSearch
export async function deleteCompositionFromIndex(id: string): Promise<void> {
  if (!isOSConfigured) {
    console.warn(`⚠️ OpenSearch is not running. Mock-deleted composition ${id} from index.`);
    return;
  }

  try {
    await callOpenSearch(`/${INDEX_NAME}/_doc/${id}`, 'DELETE');
    console.log(`✓ Deleted composition ${id} from OpenSearch.`);
  } catch (err: any) {
    if (err.message && err.message.includes('404')) {
      console.log(`Composition ${id} not found in OpenSearch index; deletion is a no-op.`);
      return;
    }
    throw err;
  }
}

