/**
 * Digital Pandharpur — OCR Type Definitions
 */

/** Single engine OCR result */
export interface EngineOcrResult {
  engine: string;
  text: string;
  confidence: number;
  /** Per-page or per-region confidence breakdown (if available) */
  segments?: Array<{
    text: string;
    confidence: number;
    bbox?: { x: number; y: number; width: number; height: number };
  }>;
  error?: string;
}

/** Consensus result from multiple engine runs */
export interface ConsensusOcrResult {
  /** The voted "best" text */
  votedText: string;
  /** Final confidence score [0-1] */
  finalConfidence: number;
  /** How many engines were run */
  engineCount: number;
  /** Method used to reach consensus */
  votingMethod: 'majority' | 'best-confidence' | 'weighted-average' | 'llm-consensus';
  /** Individual engine results */
  engineResults: EngineOcrResult[];
}

/** Configuration for the consensus engine */
export interface OcrConfig {
  /** Which engines to run. Default: all available */
  engines?: ('google_vision' | 'tesseract' | 'paddleocr')[];
  /** Confidence threshold for considering an engine result valid [0-1] */
  minEngineConfidence?: number;
  /** Voting method */
  votingMethod?: ConsensusOcrResult['votingMethod'];
  /** Language hints */
  language?: string[];
  /** Timeout per engine in ms */
  engineTimeout?: number;
}
