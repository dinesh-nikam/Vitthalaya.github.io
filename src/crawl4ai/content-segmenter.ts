/**
 * Vitthalaya — Content Segmentation Engine
 *
 * Splits pages that contain multiple devotional compositions into
 * individual composition records. Critical for pages like
 * "top 25 abhangs of Tukaram" where one page = many compositions.
 *
 * Supports segmentation strategies:
 *   - heading: Split by heading tags (h1, h2, h3)
 *   - separator: Split by visual/text separators (---, ===, etc.)
 *   - numbering: Split by verse numbering patterns
 *   - regex: Split by custom regex pattern
 *   - ai: AI-assisted boundary detection (uses LLM)
 */

import type {
  ExtractedComposition,
  SegmentationConfig,
  CrawlerTemplate,
} from './types';

const DEFAULT_SEGMENTATION: SegmentationConfig = {
  boundaryStrategy: 'heading',
  minLength: 50,
};

export class ContentSegmenter {
  /**
   * Segment a single extracted composition into multiple compositions.
   * If the page contains only one composition, returns the original unchanged.
   */
  segment(
    composition: ExtractedComposition,
    config?: SegmentationConfig,
  ): ExtractedComposition[] {
    const cfg = { ...DEFAULT_SEGMENTATION, ...config };

    // Quick check: if text is short enough, it's likely a single composition
    if (composition.fullText.length < 500) {
      return [composition];
    }

    const segments = this.detectSegments(composition.fullText, cfg);

    // If segmentation didn't find clear boundaries, return original
    if (segments.length <= 1) {
      return [composition];
    }

    // Check if segmentation actually makes sense (prevent over-splitting)
    const validSegments = segments.filter((s) => {
      const cleanText = s.text.replace(/\s+/g, '').trim();
      return cleanText.length >= cfg.minLength;
    });

    if (validSegments.length <= 1) {
      return [composition];
    }

    // Map segments to compositions
    return validSegments.map((seg, index) => ({
      ...composition,
      titleMarathi: seg.title || `${composition.titleMarathi} — भाग ${index + 1}`,
      fullText: seg.text,
      metadata: {
        ...composition.metadata,
        segmentIndex: String(index),
        segmentCount: String(validSegments.length),
      },
    }));
  }

  /**
   * Batch segment multiple compositions.
   */
  segmentBatch(
    compositions: ExtractedComposition[],
    templates?: Map<string, CrawlerTemplate>,
  ): ExtractedComposition[] {
    const results: ExtractedComposition[] = [];

    for (const comp of compositions) {
      // Find template for the source URL
      let config: SegmentationConfig | undefined;
      if (templates) {
        for (const template of templates.values()) {
          if (template.domainPattern && new RegExp(template.domainPattern, 'i').test(comp.sourceUrl)) {
            config = template.segmentation;
            break;
          }
        }
      }
      const segmented = this.segment(comp, config);
      results.push(...segmented);
    }

    return results;
  }

  // ─── Detection Strategies ──────────────────────────────────

  private detectSegments(
    text: string,
    config: SegmentationConfig,
  ): Array<{ title?: string; text: string }> {
    switch (config.boundaryStrategy) {
      case 'heading':
        return this.splitByHeadings(text);
      case 'separator':
        return this.splitBySeparator(text, config.separator);
      case 'numbering':
        return this.splitByNumbering(text);
      case 'regex':
        return this.splitByRegex(text, config.boundaryPattern);
      case 'ai':
        return this.splitByHeuristics(text);
      default:
        return this.splitByHeadings(text);
    }
  }

  /**
   * Split by markdown/HTML heading tags.
   */
  private splitByHeadings(text: string): Array<{ title?: string; text: string }> {
    // Match headings: # Heading, ## Heading, or <h1>Heading
    const headingRegex = /^(#{1,6})\s+(.+)$|^<h[1-6][^>]*>(.+?)<\/h[1-6]>/gm;
    const segments: Array<{ title?: string; text: string }> = [];

    const matches: Array<{ index: number; title: string; fullMatchLen: number }> = [];
    let match: RegExpExecArray | null;
    while ((match = headingRegex.exec(text)) !== null) {
      const title = (match[2] || match[3] || '').trim();
      if (title) {
        matches.push({ index: match.index, title, fullMatchLen: match[0].length });
      }
    }

    // If no clear headings found, try looking for Devanagari text blocks
    if (matches.length <= 1) {
      return this.splitByDevanagariBlocks(text);
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];
      const start = current.index + current.title.length + current.fullMatchLen;
      const end = next ? next.index : text.length;
      const content = text.slice(start, end).trim();

      if (content) {
        segments.push({ title: current.title, text: content });
      }
    }

    return segments;
  }

  /**
   * Split by Devanagari verse numbering patterns.
   * Common patterns: "१.", "२.", "॥१॥", "अभंग क्र. १"
   */
  private splitByNumbering(text: string): Array<{ title?: string; text: string }> {
    // Marathi verse numbering patterns
    const patterns = [
      /(?:^|\n)\s*(?:[\u0966-\u096F]+)\s*[.)]\s*/g,     // १. २. ३.
      /(?:^|\n)\s*॥\s*[\u0966-\u096F]+\s*॥\s*/g,           // ॥१॥
      /(?:^|\n)\s*अभंग\s+(?:क्र\.?\s*)?[\u0966-\u096F]+\s*/gi, // अभंग क्र. १
      /(?:^|\n)\s*\d+\s*[.)]\s*/g,                          // 1. 2. 3.
    ];

    for (const pattern of patterns) {
      const segments = this.splitByRegex(text, pattern);
      if (segments.length > 1) {
        return segments;
      }
    }

    return [{ text }];
  }

  /**
   * Split by visual/text separators.
   */
  private splitBySeparator(
    text: string,
    separator?: string,
  ): Array<{ title?: string; text: string }> {
    const sep = separator ?? /^[-*=_]{3,}$/gm;
    const parts = text.split(sep).map((s) => s.trim()).filter(Boolean);

    if (parts.length <= 1) {
      return [{ text }];
    }      return parts.map((part, _i) => {
      // First line of each part may be a title
      const lines = part.split('\n').map((l) => l.trim()).filter(Boolean);
      const title = lines.length > 1 ? lines[0] : undefined;
      const body = title ? lines.slice(1).join('\n') : part;
      return { title, text: body || part };
    });
  }

  /**
   * Split by custom regex pattern.
   */
  private splitByRegex(
    text: string,
    pattern?: string | RegExp,
  ): Array<{ title?: string; text: string }> {
    if (!pattern) return [{ text }];

    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'gm') : pattern;
    const parts = text.split(regex).map((s) => s.trim()).filter(Boolean);

    if (parts.length <= 1) {
      return [{ text }];
    }

    return parts.map((part) => {
      const lines = part.split('\n').map((l) => l.trim()).filter(Boolean);
      const title = lines.length > 1 ? lines[0] : undefined;
      const body = title ? lines.slice(1).join('\n') : part;
      return { title, text: body || part };
    });
  }

  /**
   * Split by AI/heuristic analysis — looks for natural composition boundaries.
   */
  private splitByHeuristics(text: string): Array<{ title?: string; text: string }> {
    // Use multiple heuristics and pick the one that produces the best split
    const strategies = [
      () => this.splitByHeadings(text),
      () => this.splitByNumbering(text),
      () => this.splitByDevanagariBlocks(text),
    ];

    let bestSegments: Array<{ title?: string; text: string }> = [{ text }];
    let bestScore = 0;

    for (const strat of strategies) {
      const segments = strat();
      if (segments.length <= 1) continue;

      // Score: prefer reasonable segment count (2-20) with mostly even sizes
      const score = this.scoreSegmentation(segments);
      if (score > bestScore) {
        bestScore = score;
        bestSegments = segments;
      }
    }

    return bestSegments;
  }

  /**
   * Split by detecting blocks of Devanagari text separated by significant gaps.
   */
  private splitByDevanagariBlocks(text: string): Array<{ title?: string; text: string }> {
    // Look for lines that could be titles (short, no Devanagari numbers at start)
    const lines = text.split('\n').map((l) => l.trim());
    const blocks: Array<{ title?: string; text: string }> = [];
    let currentBlock: string[] = [];
    let currentTitle: string | undefined;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) {
        // Empty line might be a separator
        if (currentBlock.length > 0) {
          const blockText = currentBlock.join('\n').trim();
          if (blockText.length >= 100) {
            // Check if the first line looks like a title
            const firstLine = currentBlock[0];
            const isTitle = firstLine.length < 80
              && !/^[\u0966-\u096F]/.test(firstLine)  // Not starting with Devanagari number
              && !firstLine.startsWith('॥');           // Not starting with verse marker
            blocks.push({
              title: isTitle ? firstLine : currentTitle,
              text: isTitle ? currentBlock.slice(1).join('\n').trim() || blockText : blockText,
            });
          } else if (currentBlock.length <= 2 && currentBlock.join(' ').length < 80) {
            // This might be a title for the next block
            currentTitle = currentBlock.join(' ').trim();
          }
          currentBlock = [];
        }
        continue;
      }
      currentBlock.push(line);
    }

    // Last block
    if (currentBlock.length > 0) {
      const blockText = currentBlock.join('\n').trim();
      if (blockText.length >= 100) {
        const firstLine = currentBlock[0];
        const isTitle = firstLine.length < 80
          && !/^[\u0966-\u096F]/.test(firstLine)
          && !firstLine.startsWith('॥');
        blocks.push({
          title: isTitle ? firstLine : currentTitle,
          text: isTitle ? currentBlock.slice(1).join('\n').trim() || blockText : blockText,
        });
      }
    }

    return blocks.length > 1 ? blocks : [{ text }];
  }

  /**
   * Score a segmentation result — prefer reasonable number of even-sized blocks.
   */
  private scoreSegmentation(
    segments: Array<{ title?: string; text: string }>,
  ): number {
    if (segments.length <= 1) return 0;
    if (segments.length > 50) return 0; // Too many segments

    const lengths = segments.map((s) => s.text.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((acc, len) => acc + Math.pow(len - avgLength, 2), 0) / lengths.length;
    const cv = Math.sqrt(variance) / avgLength; // Coefficient of variation

    // Prefer segments that have titles
    const titleRatio = segments.filter((s) => s.title).length / segments.length;

    // Score: prefer 3-20 segments, low variance, high title ratio
    const sizeScore = segments.length >= 3 && segments.length <= 20 ? 1 : 0.3;
    const varianceScore = cv < 0.8 ? 1 : 0.5;
    const titleScore = titleRatio > 0.5 ? 1 : titleRatio;

    return sizeScore * 0.4 + varianceScore * 0.3 + titleScore * 0.3;
  }
}
