/**
 * Vitthalaya — Bulk Composition Importer
 *
 * Imports a JSON array of compositions from a file:
 *
 *   [
 *     { "titleMarathi": "...", "titleTranslit": "...", "type": "abhang",
 *       "fullText": "lyrics…", "saintName": "तुकाराम महाराज",
 *       "source": "Marathi Wikisource — Tukaram Gatha" }
 *   ]
 *
 * Dedup is by content hash (identical lyrics are never inserted twice),
 * saints resolve by name (Marathi first, then transliteration), lyrics are
 * cleaned on import (YouTube/import metadata removed), and every imported row
 * is reviewed=true (source-verified) or sent with --draft to the review
 * queue. Idempotent: re-running the same file is a no-op for duplicates.
 *
 * Usage:
 *   bun run scripts/import-compositions.ts path/to/compositions.json
 *   bun run scripts/import-compositions.ts path/to/compositions.json --draft
 */

import { readFileSync } from 'node:fs';
import { db } from '../src/db/client';
import { contentHash, normalizeForComparison } from '../src/canonical/normalization';
import { cleanLyrics } from '../src/lib/lyrics-clean';

const filePath = process.argv.find((a) => !a.startsWith('--')) ?? '';
const DRAFT = process.argv.includes('--draft');

interface ImportRow {
  titleMarathi?: string;
  titleTranslit?: string;
  type?: string;
  fullText?: string;
  lyrics?: string;
  saintName?: string | null;
  source?: string | null;
  reviewed?: boolean;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9\u0900-\u097F]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || `composition-${Date.now()}`
  );
}

async function main() {
  if (!filePath) {
    console.error('Usage: bun run scripts/import-compositions.ts <file.json> [--draft]');
    process.exit(1);
  }

  let rows: ImportRow[];
  try {
    rows = JSON.parse(readFileSync(filePath, 'utf8')) as ImportRow[];
  } catch (err) {
    console.error('Could not read/parse file:', err);
    process.exit(1);
  }

  if (!Array.isArray(rows)) {
    console.error('File must contain a JSON array of compositions.');
    process.exit(1);
  }

  // Cache saints by name so we do not re-query per row.
  const saints = await db.saint.findMany({
    select: { id: true, nameMarathi: true, nameTranslit: true },
  });
  const saintByMarathi = new Map(saints.map((s) => [s.nameMarathi, s.id]));
  const saintByTranslit = new Map(
    saints.map((s) => [s.nameTranslit?.toLowerCase(), s.id])
  );

  let imported = 0;
  let duplicates = 0;
  let failed = 0;
  let removedLinesTotal = 0;

  for (const [index, row] of rows.entries()) {
    const label = row.titleMarathi || row.titleTranslit || `row ${index + 1}`;
    if (!row.titleMarathi?.trim() || !row.type?.trim() || !(row.fullText || row.lyrics)?.trim()) {
      console.error(`✗ ${label} — missing titleMarathi/type/fullText; skipped`);
      failed++;
      continue;
    }

    const raw = (row.fullText || row.lyrics || '').trim();
    const hash = contentHash(normalizeForComparison(raw));

    const existing = await db.composition.findFirst({
      where: { contentHash: hash },
      select: { id: true },
    });
    if (existing) {
      duplicates++;
      continue;
    }

    const cleaned = cleanLyrics(raw);
    const lyricText = cleaned.cleaned.length > 0 ? cleaned.cleaned : raw;

    let saintId: string | null = null;
    if (row.saintName) {
      saintId =
        saintByMarathi.get(row.saintName) ??
        saintByTranslit.get(row.saintName.toLowerCase()) ??
        null;
      if (!saintId) {
        console.warn(`  ~ ${label} — saint "${row.saintName}" not found; left unattributed`);
      }
    }

    try {
      await db.composition.create({
        data: {
          titleMarathi: row.titleMarathi.trim(),
          titleTranslit: row.titleTranslit?.trim() || '',
          type: row.type.trim().toLowerCase(),
          fullText: lyricText,
          saintId,
          source: row.source?.trim() || 'Bulk import',
          reviewed: DRAFT ? false : (row.reviewed ?? true),
          slug: `${slugify(row.titleTranslit || row.titleMarathi)}-${Date.now().toString(36)}-${index.toString(36)}`,
          contentHash: hash,
        },
      });
      imported++;
      removedLinesTotal += cleaned.removedLines.length;
    } catch (err) {
      console.error(`✗ ${label} — ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  console.log('\n=== IMPORT SUMMARY ===');
  console.log(`Rows: ${rows.length}`);
  console.log(`Imported: ${imported}${DRAFT ? ' (as drafts — review required)' : ' (reviewed=true)'}`);
  console.log(`Duplicates skipped: ${duplicates}`);
  console.log(`Failed: ${failed}`);
  console.log(`Metadata lines removed on import: ${removedLinesTotal}`);

  await db.$disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  });
