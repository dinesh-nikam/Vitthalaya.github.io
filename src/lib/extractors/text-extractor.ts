/**
 * Digital Pandharpur — Text Document Extractor
 *
 * Handles: TXT, MD, RTF, ODT
 * Uses built-in text decoding for TXT/MD.
 * For RTF and ODT, attempts simple stripping.
 */

import type { IExtractor, ExtractionResult, ExtractionOptions } from './base';

export class TextExtractor implements IExtractor {
  readonly id = 'text-extractor';
  readonly name = 'Text Document Extractor';
  readonly supportedMimeTypes = [
    'text/plain',
    'text/markdown',
    'application/rtf',
    'application/vnd.oasis.opendocument.text',
  ];

  canHandle(mimeType: string, extension: string): boolean {
    const exts = ['.txt', '.md', '.rtf', '.odt'];
    const mimes = this.supportedMimeTypes;
    return mimes.includes(mimeType) || exts.includes(extension.toLowerCase());
  }

  async extract(buffer: Buffer, filename: string, options?: ExtractionOptions): Promise<ExtractionResult> {
    const ext = filename.split('.').pop()?.toLowerCase();

    try {
      let text = '';

      switch (ext) {
        case 'rtf':
          text = this.extractRtf(buffer);
          break;
        case 'odt':
          text = this.extractOdt(buffer);
          break;
        default:
          // TXT, MD — direct UTF-8 decoding
          text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
          break;
      }

      // Clean and normalize
      text = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\t/g, ' ')
        .replace(/[ \t]+$/gm, '')
        .replace(/\n{4,}/g, '\n\n\n')
        .trim();

      const title = this.guessTitle(text, filename);
      const lines = text.split('\n').filter(l => l.trim().length > 0).length;

      return {
        text,
        title,
        textLength: text.length,
        compositionCount: Math.max(1, Math.ceil(lines / 20)), // rough estimate
        metadata: {
          extractor: this.id,
          lineCount: lines,
          detectedEncoding: 'utf-8',
        },
        confidence: text.length > 50 ? 0.95 : 0.5,
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
        error: `Text extraction failed: ${msg}`,
      };
    }
  }

  /**
   * Minimal RTF stripping: remove RTF control codes, keep plain text.
   */
  private extractRtf(buffer: Buffer): string {
    const raw = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    // Strip RTF headers and control sequences
    return raw
      .replace(/\\([a-z]+)(-?\d+)?/g, '')     // remove \controlword
      .replace(/[{}]/g, '')                     // remove braces
      .replace(/\\'[0-9a-f]{2}/g, '')           // remove hex escapes
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Minimal ODT extraction: unzip and look for content.xml, extract text nodes.
   */
  private extractOdt(buffer: Buffer): string {
    // ODT is a ZIP containing content.xml
    // For simplicity, try to find readable text.
    // A full ODT parser would need a ZIP library.
    const raw = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    // Try to locate XML content and strip tags
    const textContent = raw
      .replace(/<[^>]+>/g, '')   // strip XML tags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#[0-9]+;/g, '')
      .trim();

    if (textContent.length > 100) {
      return textContent;
    }
    // Fallback: raw text stripping
    return raw.replace(/[^\w\u0900-\u097F\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Guess a title from the first significant line of text.
   */
  private guessTitle(text: string, filename: string): string {
    if (!text) return filename.replace(/\.\w+$/, '');

    const lines = text.split('\n').filter(l => l.trim().length > 0);

    // Use first non-short line as title
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length >= 10 && trimmed.length <= 200) {
        return trimmed;
      }
    }

    // Fallback: first 100 chars
    return text.slice(0, 100).trim().split('\n')[0] ?? filename.replace(/\.\w+$/, '');
  }
}
