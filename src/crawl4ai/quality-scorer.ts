/**
 * Vitthalaya — Content Quality Scoring Engine
 *
 * Every extracted composition receives a quality score that determines
 * whether it can be auto-approved or needs manual review.
 *
 * Scoring dimensions:
 *   - Text Completeness: Is the text complete or truncated?
 *   - OCR Quality: 1.0 for non-OCR, lower for OCR with artifacts
 *   - Metadata Quality: Has saint, deity, type, etc.
 *   - Uniqueness: Is this a duplicate of existing content?
 *   - Source Trust: How trustworthy is the source?
 *   - Text Quality: Unicode correctness, no garbled text
 *
 * Score thresholds:
 *   >= 0.85: PREMIUM — Auto-approve, index immediately
 *   0.70-0.84: STANDARD — Auto-approve, index immediately
 *   0.50-0.69: DRAFT — Send to moderation
 *   < 0.50: REVIEW — Flag for human review
 */

import type { QualityScore, QualityComponents, QualityTier, ExtractedComposition, ContentQualityReport, QualityIssue } from './types';

export class QualityScorer {
  /**
   * Score a single extracted composition.
   */
  score(composition: ExtractedComposition, sourceTrustScore?: number): QualityScore {
    const components = this.computeComponents(composition, sourceTrustScore);
    const overall = this.computeOverall(components);
    const tier = this.getTier(overall);
    const recommendation = this.getRecommendation(tier, components);

    return { overall, components, tier, recommendation };
  }

  /**
   * Score multiple compositions and return full quality report.
   */
  scoreBatch(
    compositions: ExtractedComposition[],
    sourceTrustScore?: number,
  ): ContentQualityReport[] {
    return compositions.map((comp) => this.report(comp, sourceTrustScore));
  }

  /**
   * Generate a full quality report with issues and suggestions.
   */
  report(
    composition: ExtractedComposition,
    sourceTrustScore?: number,
  ): ContentQualityReport {
    const score = this.score(composition, sourceTrustScore);
    const issues = this.findIssues(composition, score.components);
    const suggestions = this.generateSuggestions(issues);
    const passed = score.overall >= 0.5; // Minimum threshold for moderation

    return {
      sourceId: composition.sourceUrl,
      url: composition.sourceUrl,
      score,
      issues,
      suggestions,
      passed,
    };
  }

  // ─── Component Computation ─────────────────────────────────

  private computeComponents(
    comp: ExtractedComposition,
    sourceTrustScore?: number,
  ): QualityComponents {
    return {
      completeness: this.scoreCompleteness(comp),
      ocrScore: this.scoreOCRQuality(comp),
      metadataScore: this.scoreMetadata(comp),
      duplicateScore: this.scoreUniqueness(comp),
      sourceTrustScore: sourceTrustScore ?? (comp as any).confidence ?? 0.5,
      textQuality: this.scoreTextQuality(comp),
    };
  }

  /**
   * Text completeness check (0-1).
   * Penalizes truncated text, very short text, or missing text.
   */
  private scoreCompleteness(comp: ExtractedComposition): number {
    const text = comp.fullText?.trim() ?? '';
    const charCount = text.length;

    // Missing text
    if (!text || charCount < 20) return 0;

    // Suspiciously short
    if (charCount < 50) return 0.3;

    // Reasonable length for a devotional composition
    if (charCount >= 200 && charCount <= 50000) return 1.0;

    // Very long — might include multiple compositions (not necessarily bad)
    if (charCount > 50000) return 0.8;

    // Short but plausible
    if (charCount >= 50) return 0.7;

    return 0.5;
  }

  /**
   * OCR quality detection (0-1).
   * 1.0 = not OCR'd (clean source), lower = OCR artifacts detected.
   */
  private scoreOCRQuality(comp: ExtractedComposition): number {
    const text = comp.fullText ?? '';

    // Look for OCR artifacts: repeated characters, wrong Unicode ranges
    const ocrArtifacts = [
      /[|\\\/_^`~{}\[\]<>]/g,  // Excessive special chars
      /(.)\1{4,}/g,             // Same char repeated 5+ times (lllll)
      /[A-Za-z]{20,}/g,         // Very long Latin sequences (OCR hallucination)
    ];

    let artifactCount = 0;
    for (const pattern of ocrArtifacts) {
      const matches = text.match(pattern);
      if (matches) artifactCount += matches.length;
    }

    // Lower score if many artifacts relative to text length
    if (artifactCount > 10 && text.length < 1000) return 0.3;
    if (artifactCount > 5 && text.length < 500) return 0.5;

    // Check for mixed Latin/Devanagari in wrong places
    const devanagariRatio = (text.match(/[\u0900-\u097F]/g)?.length ?? 0) / text.length;
    const latinRatio = (text.match(/[a-zA-Z]/g)?.length ?? 0) / text.length;

    // If it's supposed to be Marathi but has too much Latin
    if (devanagariRatio > 0.1 && latinRatio > devanagariRatio) return 0.6;

    return 1.0;
  }

  /**
   * Metadata completeness (0-1).
   */
  private scoreMetadata(comp: ExtractedComposition): number {
    let score = 0;
    const checks = 6;

    if (comp.titleMarathi && comp.titleMarathi.length > 0) score++;
    if (comp.type) score++;
    if (comp.saintNameMarathi || comp.saintNameTranslit) score++;
    if (comp.deityNameMarathi || comp.deityNameTranslit) score++;
    if (comp.sourceAttribution) score++;
    if (comp.language) score++;

    return score / checks;
  }

  /**
   * Uniqueness check (0-1).
   * Relies on existing composition check; 1.0 = unique, 0 = exact duplicate.
   */
  private scoreUniqueness(comp: ExtractedComposition): number {
    if (comp.existingCompositionId) return 0;
    if (comp.confidence < 0.3) return 0.5;
    return 1.0;
  }

  /**
   * Text quality check (0-1).
   */
  private scoreTextQuality(comp: ExtractedComposition): number {
    const text = comp.fullText ?? '';

    // Check for garbled Unicode
    const replacementChars = (text.match(/\uFFFD/g)?.length ?? 0);
    const nullChars = (text.match(/\u0000/g)?.length ?? 0);

    if (replacementChars > 0 || nullChars > 0) return 0.3;

    // Check for encoding issues (mixed scripts in wrong places)
    const hasDevanagari = /[\u0900-\u097F]/.test(text);
    if (hasDevanagari) {
      // Should have Devanagari word patterns (consonant + vowel markers)
      const validPatterns = /[\u0900-\u097F][\u0900-\u097F\u0900-\u097F]/;
      if (!validPatterns.test(text.replace(/\s/g, ''))) return 0.5;
    }

    // Check line length consistency (poetic lines)
    const lines = text.split('\n').filter(Boolean);
    if (lines.length >= 4) {
      const avgLineLen = lines.reduce((s, l) => s + l.length, 0) / lines.length;
      const longLines = lines.filter((l) => l.length > avgLineLen * 3).length;
      // Penalize if most lines are suspiciously long or short
      if (longLines > lines.length * 0.3) return 0.7;
    }

    return 1.0;
  }

  // ─── Score Aggregation ─────────────────────────────────────

  private computeOverall(components: QualityComponents): number {
    const weights = {
      completeness: 0.25,
      ocrScore: 0.15,
      metadataScore: 0.20,
      duplicateScore: 0.15,
      sourceTrustScore: 0.15,
      textQuality: 0.10,
    };

    const score =
      components.completeness * weights.completeness +
      components.ocrScore * weights.ocrScore +
      components.metadataScore * weights.metadataScore +
      components.duplicateScore * weights.duplicateScore +
      components.sourceTrustScore * weights.sourceTrustScore +
      components.textQuality * weights.textQuality;

    return Math.max(0, Math.min(1, score));
  }

  // ─── Tier Classification ───────────────────────────────────

  private getTier(score: number): QualityTier {
    if (score >= 0.85) return 'premium';
    if (score >= 0.70) return 'standard';
    if (score >= 0.50) return 'draft';
    return 'review';
  }

  // ─── Issues & Suggestions ─────────────────────────────────

  private findIssues(
    comp: ExtractedComposition,
    components: QualityComponents,
  ): QualityIssue[] {
    const issues: QualityIssue[] = [];

    if (!comp.titleMarathi || comp.titleMarathi === 'Untitled') {
      issues.push({ severity: 'major', category: 'missing-title', message: 'Missing or placeholder title' });
    }

    if (!comp.fullText || comp.fullText.trim().length < 20) {
      issues.push({ severity: 'critical', category: 'missing-text', message: 'Missing or empty composition text' });
    } else if (comp.fullText.length < 100) {
      issues.push({ severity: 'major', category: 'truncated-text', message: 'Composition text is very short — may be truncated' });
    }

    if (components.ocrScore < 0.7) {
      issues.push({ severity: 'major', category: 'ocr-artifacts', message: 'OCR artifacts detected in text' });
    }

    if (components.textQuality < 0.7) {
      issues.push({ severity: 'major', category: 'encoding-issues', message: 'Text encoding issues detected' });
    }

    if (!comp.type) {
      issues.push({ severity: 'minor', category: 'missing-type', message: 'Composition type not detected' });
    }

    if (!comp.saintNameMarathi && !comp.saintNameTranslit) {
      issues.push({ severity: 'minor', category: 'missing-saint', message: 'Saint attribution not detected' });
    }

    if (!/[\u0900-\u097F]/.test(comp.fullText)) {
      issues.push({ severity: 'major', category: 'no-marathi-content', message: 'No Devanagari/Marathi content detected' });
    }

    if (comp.existingCompositionId) {
      issues.push({ severity: 'info', category: 'suspected-duplicate', message: 'Appears to be a duplicate of existing composition' });
    }

    return issues;
  }

  private generateSuggestions(issues: QualityIssue[]): string[] {
    const suggestions: string[] = [];
    const suggestionMap: Record<string, string> = {
      'missing-title': 'Extract title from first line or heading of the text',
      'missing-text': 'Re-crawl the source URL to verify content is accessible',
      'truncated-text': 'Check if the page requires scrolling or JavaScript rendering',
      'ocr-artifacts': 'Run manual OCR verification or use a different OCR engine',
      'encoding-issues': 'Verify the source encoding (UTF-8 expected for Devanagari)',
      'missing-type': 'Use AI classification to determine composition type',
      'missing-saint': 'Use AI enrichment to identify saint from text patterns',
      'no-marathi-content': 'Verify this is a Marathi language source',
      'suspected-duplicate': 'Run through canonical dedup engine',
    };

    for (const issue of issues) {
      const suggestion = suggestionMap[issue.category];
      if (suggestion && !suggestions.includes(suggestion)) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  private getRecommendation(tier: QualityTier, _components: QualityComponents): string {
    switch (tier) {
      case 'premium':
        return 'Auto-approve: High quality content ready for immediate publishing';
      case 'standard':
        return 'Auto-approve: Good quality content suitable for publishing';
      case 'draft':
        return 'Send to moderation: Manual review required before publishing';
      case 'review':
        return 'Flag for editor review: Low quality content needs expert evaluation';
    }
  }
}
