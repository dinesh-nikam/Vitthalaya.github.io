/**
 * Vitthalaya — Internet Archive OCR Bulk Acquisition
 *
 * Downloads OCR text (_djvu.txt) from Internet Archive for Marathi
 * devotional books (Namdev Gatha, Tukaram Gatha, Eknath Gatha, etc.)
 * and extracts individual abhangs/compositions, deduplicating by
 * content hash and persisting to the database.
 *
 * Usage: bun run scripts/acquire-internet-archive.ts
 *        bun run scripts/acquire-internet-archive.ts --dry-run
 *        bun run scripts/acquire-internet-archive.ts --source=namdev
 *        bun run scripts/acquire-internet-archive.ts --limit=50
 */

import { db } from '../src/db/client';
import { isMarathiText } from '../src/canonical/normalization';
import { AcquisitionPipeline } from '../src/crawl4ai/pipeline';
import { ContentExtractor } from '../src/crawl4ai/content-extractor';
import { ContentSegmenter } from '../src/crawl4ai/content-segmenter';
import { MetadataExtractor } from '../src/crawl4ai/metadata-extractor';
import { QualityScorer } from '../src/crawl4ai/quality-scorer';
import type { CrawlerEngine, ExtractedComposition } from '../src/crawl4ai/types';

// ─── Noop Crawler Engine ───────────────────────────────────────────
// Satisfies the CrawlerEngine interface but does nothing.
// Used only because AcquisitionPipeline constructor requires an engine;
// runForExtractedCompositions() never calls it.
function createNoopEngine(): CrawlerEngine {
  return {
    initialize: async () => {},
    crawl: async () => ({
      id: '', url: '', status: 'completed' as const, strategy: 'ocr' as const,
      compositions: [], startedAt: new Date().toISOString(),
    }),
    crawlBatch: async () => [],
    crawlDeep: async () => [],
    destroy: async () => {},
    getStats: () => ({ pagesCrawled: 0, uptimeMs: 0 }),
  };
}

// ─── Configuration ───────────────────────────────────────────────

const IA_USER_AGENT = 'Vitthalaya/1.0 (content acquisition; contact@vitthalaya)';

interface IaTarget {
  /** Internet Archive identifier */
  identifier: string;
  /** Exact filename of the _djvu.txt in the item's files */
  textFilename: string;
  /** Display name for reporting */
  name: string;
  /** Saint DB ID (UUID) */
  saintId: string;
  /** Saint name in Marathi */
  saintNameMarathi: string;
  /** Composition type */
  type: string;
  /** Attribution string */
  attribution: string;
  /** OCR text cleanup hints */
  authorSignatures: string[];       // Lines that mark end of an abhang (e.g. "नामा ह्मणे")
  /** Parser strategy: 'marker' for "॥ NNNN ॥" boundaries, 'number-prefix' for "NNNN. " line-start boundaries */
  parserType?: 'marker' | 'number-prefix';
}

const NAMDEV_ID = '3657990a-f0af-4661-b9f3-6de714af3571';
const TUKARAM_ID = '4dbae91c-b434-434f-975d-8e4a8aa74a9b';
const EKNATH_ID = '03f8d3ff-b04f-4b1b-af9d-fc32a779f385';
const DNYANESHWAR_ID = '0ffe900b-dff0-4d94-ad27-ad43b08f5ca1';

const TARGETS: IaTarget[] = [
  {
    identifier: 'sant-namdev-gatha',
    textFilename: 'Namdev gatha_djvu.txt',
    name: 'Sant Namdev Gatha (old)',
    saintId: NAMDEV_ID,
    saintNameMarathi: 'नामदेव महाराज',
    type: 'abhang',
    attribution: 'Internet Archive — Sant Namdev Gatha (Public Domain)',
    authorSignatures: ['नामा ह्मणे', 'नामा हणे', 'नामा झणे', 'ह्मणे नामा', 'हणे नामा', 'नामा ह्मण'],
  },
  {
    identifier: 'sant-eknath-gatha',
    textFilename: '00 Sant Eknath abhang gatha_djvu.txt',
    name: 'Sant Eknath Abhang Gatha',
    saintId: EKNATH_ID,
    saintNameMarathi: 'एकनाथ महाराज',
    type: 'abhang',
    attribution: 'Internet Archive — Sant Eknath Abhang Gatha (Public Domain)',
    authorSignatures: ['एका ह्मणे', 'एका हणे', 'एकनाथ ह्मणे', 'ह्मणे एका', 'एका जणे', 'एका म्हणे'],
  },
  {
    identifier: 'sant-eknath-gatha',
    textFilename: '01 Sant Eknath Gatha_djvu.txt',
    name: 'Sant Eknath Gatha (vol 1)',
    saintId: EKNATH_ID,
    saintNameMarathi: 'एकनाथ महाराज',
    type: 'abhang',
    attribution: 'Internet Archive — Sant Eknath Gatha (Public Domain)',
    authorSignatures: ['एका ह्मणे', 'एका हणे', 'एकनाथ ह्मणे', 'ह्मणे एका', 'एका जणे', 'एका म्हणे'],
  },
  {
    identifier: 'sant-eknath-gatha',
    textFilename: '02 Sant Eknath Gatha_djvu.txt',
    name: 'Sant Eknath Gatha (vol 2)',
    saintId: EKNATH_ID,
    saintNameMarathi: 'एकनाथ महाराज',
    type: 'abhang',
    attribution: 'Internet Archive — Sant Eknath Gatha (Public Domain)',
    authorSignatures: ['एका ह्मणे', 'एका हणे', 'एकनाथ ह्मणे', 'ह्मणे एका', 'एका जणे', 'एका म्हणे'],
  },
  {
    identifier: 'sant-tukaram-gatha',
    textFilename: 'Complete Sant Tukaram Gatha_djvu.txt',
    name: 'Sant Tukaram Gatha',
    saintId: TUKARAM_ID,
    saintNameMarathi: 'तुकाराम महाराज',
    type: 'abhang',
    attribution: 'Internet Archive — Complete Sant Tukaram Gatha (Public Domain)',
    authorSignatures: ['तुका ह्मणे', 'तुका हणे', 'ह्मणे तुका', 'तुका म्हणे', 'तुका ह्मण'],
    parserType: 'number-prefix',
  },
];

// ─── OCR Text Helpers ────────────────────────────────────────────

/**
 * Regex: match a line that starts with an abhang-number marker (॥ NNNN ॥).
 * Captures the Devanagari digits and the content after the marker.
 */
const ABHANG_MARKER_REGEX = /^[^\u0900-\u097Fa-zA-Z]*॥\s*([०१२३४५६७८९]+)\s*॥\s*(.*)$/;

/**
 * Regex: match a line that starts with a Devanagari number + period (e.g. "१.", "५३६.").
 * Used for texts where abhang boundaries are marked by numbered lines (Tukaram Gatha).
 */
const ABHANG_NUMBER_PREFIX_REGEX = /^[०१२३४५६७८९]+\s*[\.\)]\s*/;

/**
 * Regex: detect explicit abhang section start marker like "॥ तुकारामाचे अभंग ॥"
 * The line must have Devanagari-only content between and after the markers
 * (no ASCII garbage like colons, dots, OCR artifacts).
 */
const ABHANG_SECTION_MARKER_REGEX = /॥\s*[\u0900-\u097F]{2,}[\u0900-\u097F\s,\u0964]*अभंग[\u0900-\u097F\s,\u0964]*॥[\s\u0900-\u097F\u0964]*$/;

/** Devanagari digit to ASCII digit map */
const DEVANAGARI_DIGITS: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

/** Convert a Devanagari numeral string to ASCII digits. */
function devanagariToDigits(s: string): string {
  return [...s].map((c) => DEVANAGARI_DIGITS[c] ?? c).join('');
}

/** Strip page-number lines like "(३४)" or "(48)" or "गाथा - पान १२३" */
function isPageNumberLine(line: string): boolean {
  const trimmed = line.trim();
  // Lines like (३४), (48), (१२३)
  if (/^\([०१२३४५६७८९\d\s]+\)$/.test(trimmed)) return true;
  // Lines like (स्टे ३१), (. ९), (. ६३४)
  if (/^\([.\s]*[०१२३४५६७८९\d]+[\s\S]{0,5}\)$/.test(trimmed)) return true;
  // Lines that are just a Devanagari number and a closing paren
  if (/^[०१२३४५६७८९\d]+\s*[\)}]$/.test(trimmed)) return true;
  // Page header/footer
  if (/पान\s+[०१२३४५६७८९\d]+/i.test(trimmed)) return true;
  return false;
}

/**
 * Clean up OCR artifacts from a single block of abhang text.
 */
function cleanOcrText(text: string): string {
  return text
    // Remove leading/trailing whitespace per line
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false;
      // Filter page number lines
      if (isPageNumberLine(l)) return false;
      // Filter stand-alone abhang number lines (they're separators, not content)
      if (l.match(/^[^\u0900-\u097Fa-zA-Z]*॥\s*[०१२३४५६७८९]+\s*॥[^\u0900-\u097Fa-zA-Z]*$/)) return false;
      // Filter lines that are just dots/ellipsis
      if (/^[.,\-_‌‍\s]{2,}$/.test(l)) return false;
      // Filter standalone page references like "%.. |" OCR artifacts
      if (/^[%\.,\|\s\\\/&]{3,}$/.test(l)) return false;
      return true;
    })
    .join('\n')
    // Remove OCR line-break hyphens (word at line end followed by continuation)
    .replace(/([a-zA-Z\u0900-\u097F])-\s*\n\s*/g, '$1')
    // Remove leading page-number-like patterns from lines
    .replace(/^[०१२३४५६७८९]+\s*[.)]\s*/gm, '')
    // Fix common OCR issues
    .replace(/'/g, '्')       // apostrophe instead of halant
    .replace(/ॉ/g, 'ा')       // misread candra O as aa
    // Collapse multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    // Normalize spacing
    .replace(/\s+/g, ' ')
    .replace(/ \n/g, '\n')
    .replace(/\n /g, '\n')
    .trim();
}

/**
 * Check if a block of text contains an author signature marking the end.
 */
function endsWithSignature(text: string, signatures: string[]): boolean {
  const last200 = text.slice(-200);
  return signatures.some((sig) => last200.includes(sig));
}

// ─── Parser ──────────────────────────────────────────────────────

interface ParsedAbhang {
  number: string;         // Devanagari abhang number (e.g. "१९६९")
  numberDigits: string;   // ASCII digits (e.g. "1969")
  fullText: string;
  content: string;        // Full text with number marker stripped
}

/**
 * Parse the OCR text into individual abhangs.
 *
 * Strategy:
 * 1. Scan for the first 4-digit abhang marker to skip the intro/biography section.
 * 2. From that point, each line starting with a 2+ digit Devanagari number
 *    in the form "॥ NNNN ॥" is an abhang boundary.
 * 3. Single-digit markers ("॥ १॥", etc.) are stanza-internal — skip.
 * 4. Validate each block: must have author signature or be 300+ chars.
 */
function parseAbhangs(rawText: string, target: IaTarget): ParsedAbhang[] {
  const lines = rawText.split('\n');
  const abhangs: ParsedAbhang[] = [];

  // ─── Phase 1: Find the start of actual abhang content ─────
  // Skip the introduction/biography by looking for first 4-digit marker
  let startLine = 0;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].trim().match(ABHANG_MARKER_REGEX);
    if (match) {
      const digits = match[1];
      if (digits.length >= 4) {
        startLine = i;
        break;
      }
    }
  }

  if (startLine === 0) {
    console.log('  ⚠️  No 4-digit abhang marker found — scanning entire text');
  } else {
    console.log(`  First 4-digit marker at line ${startLine}, skipping intro`);
  }

  // ─── Phase 2: Parse abhangs from startLine onward ─────────
  let currentLines: string[] = [];
  let currentNumber: string | null = null;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const markerMatch = trimmed.match(ABHANG_MARKER_REGEX);

    if (markerMatch && markerMatch[1].length >= 2) {
      // This line starts a new abhang (2+ digit marker)
      // Save the previous abhang if it's valid
      if (currentNumber && currentLines.length > 0) {
        saveAbhang();
      }

      currentNumber = markerMatch[1];
      currentLines = [];

      // Capture any content after the marker on the same line
      if (markerMatch[2]) {
        currentLines.push(markerMatch[2]);
      }
      continue;
    }

    // Regular content line — add to current abhang
    if (currentNumber) {
      currentLines.push(line);
    }
  }

  // Last abhang
  if (currentNumber && currentLines.length > 0) {
    saveAbhang();
  }

  return abhangs;

  // ─── Helper ─────────────────────────────────────────────
  function saveAbhang(): void {
    const fullText = currentLines.join('\n').trim();
    const cleaned = cleanOcrText(fullText);
    if (cleaned.length >= 80 && isMarathiText(cleaned)) {
      // Must have author signature OR be substantial enough
      if (endsWithSignature(cleaned, target.authorSignatures) || cleaned.length >= 100) {
        abhangs.push({
          number: currentNumber!,
          numberDigits: devanagariToDigits(currentNumber!),
          fullText: cleaned,
          content: cleaned,
        });
      }
    }
  }
}

/**
 * Parse the OCR text into individual abhangs using Devanagari number-prefix boundaries.
 *
 * Strategy (for Tukaram Gatha and similar):
 * 1. Find the start of abhang content — locate "॥ तुकारामाचे अभंग ॥" or similar marker.
 * 2. From that point, each line starting with Devanagari digits + period ("१.", "५३६.")
 *    is an abhang boundary.
 * 3. Collect lines between consecutive number-prefix lines as one abhang.
 * 4. Validate each block: must have author signature.
 */
function parseAbhangsByNumberPrefix(rawText: string, target: IaTarget): ParsedAbhang[] {
  const lines = rawText.split('\n');
  const abhangs: ParsedAbhang[] = [];

  // ─── Phase 1: Find the start of abhang content ────────────
  let startLine = 0;

  // Look for explicit section marker first (e.g. "॥ तुकारामाचे अभंग ॥")
  for (let i = 0; i < lines.length; i++) {
    if (ABHANG_SECTION_MARKER_REGEX.test(lines[i])) {
      startLine = i + 1;
      console.log(`  Section marker found at line ${i}, starting from line ${startLine}`);
      break;
    }
  }

  // Fallback: find first number-prefix line that has Marathi content
  if (startLine === 0) {
    for (let i = 100; i < Math.min(lines.length, 500); i++) {
      const trimmed = lines[i].trim();
      if (ABHANG_NUMBER_PREFIX_REGEX.test(trimmed) && isMarathiText(trimmed)) {
        startLine = i;
        console.log(`  First number-prefix line at line ${i} — using as abhang start`);
        break;
      }
    }
  }

  if (startLine === 0) {
    console.log('  ⚠️  Could not find start of abhang content — scanning entire text');
  }

  // ─── Phase 2: Parse abhangs from startLine onward ─────────
  let currentLines: string[] = [];
  let currentNumber: string | null = null;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const numberMatch = trimmed.match(/^([०१२३४५६७८९]+)/);

    if (numberMatch && ABHANG_NUMBER_PREFIX_REGEX.test(trimmed)) {
      // This line starts a new abhang
      if (currentNumber && currentLines.length > 0) {
        saveAbhang();
      }

      currentNumber = numberMatch[1];
      currentLines = [trimmed.replace(ABHANG_NUMBER_PREFIX_REGEX, '')];
      continue;
    }

    // Regular content line — add to current abhang
    if (currentNumber) {
      currentLines.push(line);
    }
  }

  // Last abhang
  if (currentNumber && currentLines.length > 0) {
    saveAbhang();
  }

  return abhangs;

  // ─── Helper ─────────────────────────────────────────────
  function saveAbhang(): void {
    const fullText = currentLines.join('\n').trim();
    const cleaned = cleanOcrText(fullText);
    if (cleaned.length >= 80 && isMarathiText(cleaned)) {
      // Tukaram abhangs must have signature since unsigned blocks are likely editorial
      if (endsWithSignature(cleaned, target.authorSignatures) || cleaned.length >= 300) {
        abhangs.push({
          number: currentNumber!,
          numberDigits: devanagariToDigits(currentNumber!),
          fullText: cleaned,
          content: cleaned,
        });
      }
    }
  }
}

// ─── Pipeline Adapter ──────────────────────────────────────────────

/** Convert parsed abhangs into the pipeline's ExtractedComposition format. */
function abhangsToCompositions(abhangs: ParsedAbhang[], target: IaTarget, downloadUrl: string): ExtractedComposition[] {
  return abhangs.map((a) => ({
    titleMarathi: `अभंग क्र. ${a.number}`,
    titleTranslit: `Abhang ${a.numberDigits}`,
    fullText: a.content,
    type: target.type,
    sourceAttribution: target.attribution,
    sourceUrl: downloadUrl,
    language: 'mr',
    confidence: 0.8,
    saintNameMarathi: target.saintNameMarathi,
  }));
}

// ─── Main ────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('--dryrun');
  const sourceFilter = args.find((a) => a.startsWith('--source='))?.split('=')[1];
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const offsetArg = args.find((a) => a.startsWith('--offset='));
  const maxCompositions = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;
  const skipCount = offsetArg ? parseInt(offsetArg.split('=')[1], 10) : 0;

  console.log(`${'═'.repeat(60)}`);
  console.log(`  Vitthalaya — Internet Archive OCR Acquisition`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Dry run: ${dryRun ? 'YES' : 'NO'}`);
  if (maxCompositions < Infinity) console.log(`  Composition limit: ${maxCompositions}`);
  if (skipCount > 0) console.log(`  Skip offset: ${skipCount} abhangs`);
  console.log();

  const targets = sourceFilter
    ? TARGETS.filter((t) => t.identifier.includes(sourceFilter) || t.name.toLowerCase().includes(sourceFilter.toLowerCase()))
    : TARGETS;

  if (targets.length === 0) {
    console.error(`❌ No targets matching source filter: ${sourceFilter}`);
    console.log(`  Available targets: ${TARGETS.map((t) => t.identifier).join(', ')}`);
    process.exit(1);
  }

  let totalNew = 0;
  let totalDuplicates = 0;
  let totalErrors = 0;
  const startTime = Date.now();

  for (const target of targets) {
    console.log(`📡 Processing: ${target.name}`);
    console.log(`   Identifier: ${target.identifier}`);
    console.log(`   File: ${target.textFilename}`);
    console.log();

    try {
      // ─── Step 1: Download OCR text ────────────────────────
      const downloadUrl = `https://archive.org/download/${target.identifier}/${encodeURIComponent(target.textFilename)}`;
      console.log(`   Downloading: ${downloadUrl}`);

      const response = await fetch(downloadUrl, {
        headers: { 'User-Agent': IA_USER_AGENT },
        signal: AbortSignal.timeout(120_000),
      });

      if (!response.ok) {
        console.error(`   ❌ Download failed: HTTP ${response.status}`);
        totalErrors++;
        continue;
      }

      const rawText = await response.text();
      console.log(`   Downloaded: ${(rawText.length / 1024).toFixed(1)} KB`);

      // ─── Step 2: Parse abhangs ────────────────────────────
      const parser = target.parserType === 'number-prefix' ? parseAbhangsByNumberPrefix : parseAbhangs;
      const abhangs = parser(rawText, target);
      console.log(`   Parsed: ${abhangs.length} abhangs from OCR text (parser: ${target.parserType ?? 'marker'})`);

      // Abort if too many — indicates bad parsing
      if (abhangs.length > 5000) {
        console.error(`   ⚠️  Too many abhangs (${abhangs.length}) — likely bad parsing. Skipping.`);
        totalErrors++;
        continue;
      }

      // Apply offset + limit
      const sliced = skipCount > 0 ? abhangs.slice(skipCount) : abhangs;
      const toProcess = maxCompositions < Infinity ? sliced.slice(0, maxCompositions) : sliced;

      if (toProcess.length === 0) {
        console.log(`   ⚠️  No abhangs found to process.`);
        totalErrors++;
        continue;
      }

      // ─── Step 3: Convert to ExtractedComposition[] ──────────
      const compositions = abhangsToCompositions(toProcess, target, downloadUrl);

      // ─── Step 4-10: Pipeline (dedup → score → metadata → persist) ─
      console.log(`   Sending ${compositions.length} to pipeline for processing...`);

      if (dryRun) {
        console.log(`   🏁 DRY RUN — Would process ${compositions.length} compositions through pipeline.`);
        console.log(`   Sample:`);
        for (const a of toProcess.slice(0, 3)) {
          const preview = a.content.slice(0, 120).replace(/\n/g, ' | ');
          console.log(`     #${a.numberDigits}: ${preview}...`);
        }
        console.log();
        totalNew += compositions.length;
        continue;
      }

      // Instantiate pipeline (engine is noop — runForExtractedCompositions skips crawl)
      const pipeline = new AcquisitionPipeline(
        createNoopEngine(),
        new ContentExtractor(),
        new ContentSegmenter(),
        new MetadataExtractor(),
        new QualityScorer(),
        { dryRun: false, maxCompositionsPerSource: 5000, autoApproveThreshold: 0.70, enableEnrichment: true },
      );

      const result = await pipeline.runForExtractedCompositions(compositions, target.name, {
        sourceUrl: downloadUrl,
        sourceTrustScore: 0.75,
        dryRun: false,
      });

      totalNew += result.compositionsExtracted;
      totalDuplicates += result.duplicatesFound;
      totalErrors += result.errors.length;

      console.log(`   ✅ ${target.name}: ${result.compositionsExtracted} inserted, ${result.duplicatesFound} duplicates, ${result.errors.length} errors`);
      console.log();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`   ❌ Fatal error for ${target.name}: ${msg}`);
      totalErrors++;
      console.log();
    }
  }

  // ─── Report ─────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`${'═'.repeat(60)}`);
  console.log(`  ACQUISITION COMPLETE`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Target:    ${targets.map((t) => t.identifier).join(', ')}`);
  console.log(`  New:       ${totalNew} compositions`);
  console.log(`  Duplicate: ${totalDuplicates} skipped`);
  console.log(`  Errors:    ${totalErrors}`);
  console.log(`  Time:      ${elapsed}s`);

  if (!dryRun) {
    const finalCount = await db.composition.count();
    console.log(`  DB count:  ${finalCount} total`);
  }

  console.log();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
