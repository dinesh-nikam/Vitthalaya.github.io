/**
 * SQLite database layer for Digital Pandharpur.
 * Uses bun:sqlite (built-in, no dependency needed).
 */

import { Database } from 'bun:sqlite';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { ScrapedComposition, DBStats } from '../scraper/types';
import { contentHash } from '../canonical/normalization';

// Local normalizeTitle for slugs
function normalizeTitle(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[०१२३४५६७८९\. \s\-।,]+/, '')
    .replace(/[०१२३४५६७८९\. \s\-।,]+$/, '')
    .trim();
}

// ============================================================
// Schema & Initialization
// ============================================================

const DEFAULT_DB_PATH = 'data/varkari.db';

/**
 * Initialize or open the SQLite database.
 * Creates tables from init.sql if they don't exist.
 */
export function initDatabase(dbPath?: string): Database {
  const path = dbPath || DEFAULT_DB_PATH;

  // Ensure directory exists
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new Database(path);

  // Enable WAL mode for better concurrent access
  db.exec('PRAGMA journal_mode=WAL');
  db.exec('PRAGMA foreign_keys=ON');

  // Run schema initialization
  const schemaPath = 'src/db/init.sql';
  if (existsSync(schemaPath)) {
    const schema = readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
  } else {
    console.warn(`Schema file not found: ${schemaPath}. Database may be empty.`);
  }

  return db;
}

// ============================================================
// Saint Operations
// ============================================================

/**
 * Insert a saint if not exists, return saint ID.
 */
export function upsertSaint(
  db: Database,
  nameMarathi: string,
  nameTransliteration: string
): string {
  const existing = db
    .query('SELECT id FROM saints WHERE name_transliteration = ?')
    .get(nameTransliteration) as { id: string } | undefined;

  if (existing) return existing.id;

  const result = db
    .query(
      `INSERT INTO saints (name_marathi, name_transliteration)
       VALUES (?, ?)
       RETURNING id`
    )
    .get(nameMarathi, nameTransliteration) as { id: string };

  return result.id;
}

/**
 * Get saint ID by transliteration name.
 */
export function getSaintId(
  db: Database,
  nameTransliteration: string
): string | null {
  const result = db
    .query('SELECT id FROM saints WHERE name_transliteration = ?')
    .get(nameTransliteration) as { id: string } | undefined;

  return result?.id || null;
}

// ============================================================
// Deity Operations
// ============================================================

/**
 * Get deity ID by transliteration name.
 */
export function getDeityId(
  db: Database,
  nameTransliteration: string
): string | null {
  const result = db
    .query('SELECT id FROM deities WHERE name_transliteration = ?')
    .get(nameTransliteration) as { id: string } | undefined;

  return result?.id || null;
}

// ============================================================
// Composition Operations
// ============================================================

function generateSlug(text: string, uniqueSuffix?: string): string {
  let slug = text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);

  if (!slug) slug = 'composition';

  if (uniqueSuffix) {
    slug = `${slug}-${uniqueSuffix}`;
  }

  return slug;
}

const INSERT_COMPOSITION = `
  INSERT INTO compositions (
    slug, title_marathi, title_transliteration, type, full_text,
    meaning, saint_id, deity_id, region,
    source_attribution, source_url, is_verified
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  RETURNING id
`;

/**
 * Insert a scraped composition into the database.
 * Returns the UUID of the inserted row.
 */
export function insertComposition(
  db: Database,
  comp: ScrapedComposition
): string {
  // Look up saint and deity IDs by transliteration name
  let saintId: string | null = null;
  let deityId: string | null = null;

  if (comp.saint_name_transliteration) {
    saintId = upsertSaint(db, comp.saint_name_marathi || '', comp.saint_name_transliteration);
  }

  if (comp.deity_name_transliteration) {
    deityId = getDeityId(db, comp.deity_name_transliteration);
  }

  const slug = generateSlug(
    comp.title_transliteration || comp.title_marathi,
    contentHash(comp.full_text).substring(0, 8)
  );

  const result = db
    .query(INSERT_COMPOSITION)
    .get(
      slug,
      comp.title_marathi,
      comp.title_transliteration || comp.title_marathi.substring(0, 60),
      comp.type,
      comp.full_text,
      comp.meaning || null,
      saintId,
      deityId,
      comp.region || null,
      comp.source_attribution,
      comp.source_url || null,
      1 // is_verified = true for scraped content (will be reviewed)
    ) as { id: string };

  return result.id;
}

/**
 * Check if a composition with the same content hash already exists.
 */
export function compositionExists(
  db: Database,
  fullText: string
): boolean {
  const hash = contentHash(fullText);
  const result = db
    .query(
      `SELECT COUNT(*) as cnt FROM compositions
       WHERE full_text = ?`
    )
    .get(fullText) as { cnt: number };

  // Also check by title hash
  return result.cnt > 0;
}

/**
 * Batch insert compositions in a transaction.
 * Returns count of inserted items (skips duplicates).
 */
export function batchInsertCompositions(
  db: Database,
  compositions: ScrapedComposition[]
): { inserted: number; skipped: number } {
  let inserted = 0;
  let skipped = 0;

  const insertTx = db.transaction((items: ScrapedComposition[]) => {
    for (const comp of items) {
      if (compositionExists(db, comp.full_text)) {
        skipped++;
        continue;
      }
      insertComposition(db, comp);
      inserted++;
    }
  });

  insertTx(compositions);
  return { inserted, skipped };
}

// ============================================================
// Statistics
// ============================================================

/**
 * Get database statistics.
 */
export function getStats(db: Database): DBStats {
  const totalComp = db
    .query('SELECT COUNT(*) as cnt FROM compositions')
    .get() as { cnt: number };

  const byTypeRows = db
    .query(
      'SELECT type, COUNT(*) as cnt FROM compositions GROUP BY type ORDER BY cnt DESC'
    )
    .all() as { type: string; cnt: number }[];

  const byType: Record<string, number> = {};
  for (const row of byTypeRows) {
    byType[row.type] = row.cnt;
  }

  const totalSaints = db
    .query('SELECT COUNT(*) as cnt FROM saints')
    .get() as { cnt: number };

  const totalCategories = db
    .query('SELECT COUNT(*) as cnt FROM categories')
    .get() as { cnt: number };

  return {
    total_compositions: totalComp.cnt,
    by_type: byType,
    total_saints: totalSaints.cnt,
    total_categories: totalCategories.cnt,
  };
}

/**
 * Get all existing content hashes for dedup pre-population.
 */
export function getAllContentHashes(db: Database): string[] {
  const rows = db
    .query('SELECT full_text FROM compositions')
    .all() as { full_text: string }[];

  return rows.map((r) => contentHash(r.full_text));
}
