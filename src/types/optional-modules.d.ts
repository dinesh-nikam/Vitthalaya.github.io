/**
 * Digital Pandharpur — Optional Module Type Declarations
 *
 * These packages are optional (loaded dynamically via try/catch).
 * The code handles their absence gracefully, so we declare minimal types
 * to satisfy TypeScript.
 */

declare module 'mammoth' {
  export function extractRawText(options: { buffer: Buffer }): Promise<{ value: string }>;
}

declare module 'pdf-parse' {
  interface PdfInfo {
    Title?: string;
    Author?: string;
    Subject?: string;
    Keywords?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
    [key: string]: unknown;
  }

  interface PdfData {
    numpages: number;
    numrender: number;
    info: PdfInfo;
    metadata: Record<string, unknown>;
    text: string;
    version: string;
  }

  function pdfParse(dataBuffer: Buffer): Promise<PdfData>;
  export default pdfParse;
}

declare module 'tesseract.js' {
  interface RecognizeResult {
    data: {
      text: string;
      confidence: number;
      words: Array<{
        text: string;
        confidence: number;
        bbox?: { x0: number; y0: number; x1: number; y1: number };
      }>;
      lines?: Array<{ text: string; confidence: number }>;
    };
  }
  export function recognize(
    image: Buffer | string,
    lang?: string,
    options?: { logger?: (info: unknown) => void }
  ): Promise<RecognizeResult>;
}

declare module 'adm-zip' {
  class AdmZip {
    constructor(buffer: Buffer);
    getEntry(entry: string): { getData(): Buffer } | null;
  }
  export default AdmZip;
}
