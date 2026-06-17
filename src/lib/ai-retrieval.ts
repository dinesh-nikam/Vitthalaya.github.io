/**
 * AI Retrieval-Augmented Generation for Digital Pandharpur
 * Searches existing corpus and returns curated results (NOT free generation)
 */

import { searchCompositions, type SearchDocument } from './search-client';

interface AIResponse {
  answer: string;
  sources: Array<{
    title: string;
    slug: string;
    type: string;
  }>;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Process AI query using retrieval from existing corpus
 */
export async function processAIQuery(query: string): Promise<AIResponse> {
  // Search in existing compositions
  const results = await searchCompositions(query);

  if (results.length === 0) {
    return {
      answer: `"${query}" साठी आमच्या डेटाबेसमध्ये कोणतेही साहित्य आढळले नाही. इतर शब्द वापरून प्रयत्न केलात का?`,
      sources: [],
      confidence: 'low',
    };
  }

  // Build response from actual search results
  const topResults = results.slice(0, 5);

  // Generate answer based on query type
  const answer = generateAnswerFromQuery(query, topResults);

  return {
    answer,
    sources: topResults.map((r) => ({
      title: r.titleMarathi,
      slug: r.slug,
      type: r.type,
    })),
    confidence: 'high',
  };
}

function generateAnswerFromQuery(query: string, results: SearchDocument[]): string {
  const lowerQuery = query.toLowerCase();

  // Check for saint-specific queries
  if (query.includes('तुकाराम') || query.includes('tukaram') || query.includes('तुकाराम महाराज')) {
    return `तुकाराम महाराजांचे ${results.length} प्रसिद्ध अभंग आमच्या डेटाबेसमध्ये आहेत. खालील सारखे अभंग पहा:`;
  }

  if (query.includes('विठ्ठल') || query.includes('vitthal')) {
    return `विठ्ठल संबंधी ${results.length} साहित्य आमच्या डेटाबेसमध्ये आहेत. वारकरी वर्षा आणि विठ्ठलाच्या भक्तीचे अभंग पहा:`;
  }

  if (query.includes('हरिपाठ') || query.includes('haripath')) {
    return `हरिपाठ बद्दल ${results.length} साहित्य आमच्या डेटाबेसमध्ये आहेत. नामस्मरणाच्या महत्त्वावर भक्ती भरलेले हरिपाठ पहा:`;
  }

  if (query.includes('आरती') || query.includes('aarti')) {
    return `${results.length} आरती आमच्या डेटाबेसमध्ये आहेत. देवी व देवतांच्या आरती पहा:`;
  }

  // Generic response
  return `"${query}" साठी ${results.length} साहित्य आढळले. खालील साहित्य पहा:`;
}

/**
 * Generate festival-specific response
 */
export async function getFestivalResponse(): Promise<AIResponse> {
  // This would search for compositions linked to current festival
  return {
    answer: 'सध्याचा सण आषाढी एकादशी आहे. वारकरी मार्गासाठी हे अभंग पहा:',
    sources: [
      { title: 'विठ्ठल वारकरीची', slug: 'vitthal-varkarichi', type: 'abhang' },
    ],
    confidence: 'high',
  };
}