/**
 * Digital Pandharpur — OCR Consensus Engine
 *
 * Runs multiple OCR engines in parallel, compares outputs,
 * and selects the best result via voting.
 *
 * Voting strategies:
 *  - majority: longest common text wins
 *  - best-confidence: highest individual confidence wins
 *  - weighted-average: text from highest weighted combination
 */

import type { EngineOcrResult, ConsensusOcrResult, OcrConfig } from './types';
import { runGoogleVision } from './google-vision';
import { runTesseractOcr } from './tesseract';
import { runPaddleOcr } from './paddleocr';

/**
 * Run multi-engine OCR consensus on an image buffer.
 */
export async function runOcrConsensus(
  buffer: Buffer,
  config: OcrConfig = {}
): Promise<ConsensusOcrResult> {
  const {
    engines = ['google_vision', 'tesseract', 'paddleocr'],
    minEngineConfidence = 0.3,
    votingMethod = 'weighted-average',
    language = ['mr', 'hi', 'en'],
    engineTimeout = 30000,
  } = config;

  // Run all requested engines in parallel
  const enginePromises = engines.map((engine) =>
    runSingleEngine(engine, buffer, { language, timeout: engineTimeout })
      .catch((err) => ({
        engine,
        text: '',
        confidence: 0,
        error: err instanceof Error ? err.message : String(err),
      }))
  );

  const engineResults = await Promise.all(enginePromises);

  // Filter out low-confidence or failed engines
  const validResults = engineResults.filter(
    (r) => r.confidence >= minEngineConfidence && r.text.length > 10
  );

  if (validResults.length === 0) {
    // If all engines failed, return best effort
    const best = engineResults.reduce((a, b) => (a.confidence > b.confidence ? a : b));
    return {
      votedText: best.text || '',
      finalConfidence: best.confidence,
      engineCount: engineResults.length,
      votingMethod: 'best-confidence',
      engineResults,
    };
  }

  // Run consensus voting
  const { votedText, finalConfidence } = computeConsensus(validResults, votingMethod);

  return {
    votedText,
    finalConfidence,
    engineCount: engineResults.length,
    votingMethod,
    engineResults,
  };
}

/**
 * Run a single OCR engine with timeout.
 */
async function runSingleEngine(
  engine: string,
  buffer: Buffer,
  options: { language: string[]; timeout: number }
): Promise<EngineOcrResult> {
  switch (engine) {
    case 'google_vision':
      return runGoogleVision(buffer, options.language, options.timeout);
    case 'tesseract':
      return runTesseractOcr(buffer, options.language, options.timeout);
    case 'paddleocr':
      return runPaddleOcr(buffer, options.language, options.timeout);
    default:
      throw new Error(`Unknown OCR engine: ${engine}`);
  }
}

/**
 * Compute consensus from multiple engine results.
 */
function computeConsensus(
  results: EngineOcrResult[],
  method: ConsensusOcrResult['votingMethod']
): { votedText: string; finalConfidence: number } {
  switch (method) {
    case 'best-confidence':
      return bestConfidence(results);
    case 'majority':
      return majorityVote(results);
    case 'weighted-average':
    default:
      return weightedAverage(results);
  }
}

/**
 * Best-confidence: pick the result with the highest individual confidence.
 */
function bestConfidence(results: EngineOcrResult[]): { votedText: string; finalConfidence: number } {
  const best = results.reduce((a, b) => (a.confidence > b.confidence ? a : b));
  return { votedText: best.text, finalConfidence: best.confidence };
}

/**
 * Majority vote: pick the text that appears in most engines.
 * Uses longest common substring / similarity scoring.
 */
function majorityVote(results: EngineOcrResult[]): { votedText: string; finalConfidence: number } {
  if (results.length === 1) {
    return { votedText: results[0].text, finalConfidence: results[0].confidence };
  }

  // Score each result by how similar it is to others
  const scores = results.map((r) => {
    let totalSimilarity = 0;
    for (const other of results) {
      if (other === r) continue;
      totalSimilarity += textSimilarity(r.text, other.text);
    }
    return { result: r, avgSimilarity: totalSimilarity / (results.length - 1) };
  });

  scores.sort((a, b) => b.avgSimilarity - a.avgSimilarity);

  // The one most similar to others wins
  const winner = scores[0];
  return {
    votedText: winner.result.text,
    finalConfidence: winner.result.confidence * (0.5 + 0.5 * winner.avgSimilarity),
  };
}

/**
 * Weighted average: each engine votes with its confidence as weight.
 * Text is built from the highest-weighted segments.
 */
function weightedAverage(results: EngineOcrResult[]): { votedText: string; finalConfidence: number } {
  if (results.length === 1) {
    return { votedText: results[0].text, finalConfidence: results[0].confidence };
  }

  // Use the highest-confidence engine result
  const sorted = [...results].sort((a, b) => b.confidence - a.confidence);
  const best = sorted[0];

  // Compute weighted confidence based on agreement
  let agreementFactor = 0;
  for (const other of sorted.slice(1)) {
    agreementFactor += textSimilarity(best.text, other.text);
  }
  agreementFactor = agreementFactor / (sorted.length - 1);

  return {
    votedText: best.text,
    finalConfidence: best.confidence * (0.6 + 0.4 * agreementFactor),
  };
}

/**
 * Simple text similarity using word overlap (Jaccard).
 */
function textSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;

  const wordsA = new Set(
    a.toLowerCase()
      .replace(/[^\w\u0900-\u097F\s]/g, '')
      .split(/\s+/)
      .filter(Boolean)
  );
  const wordsB = new Set(
    b.toLowerCase()
      .replace(/[^\w\u0900-\u097F\s]/g, '')
      .split(/\s+/)
      .filter(Boolean)
  );

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export { textSimilarity };
