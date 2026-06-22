/**
 * Digital Pandharpur — DOCX Extractor
 *
 * Extracts text and metadata from .docx files using the mammoth library.
 * Falls back to basic ZIP text extraction if mammoth is unavailable.
 */

import type { IExtractor, ExtractionResult, ExtractionOptions } from './base';

export class DocxExtractor implements IExtractor {
  readonly id = 'docx-extractor';
  readonly name = 'DOCX Document Extractor';
  readonly supportedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ];

  canHandle(mimeType: string, extension: string): boolean {
    return (
      this.supportedMimeTypes.includes(mimeType) ||
      ['.docx', '.doc'].includes(extension.toLowerCase())
    );
  }

  async extract(buffer: Buffer, _filename: string, _options?: ExtractionOptions): Promise<ExtractionResult> {
    try {
      // Try to use mammoth for DOCX
      const text = await this.extractWithMammoth(buffer);

      if (text.length > 0) {
        const title = this.guessTitle(text);
        const lines = text.split('\n').filter(l => l.trim().length > 0).length;

        return {
          text,
          title,
          textLength: text.length,
          compositionCount: Math.max(1, Math.ceil(lines / 20)),
          metadata: {
            extractor: this.id,
            lineCount: lines,
            method: 'mammoth',
          },
          confidence: text.length > 50 ? 0.95 : 0.5,
        };
      }
    } catch {
      // Fall through to ZIP-based extraction
    }

    // Fallback: raw text from buffer
    return this.fallbackExtract(buffer);
  }

  private async extractWithMammoth(buffer: Buffer): Promise<string> {
    try {
      // Dynamic import — mammoth may not be installed
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value ?? '';
    } catch {
      // mammoth not available
      return '';
    }
  }

  private async fallbackExtract(buffer: Buffer): Promise<ExtractionResult> {
    // DOCX is a ZIP. Try to find document.xml and extract text.
    try {
      // Check if we can use a ZIP library
      const { extractTextFromZip } = await import('./zip-utils');
      const text = await extractTextFromZip(buffer, 'word/document.xml');

      if (text.length > 0) {
        const cleaned = text
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#[0-9]+;/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        return {
          text: cleaned,
          title: cleaned.slice(0, 100).trim().split('\n')[0] || 'DOCX Document',
          textLength: cleaned.length,
          compositionCount: 1,
          metadata: { extractor: this.id, method: 'zip-fallback' },
          confidence: cleaned.length > 50 ? 0.85 : 0.3,
        };
      }
    } catch {
      // No ZIP support either
    }

    // Last resort
    const raw = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    // Strip common binary noise
    const cleaned = raw.replace(/[^\w\u0900-\u097F\s.,!?;:-]/g, ' ').replace(/\s+/g, ' ').trim();
    const textContent = cleaned.length > 100 ? cleaned : '';

    return {
      text: textContent,
      title: 'DOCX Document',
      textLength: textContent.length,
      compositionCount: 1,
      metadata: { extractor: this.id, method: 'raw-fallback' },
      confidence: textContent.length > 100 ? 0.5 : 0.1,
    };
  }

  private guessTitle(text: string): string {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    for (const line of lines) {
      const t = line.trim();
      if (t.length >= 5 && t.length <= 200) return t;
    }
    return text.slice(0, 100).trim().split('\n')[0] ?? 'DOCX Document';
  }
}
