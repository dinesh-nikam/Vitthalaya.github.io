/**
 * Digital Pandharpur — Marathi Text Normalization
 *
 * Production-grade Unicode normalization pipeline for Marathi devotional text.
 * Handles: NFC/NFD normalization, Devanagari variants, ZWJ/ZWJ removal,
 * anusvar/chandrabindu normalization, punctuation stripping, whitespace collapse.
 */

// ─── Unicode Ranges ─────────────────────────────────────────────────────────

const DEVANAGARI_RANGE = /[\u0900-\u097F]/;

// ─── Character Mappings ─────────────────────────────────────────────────────

/** Anusvara (ं U+0902) and Chandrabindu (ँ U+0901) are often interchangeable in
 *  modern Marathi text. Normalize to anusvara for canonical comparison. */
const CHANDRABINDU_TO_ANUSVARA = /\u0901/g;

/** Zero-Width Joiner (U+200D) and Zero-Width Non-Joiner (U+200C) — often
 *  appear inconsistently in scraped text or OCR output. Remove for matching. */
const ZWJ_PATTERN = /[\u200C\u200D]/g;

/** Set of common Devanagari punctuation and spacing characters that should be
 *  stripped for comparison purposes but preserved in display text. */
const PUNCTUATION_PATTERN = /[।॥@#\$%\^&\*\+\-=\[\]{}|;:'"<>,\/\\!`~\(\)\u0964\u0965?]/g;

/** Marathi-specific vowel length variations (short vs long).
 *  Some sources write िा (i + length marker) vs ा (aa), etc.
 *  These are already handled by Unicode NFC normalization, but we add
 *  explicit mappings for common OCR/scraping artefacts. */
const VOWEL_LENGTH_VARIANTS: Record<string, string> = {
  // No-op: Unicode NFC handles most vowel sign normalization.
  // This map exists for future scraper-specific overrides.
};

/**
 * Fix common Devanagari OCR errors, spelling variants, and artifacts.
 */
export function fixOcrErrors(text: string): string {
  return text
    // Fix misread ज्ञा / ज्ञानेश्वर variants from legacy OCR engines
    .replace(/द्न्या/g, 'ज्ञा')
    .replace(/द्न्य/g, 'ज्ञ')
    .replace(/द़्न्या/g, 'ज्ञा')
    .replace(/द्‌न्या/g, 'ज्ञा')
    // Remove typical PDF/Book page numbering headers/footers (e.g., "गाथा - पान १२३")
    .replace(/पान\s+[०१२३४५६७८९\d]+/gi, '')
    // Remove line numbers common in book indexes (e.g., "१. ", "२३. ")
    .replace(/^[०१२३४५६७८९\d]+[\.\s\-।]+/gm, '')
    // Collapse consecutive anusvaras
    .replace(/\u0902\u0902+/g, '\u0902');
}

// ─── Normalization Functions ────────────────────────────────────────────────

/**
 * Normalize a Marathi string for comparison purposes.
 * This is a LOSSLY transformation — it strips information that is
 * irrelevant for matching while preserving meaning.
 *
 * Pipeline:
 *  1. NFC normalization (composed form)
 *  2. Fix OCR errors
 *  3. Chandrabindu → Anusvara
 *  4. Strip ZWJ/ZWNJ
 *  5. Strip punctuation
 *  6. Collapse whitespace
 *  7. Trim
 */
export function normalizeForComparison(text: string): string {
  return (
    text
      // Step 1: NFC (Normalization Form C — composed characters)
      .normalize('NFC')
      // Step 2: Fix OCR-specific errors and patterns
      .replace(CHANDRABINDU_TO_ANUSVARA, '\u0902') // Move this up or process first
      .split('\n')
      .map(line => fixOcrErrors(line))
      .join('\n')
      // Step 3: Chandrabindu → Anusvara (already done above, but keep for safety)
      .replace(CHANDRABINDU_TO_ANUSVARA, '\u0902')
      // Step 4: Strip zero-width joiners/non-joiners
      .replace(ZWJ_PATTERN, '')
      // Step 5: Strip Devanagari and ASCII punctuation
      .replace(PUNCTUATION_PATTERN, ' ')
      // Step 6: Collapse multiple whitespace characters
      .replace(/\s+/g, ' ')
      // Step 7: Trim leading/trailing whitespace
      .trim()
      // Step 8: Lowercase (ASCII only — Devanagari has no case)
      .toLowerCase()
  );
}

/**
 * Light normalization for display purposes.
 * Only fixes obvious rendering issues without stripping meaning.
 */
export function normalizeForDisplay(text: string): string {
  return fixOcrErrors(text)
    .normalize('NFC')
    .replace(ZWJ_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strip all non-Devanagari characters, used for extracting pure
 * Marathi text from mixed-language content.
 * Preserves spaces and newlines for structure.
 */
export function extractDevanagari(text: string): string {
  const lines = text.split('\n');
  return lines
    .map((line) => {
      const chars = [...line].filter(
        (c) => DEVANAGARI_RANGE.test(c) || c === ' ' || c === '\t'
      );
      return chars.join('').trim();
    })
    .filter((l) => l.length > 0)
    .join('\n');
}

/**
 * Generate both NFC and NFD forms for reverse matching.
 * Some sources may produce NFD text; matching should test both forms.
 */
export function getNormalizedForms(text: string): { nfc: string; nfd: string } {
  const nfc = text.normalize('NFC');
  const nfd = text.normalize('NFD');
  return { nfc, nfd };
}

/**
 * Check if text is primarily Marathi/Devanagari.
 * Returns true if >50% of non-whitespace characters are Devanagari.
 */
export function isMarathiText(text: string): boolean {
  const chars = [...text.replace(/\s/g, '')];
  if (chars.length === 0) return false;
  const devanagariCount = chars.filter((c) => DEVANAGARI_RANGE.test(c)).length;
  return devanagariCount / chars.length > 0.5;
}

/**
 * Compute a content hash for exact deduplication.
 * Uses Bun.hash for fast non-cryptographic hashing of normalized text.
 */
export function contentHash(text: string): string {
  const normalized = normalizeForComparison(text);
  return Bun.hash(normalized).toString(36);
}

/**
 * Split text into lines (for abhang ovi-level matching).
 * Filters empty lines and trims each line.
 */
export function splitIntoLines(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/**
 * Extract unique words from a Marathi string.
 * Handles Devanagari word boundaries (spaces, punctuation).
 */
export function tokenize(text: string): string[] {
  const normalized = normalizeForComparison(text);
  return normalized
    .split(/\s+/)
    .filter((t) => t.length > 0 && t.length <= 100) // filter outliers
    .filter((t) => t !== '।' && t !== '॥');
}
