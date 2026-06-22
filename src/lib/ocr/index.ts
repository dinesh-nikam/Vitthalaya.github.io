/**
 * Digital Pandharpur — Multi-Engine OCR Public API
 *
 * Runs multiple OCR engines, compares results, and selects the best
 * via confidence voting. Supports image enhancement before OCR.
 *
 * Usage:
 *   import { runOcrConsensus, preprocessForOcr } from '@/src/lib/ocr';
 *   const result = await runOcrConsensus(buffer);
 *   console.log(result.votedText, result.finalConfidence);
 */

export { runOcrConsensus } from './consensus';
export type { ConsensusOcrResult, OcrConfig } from './types';
export { preprocessForOcr } from './image-pipeline';
export type { OcrPreprocessOptions } from './image-pipeline';
export { enhanceImage } from './../image-pipeline/enhancer';
export type { EnhanceOptions } from './../image-pipeline/enhancer';
