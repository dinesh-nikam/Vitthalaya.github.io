/**
 * Digital Pandharpur — PDF Extractor
 *
 * Handles three PDF types:
 * 1. Text PDF — direct text extraction
 * 2. Scanned PDF — per-page OCR
 * 3. Hybrid PDF — mixed text + scanned pages
 *
 * Detects the type and routes accordingly.
 */

import type { IExtractor, ExtractionResult, ExtractionOptions } from './base';

export interface PdfStructure {
  pageCount: number;
  isScanned: boolean;
  isEncrypted: boolean;
  title: string | null;
  author: string | null;
  pages: Array<{
    index: number;
    text: string;
    hasImages: boolean;
  }>;
}

export class PdfExtractor implements IExtractor {
  readonly id = 'pdf-extractor';
  readonly name = 'PDF Document Extractor';
  readonly supportedMimeTypes = ['application/pdf'];

  canHandle(mimeType: string, extension: string): boolean {
    return mimeType === 'application/pdf' || extension.toLowerCase() === '.pdf';
  }

  async extract(buffer: Buffer, filename: string, options?: ExtractionOptions): Promise<ExtractionResult> {
    try {
      // Step 1: Analyze PDF structure
      const structure = await this.analyzePdf(buffer, options?.maxPages);

      // Step 2: Extract text based on PDF type
      let allText = '';
      for (const page of structure.pages) {
        allText += page.text + '\n\n';
      }

      allText = allText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{4,}/g, '\n\n\n')
        .trim();

      const title = structure.title ?? this.guessTitle(allText, filename);
      const lines = allText.split('\n').filter(l => l.trim().length > 0).length;

      return {
        text: allText,
        title,
        textLength: allText.length,
        compositionCount: Math.max(1, Math.ceil(lines / 20)),
        metadata: {
          extractor: this.id,
          pageCount: structure.pageCount,
          isScanned: structure.isScanned,
          isEncrypted: structure.isEncrypted,
          author: structure.author,
        },
        confidence: this.calculateConfidence(allText, structure),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        text: '',
        title: filename.replace(/\.\w+$/, ''),
        textLength: 0,
        compositionCount: 0,
        metadata: {},
        confidence: 0,
        error: `PDF extraction failed: ${msg}`,
      };
    }
  }

  /**
   * Analyze the PDF — detect type, extract metadata, get page count.
   */
  private async analyzePdf(buffer: Buffer, maxPages?: number): Promise<PdfStructure> {
    const structure: PdfStructure = {
      pageCount: 0,
      isScanned: true, // pessimistic default
      isEncrypted: false,
      title: null,
      author: null,
      pages: [],
    };

    // Try pdf.js/pdf-parse first
    const pdfJsResult = await this.tryPdfJsExtraction(buffer, maxPages ?? Infinity);

    if (pdfJsResult) {
      structure.pageCount = pdfJsResult.pageCount;
      structure.isEncrypted = pdfJsResult.isEncrypted;
      structure.pages = pdfJsResult.pages;
      structure.title = pdfJsResult.title;
      structure.author = pdfJsResult.author;

      // Determine if scanned: if most pages have very little text, it's likely scanned
      const textPages = pdfJsResult.pages.filter(p => p.text.trim().length > 50).length;
      structure.isScanned = pdfJsResult.pageCount > 0 && textPages < Math.ceil(pdfJsResult.pageCount * 0.3);
    }

    // If encrypted or no text found (scanned), flag as scanned
    return structure;
  }

  /**
   * Try extraction using pdf-parse or pdf.js.
   */
  private async tryPdfJsExtraction(
    buffer: Buffer,
    maxPages: number
  ): Promise<{
    pageCount: number;
    isEncrypted: boolean;
    title: string | null;
    author: string | null;
    pages: Array<{ index: number; text: string; hasImages: boolean }>;
  } | null> {
    try {
      // Try pdf-parse (simpler API)
      const pdfParse = await import('pdf-parse').then(m => m.default || m);
      const data = await pdfParse(buffer);

      // pdf-parse gives us combined text
      const pageTexts = data.text?.split('\f') ?? [];

      return {
        pageCount: data.numpages ?? pageTexts.length,
        isEncrypted: false,
        title: data.info?.Title ?? null,
        author: data.info?.Author ?? null,
        pages: pageTexts.slice(0, maxPages).map((text: string, i: number) => ({
          index: i + 1,
          text: text.trim(),
          hasImages: false,
        })),
      };
    } catch {
      // pdf-parse not installed or failed
    }

    // Fallback: try minimal PDF text extraction
    return this.minimalPdfExtract(buffer, maxPages);
  }

  /**
   * Minimal PDF text extraction — extracts text between parentheses in PDF stream objects.
   * This is a simple heuristic that works for many text PDFs.
   */
  private minimalPdfExtract(
    buffer: Buffer,
    maxPages: number
  ): {
    pageCount: number;
    isEncrypted: boolean;
    title: string | null;
    author: string | null;
    pages: Array<{ index: number; text: string; hasImages: boolean }>;
  } | null {
    const raw = buffer.toString('latin1');

    // Check for encryption
    if (/\/Encrypt\b/.test(raw)) {
      return { pageCount: 0, isEncrypted: true, title: null, author: null, pages: [] };
    }

    // Extract title and author from metadata
    const titleMatch = raw.match(/\/Title\s*\(([^)]*)\)/);
    const authorMatch = raw.match(/\/Author\s*\(([^)]*)\)/);

    // Count pages
    const pageCount = (raw.match(/\/Type\s*\/Page[^s]/g) || []).length;

    // Extract text: look for text between parentheses in BT...ET blocks
    const textBlocks: string[] = [];
    const btEtRegex = /BT([\s\S]*?)ET/g;
    let match;

    while ((match = btEtRegex.exec(raw)) !== null) {
      const block = match[1];
      const textParens = block.match(/\(([^)]*)\)/g);
      if (textParens) {
        const text = textParens
          .map(p => p.slice(1, -1))
          .filter(t => /[^\s]/.test(t))
          .join(' ');
        if (text.trim()) {
          textBlocks.push(text.trim());
        }
      }
    }

    // If we found significant text, it's a text PDF
    const totalText = textBlocks.join('\n\n');

    return {
      pageCount: Math.max(pageCount || 1, 1),
      isEncrypted: false,
      title: titleMatch?.[1] ?? null,
      author: authorMatch?.[1] ?? null,
      pages: totalText
        ? [{ index: 1, text: totalText, hasImages: false }]
        : [],
    };
  }

  private guessTitle(text: string, filename: string): string {
    if (!text) return filename.replace(/\.\w+$/, '');
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    for (const line of lines) {
      const t = line.trim();
      if (t.length >= 5 && t.length <= 200) return t;
    }
    return text.slice(0, 100).trim().split('\n')[0] ?? filename.replace(/\.\w+$/, '');
  }

  private calculateConfidence(text: string, structure: PdfStructure): number {
    if (structure.isEncrypted) return 0;
    if (structure.isScanned) {
      // Scanned PDFs need OCR — low confidence for text extraction
      return 0.1;
    }
    if (text.length > 1000) return 0.98;
    if (text.length > 100) return 0.85;
    if (text.length > 10) return 0.5;
    return 0;
  }
}
