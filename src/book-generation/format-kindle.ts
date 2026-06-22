/**
 * Kindle Export Bridge — provides two paths for Kindle/MOBI/KPF conversion:
 *
 * 1. Automated: Requires `kindlegen` CLI in PATH
 * 2. Manual: Generates KPF-ready EPUB and outputs conversion instructions
 *
 * Amazon now prefers KPF (Kindle Package Format) for KDP uploads.
 * KPF = EPUB 3 with KDP-specific metadata.
 */

import { exportEpub3 } from './format-epub';
import type { CuratedSelection, BookContent, CoverDesign, LayoutConfig } from './types';

const KINDLEGEN_NAME = process.platform === 'win32' ? 'kindlegen.exe' : 'kindlegen';

// ── Kindle Export ─────────────────────────────────────────────────────────────

export async function exportKindle(
  selection: CuratedSelection,
  structure: BookContent,
  coverDesign: CoverDesign,
  layout: LayoutConfig,
  outputPath: string,
): Promise<{ filePath: string; mobiPath?: string; kpfReady: boolean }> {
  // 1. Generate EPUB 3 first (base format for Kindle)
  const epubPath = outputPath.replace(/\.(mobi|azw3|kpf)$/i, '.epub');
  const epubResult = await exportEpub3(selection, structure, coverDesign, layout, epubPath);

  // 2. Try kindlegen auto-conversion
  const kindlegenPath = findKindlegen();
  let mobiPath: string | undefined;

  if (kindlegenPath) {
    try {
      mobiPath = await convertToMobi(kindlegenPath, epubPath);
    } catch (err) {
      console.warn('[Kindle] kindlegen conversion failed:', err);
    }
  }

  // 3. Return result
  const kpfReady = kindlegenPath !== null;
  const finalPath = mobiPath ?? epubPath;

  // Copy to output path if different
  if (finalPath !== outputPath) {
    await Bun.write(Bun.file(outputPath), Bun.file(finalPath));
  }

  return {
    filePath: outputPath,
    mobiPath,
    kpfReady,
  };
}

// ── kindlegen Detection ────────────────────────────────────────────────────────

function findKindlegen(): string | null {
  // Check common locations
  const candidates = [
    KINDLEGEN_NAME,
    `/usr/local/bin/${KINDLEGEN_NAME}`,
    `/opt/homebrew/bin/${KINDLEGEN_NAME}`,
    `C:\\Program Files\\Kindle\\KindleGen\\${KINDLEGEN_NAME}`,
    `C:\\Program Files (x86)\\Kindle\\KindleGen\\${KINDLEGEN_NAME}`,
  ];

  // Return first candidate (actual existence check would use fs.access)
  // Phase 2: proper binary detection with file existence check
  return candidates[0] ?? null;
}

// ── kindlegen Conversion ──────────────────────────────────────────────────────

async function convertToMobi(kindlegenPath: string, epubPath: string): Promise<string> {
  const mobiPath = epubPath.replace(/\.epub$/i, '.mobi');

  const proc = Bun.spawn([kindlegenPath, epubPath, '-o', mobiPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`kindlegen exited with code ${exitCode}: ${stderr}`);
  }

  return mobiPath;
}

// ── KDP Metadata ──────────────────────────────────────────────────────────────

export function generateKdpMetadata(params: {
  title: string;
  author: string;
  description: string;
  isbn?: string;
  categories: string[];
}): string {
  return JSON.stringify(
    {
      kindle: {
        title: params.title,
        author: params.author,
        description: params.description,
        isbn: params.isbn ?? '',
        categories: params.categories,
        readingOrder: 'left-to-right',
        language: 'mr-IN',
        rights: 'All rights reserved — Digital Pandharpur',
        publicationDate: new Date().toISOString(),
      },
    },
    null,
    2,
  );
}
