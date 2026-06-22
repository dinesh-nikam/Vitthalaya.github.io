/**
 * Digital Pandharpur — EPUB Extractor
 *
 * Extracts text, chapters, and metadata from EPUB files.
 * EPUB is a ZIP archive containing XHTML content and OPF metadata.
 */

import type { IExtractor, ExtractionResult, ExtractionOptions } from './base';
import { extractTextFromZip } from './zip-utils';

export class EpubExtractor implements IExtractor {
  readonly id = 'epub-extractor';
  readonly name = 'EPUB Ebook Extractor';
  readonly supportedMimeTypes = ['application/epub+zip'];

  canHandle(mimeType: string, extension: string): boolean {
    return (
      this.supportedMimeTypes.includes(mimeType) ||
      ['.epub', '.mobi', '.azw'].includes(extension.toLowerCase())
    );
  }

  async extract(buffer: Buffer, filename: string, options?: ExtractionOptions): Promise<ExtractionResult> {
    try {
      // Step 1: Read container.xml to find OPF metadata file
      const containerXml = await extractTextFromZip(buffer, 'META-INF/container.xml');
      const opfPath = this.extractOpfPath(containerXml);

      if (!opfPath) {
        return await this.fallbackExtract(buffer, filename);
      }

      // Step 2: Read OPF metadata
      const opfXml = await extractTextFromZip(buffer, opfPath);

      const title = this.extractXmlValue(opfXml, 'dc:title') ??
                    this.extractXmlValue(opfXml, 'title') ??
                    filename.replace(/\.\w+$/, '');
      const author = this.extractXmlValue(opfXml, 'dc:creator') ??
                     this.extractXmlValue(opfXml, 'creator');

      // Step 3: Find all content files from OPF manifest & spine
      const contentFiles = this.extractContentFiles(opfXml, opfPath);

      // Step 4: Extract text from each content file
      const chapters: Array<{ title: string; text: string }> = [];
      const maxFiles = options?.maxPages ?? contentFiles.length;

      for (let i = 0; i < Math.min(contentFiles.length, maxFiles); i++) {
        const { href } = contentFiles[i];
        const resolvedPath = this.resolvePath(opfPath, href);
        const content = await extractTextFromZip(buffer, resolvedPath);

        if (content) {
          const chapterTitle = this.extractChapterTitle(content);
          const text = this.stripHtml(content).trim();

          if (text.length > 0) {
            chapters.push({ title: chapterTitle, text });
          }
        }
      }

      // Step 5: Assemble result
      const allText = chapters.map(c => c.text).join('\n\n');
      const lines = allText.split('\n').filter(l => l.trim().length > 0).length;

      return {
        text: allText,
        title,
        textLength: allText.length,
        compositionCount: Math.max(chapters.length, Math.ceil(lines / 20)),
        metadata: {
          extractor: this.id,
          chapters: chapters.length,
          author,
          source: 'epub',
        },
        confidence: allText.length > 100 ? 0.95 : 0.3,
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
        error: `EPUB extraction failed: ${msg}`,
      };
    }
  }

  private extractOpfPath(containerXml: string): string | null {
    const match = containerXml.match(/href="([^"]*\.opf)"/i);
    if (match) return match[1];
    // Also try full-path attribute
    const match2 = containerXml.match(/full-path="([^"]*)"/i);
    return match2?.[1] ?? null;
  }

  private extractXmlValue(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
    const match = xml.match(regex);
    return match?.[1]?.trim() ?? null;
  }

  private extractContentFiles(
    opfXml: string,
    opfPath: string
  ): Array<{ id: string; href: string }> {
    const files: Array<{ id: string; href: string }> = [];
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

    // Get spine order
    const spineRefs: string[] = [];
    const spineRegex = /<itemref[^>]*idref="([^"]*)"/g;
    let spineMatch;
    while ((spineMatch = spineRegex.exec(opfXml)) !== null) {
      spineRefs.push(spineMatch[1]);
    }

    // Get manifest items
    const itemRegex = /<item[^>]*id="([^"]*)"[^>]*href="([^"]*)"/g;
    let itemMatch;
    const manifest = new Map<string, string>();

    while ((itemMatch = itemRegex.exec(opfXml)) !== null) {
      manifest.set(itemMatch[1], itemMatch[2]);
    }

    // Build spine-ordered file list
    for (const ref of spineRefs) {
      const href = manifest.get(ref);
      if (href && this.isContentFile(href)) {
        files.push({ id: ref, href: opfDir + href });
      }
    }

    // Fallback: all manifest items if spine is empty
    if (files.length === 0) {
      for (const [id, href] of manifest) {
        if (this.isContentFile(href)) {
          files.push({ id, href: opfDir + href });
        }
      }
    }

    return files;
  }

  private isContentFile(href: string): boolean {
    const lower = href.toLowerCase();
    return lower.endsWith('.xhtml') || lower.endsWith('.html') || lower.endsWith('.htm') || lower.endsWith('.xml');
  }

  private resolvePath(opfPath: string, relativePath: string): string {
    if (relativePath.startsWith('/')) {
      return relativePath.slice(1);
    }
    const baseDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
    return baseDir + relativePath;
  }

  private extractChapterTitle(html: string): string {
    // Try h1-h3 tags
    const headingMatch = html.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/i);
    if (headingMatch) return headingMatch[1].trim();
    // Try title tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch?.[1]?.trim() ?? '';
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#160;/g, ' ')
      .replace(/&#x?[0-9a-fA-F]+;/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private async fallbackExtract(buffer: Buffer, filename: string): Promise<ExtractionResult> {
    // Try to extract any readable text from the raw buffer
    const raw = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    const text = raw
      .replace(/<[^>]+>/g, '')
      .replace(/[^\w\u0900-\u097F\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      text: text.length > 100 ? text : '',
      title: filename.replace(/\.\w+$/, ''),
      textLength: text.length,
      compositionCount: 1,
      metadata: { extractor: this.id, method: 'fallback' },
      confidence: text.length > 500 ? 0.4 : 0.1,
    };
  }
}
