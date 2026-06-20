/**
 * SQLite database client for Next.js app.
 * Uses bun:sqlite directly - no Prisma needed.
 * Initializes from src/db/init.sql schema with seed data.
 * Uses dynamic import to avoid Next.js build-time resolution of bun:sqlite.
 */

// Dynamic import to avoid Next.js build-time resolution
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires
type Database = any;

const DB_PATH = process.cwd() + '/prisma/varkari.db';

function initDatabase(): Database {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { existsSync, mkdirSync, readFileSync } = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { dirname } = require('path');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Database = require('bun:sqlite').Database;

  const dbDir = dirname(DB_PATH);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(DB_PATH, { create: true });
  db.exec('PRAGMA journal_mode=WAL');
  db.exec('PRAGMA foreign_keys=ON');

  // Run schema if tables don't exist
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const hasTable = db
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name='compositions'")
    .get();

  if (!hasTable) {
    const schemaPath = 'src/db/init.sql';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const schema = readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
  }

  return db;
}

const sqliteDb = initDatabase();

// ============================================================
// Database client - simplified for Next.js pages
// ============================================================
interface Composition {
  id: string;
  titleMarathi: string;
  titleTranslit: string;
  slug: string;
  type: string;
  fullText: string;
  meaning: string | null;
  saintId: string | null;
  deityId: string | null;
  region: string | null;
  source: string | null;
  audioLinks: string[];
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  saint?: { nameMarathi: string; nameTranslit: string; slug: string } | null;
  deity?: { nameMarathi: string } | null;
}

interface Saint {
  id: string;
  nameMarathi: string;
  nameTranslit: string;
  slug: string;
  updatedAt?: Date;
}

interface Deity {
  id: string;
  nameMarathi: string;
  nameTranslit: string;
}

interface FestivalComposition {
  composition: {
    id: string;
    titleMarathi: string;
    titleTranslit: string;
    slug: string;
    type: string;
    audioLinks: string[];
  };
}

interface Festival {
  id: string;
  nameMarathi: string;
  nameTranslit: string;
  compositions?: FestivalComposition[];
}

interface AiEnrichmentResult {
  summary: string | null;
  meaning: string | null;
  keywords: string[];
  confidenceSummary: string | null;
  reviewed: boolean;
}

export const client = {
  composition: {
    async findUnique(params: {
      where: { slug: string };
      include?: {
        saint?: { select: Record<string, boolean> };
        deity?: { select: Record<string, boolean> };
      };
      select?: Record<string, boolean>;
    }): Promise<Composition | null> {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const row = sqliteDb
        .query(
          `SELECT c.*, s.name_marathi as saint_name_marathi, s.name_transliteration as saint_name_transliteration,
                  s.slug as saint_slug, d.name_marathi as deity_name_marathi
           FROM compositions c
           LEFT JOIN saints s ON c.saint_id = s.id
           LEFT JOIN deities d ON c.deity_id = d.id
           WHERE c.slug = ?`,
        )
        .get(params.where.slug) as Record<string, unknown> | undefined;

      if (!row) return null;

      const result: Composition = {
        id: row.id as string,
        titleMarathi: row.title_marathi as string,
        titleTranslit: row.title_transliteration as string,
        slug: row.slug as string,
        type: row.type as string,
        fullText: row.full_text as string,
        meaning: row.meaning as string | null,
        saintId: row.saint_id as string | null,
        deityId: row.deity_id as string | null,
        region: row.region as string | null,
        source: row.source_attribution as string | null,
        audioLinks: row.audio_links ? JSON.parse(row.audio_links as string) : [],
        isVerified: Boolean(row.is_verified),
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
        saint: null,
        deity: null,
      };

      if (params.include?.saint && row.saint_id) {
        result.saint = {
          nameMarathi: row.saint_name_marathi as string,
          nameTranslit: row.saint_name_transliteration as string,
          slug: row.saint_slug as string,
        };
      }

      if (params.include?.deity && row.deity_id) {
        result.deity = {
          nameMarathi: row.deity_name_marathi as string,
        };
      }

      // Handle select
      if (params.select && !params.include) {
        const selected: Partial<Composition> & Record<string, unknown> = {};
        for (const key of Object.keys(params.select)) {
          if (key in result) {
            selected[key] = result[key as keyof Composition];
          }
        }
        return selected as Composition;
      }

      return result;
    },

    async findMany(params?: {
      skip?: number;
      take?: number;
      orderBy?: { id?: 'asc' | 'desc' };
      where?: { saintId?: string; slug?: { not: string } };
      select?: Record<string, boolean>;
    }): Promise<Composition[]> {
      let query = 'SELECT * FROM compositions';

      if (params?.orderBy?.id) {
        query += ` ORDER BY id ${params.orderBy.id.toUpperCase()}`;
      } else {
        query += ' ORDER BY created_at DESC';
      }

      if (params?.take !== undefined) {
        query += ` LIMIT ${params.take}`;
        if (params.skip !== undefined) {
          query += ` OFFSET ${params.skip}`;
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const rows = sqliteDb.query(query).all() as Record<string, unknown>[];
      return rows.map((r) => ({
        id: r.id as string,
        titleMarathi: r.title_marathi as string,
        titleTranslit: r.title_transliteration as string,
        slug: r.slug as string,
        type: r.type as string,
        fullText: r.full_text as string,
        meaning: r.meaning as string | null,
        saintId: r.saint_id as string | null,
        deityId: r.deity_id as string | null,
        region: r.region as string | null,
        source: r.source_attribution as string | null,
        audioLinks: r.audio_links ? JSON.parse(r.audio_links as string) : [],
        isVerified: Boolean(r.is_verified),
        createdAt: new Date(r.created_at as string),
        updatedAt: new Date(r.updated_at as string),
        saint: null,
        deity: null,
      }));
    },

    async count(): Promise<number> {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = sqliteDb
        .query('SELECT COUNT(*) as cnt FROM compositions')
        .get() as { cnt: number };
      return result.cnt;
    },
  },

  saint: {
    async findUnique(params: { where: { slug: string } }): Promise<Saint | null> {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const row = sqliteDb
        .query('SELECT * FROM saints WHERE slug = ?')
        .get(params.where.slug) as Record<string, unknown> | undefined;

      if (!row) return null;
      return {
        id: row.id as string,
        nameMarathi: row.name_marathi as string,
        nameTranslit: row.name_transliteration as string,
        slug: row.slug as string,
        updatedAt: new Date(row.updated_at as string),
      };
    },

    async findMany(params?: {
      orderBy?: { slug?: 'asc' | 'desc' };
      select?: Record<string, boolean>;
    }): Promise<Saint[]> {
      let query = 'SELECT * FROM saints';

      if (params?.orderBy?.slug) {
        query += ` ORDER BY slug ${params.orderBy.slug.toUpperCase()}`;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const rows = sqliteDb.query(query).all() as Record<string, unknown>[];
      return rows.map((r) => {
        const s: Saint = {
          id: r.id as string,
          nameMarathi: r.name_marathi as string,
          nameTranslit: r.name_transliteration as string,
          slug: r.slug as string,
          updatedAt: new Date(r.updated_at as string),
        };
        if (params?.select && !params.select.slug) {
          s.slug = '';
        }
        return s;
      });
    },

    async count(): Promise<number> {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = sqliteDb.query('SELECT COUNT(*) as cnt FROM saints').get() as { cnt: number };
      return result.cnt;
    },
  },

  deity: {
    async findUnique(params: { where: { nameTranslit: string } }): Promise<Deity | null> {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const row = sqliteDb
        .query('SELECT * FROM deities WHERE name_transliteration = ?')
        .get(params.where.nameTranslit) as Record<string, unknown> | undefined;

      if (!row) return null;
      return {
        id: row.id as string,
        nameMarathi: row.name_marathi as string,
        nameTranslit: row.name_transliteration as string,
      };
    },

    async count(): Promise<number> {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = sqliteDb.query('SELECT COUNT(*) as cnt FROM deities').get() as { cnt: number };
      return result.cnt;
    },
  },

  festival: {
    async findUnique(params: {
      where: { slug?: string; nameTranslit?: string };
      include?: { compositions?: { include?: { composition: { select: { id: boolean; titleMarathi: boolean; titleTranslit: boolean; slug: boolean; type: boolean; audioLinks: boolean } } } } };
    }): Promise<Festival | null> {
      let row: Record<string, unknown> | undefined;

      if (params.where.slug) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        row = sqliteDb
          .query('SELECT * FROM festivals WHERE slug = ?')
          .get(params.where.slug) as Record<string, unknown> | undefined;
      } else if (params.where.nameTranslit) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        row = sqliteDb
          .query('SELECT * FROM festivals WHERE name_transliteration = ?')
          .get(params.where.nameTranslit) as Record<string, unknown> | undefined;
      }

      if (!row) return null;

      const result: Festival = {
        id: row.id as string,
        nameMarathi: row.name_marathi as string,
        nameTranslit: row.name_transliteration as string,
        compositions: [],
      };

      if (params.include?.compositions && row.id) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const compRows = sqliteDb
          .query(
            `SELECT c.id, c.title_marathi, c.title_transliteration, c.slug, c.type, c.audio_links
             FROM compositions c
             JOIN composition_festivals cf ON c.id = cf.composition_id
             WHERE cf.festival_id = ?
             LIMIT 20`,
          )
          .all(row.id as string) as Record<string, unknown>[];
        result.compositions = compRows.map((r) => ({
          composition: {
            id: r.id as string,
            titleMarathi: r.title_marathi as string,
            titleTranslit: r.title_transliteration as string,
            slug: r.slug as string,
            type: r.type as string,
            audioLinks: r.audio_links ? JSON.parse(r.audio_links as string) : [],
          },
        }));
      }

      return result;
    },

    async findMany(params?: {
      orderBy?: { nameTranslit?: 'asc' | 'desc' };
    }): Promise<Festival[]> {
      let query = 'SELECT * FROM festivals';

      if (params?.orderBy?.nameTranslit) {
        query += ` ORDER BY name_transliteration ${params.orderBy.nameTranslit.toUpperCase()}`;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const rows = sqliteDb.query(query).all() as Record<string, unknown>[];
      return rows.map((r) => ({
        id: r.id as string,
        nameMarathi: r.name_marathi as string,
        nameTranslit: r.name_transliteration as string,
        compositions: [],
      }));
    },

    async count(): Promise<number> {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = sqliteDb.query('SELECT COUNT(*) as cnt FROM festivals').get() as { cnt: number };
      return result.cnt;
    },
  },

  category: {
    async findMany(params?: {
      orderBy?: { slug?: 'asc' | 'desc' };
    }): Promise<Array<{ slug: string; nameMarathi: string }>> {
      let query = 'SELECT * FROM categories';

      if (params?.orderBy?.slug) {
        query += ` ORDER BY slug ${params.orderBy.slug.toUpperCase()}`;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const rows = sqliteDb.query(query).all() as Record<string, unknown>[];
      return rows.map((r) => ({
        slug: r.slug as string,
        nameMarathi: r.name_marathi as string,
      }));
    },
  },

  aiEnrichmentResult: {
    async findFirst(params: {
      where: { compositionId: string };
      select?: Record<string, boolean>;
    }): Promise<AiEnrichmentResult | null> {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const row = sqliteDb
        .query(
          'SELECT summary, meaning, keywords, confidence_summary, reviewed, review_approved FROM ai_enrichment_results WHERE composition_id = ? LIMIT 1',
        )
        .get(params.where.compositionId) as
        | { summary: string | null; meaning: string | null; keywords: string | null; confidence_summary: string | null; reviewed: number; review_approved: number }
        | undefined;

      if (!row) return null;
      return {
        summary: row.summary,
        meaning: row.meaning,
        keywords: row.keywords ? JSON.parse(row.keywords as string) : [],
        confidenceSummary: row.confidence_summary,
        reviewed: Boolean(row.reviewed),
      };
    },
  },

  aiEnrichmentJob: {
    async findMany(params?: {
      where?: {
        status?: { in: string[] };
      };
      orderBy?: { updatedAt?: 'desc' };
      take?: number;
      include?: {
        composition?: { select: Record<string, boolean> };
        result?: { select: Record<string, boolean> };
      };
    }): Promise<Record<string, unknown>[]> {
      let query = 'SELECT * FROM ai_enrichment_jobs';

      if (params?.where?.status?.in && params.where.status.in.length > 0) {
        const statusValues = params.where.status.in;
        const statusPlaceholders = statusValues.map(() => '?').join(',');
        query += ` WHERE status IN (${statusPlaceholders})`;
      }

      query += ' ORDER BY created_at DESC';

      if (params?.take !== undefined) {
        query += ` LIMIT ${params.take}`;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const rows = sqliteDb.query(query).all() as Record<string, unknown>[];

      // For each job, get composition and result
      const jobs = await Promise.all(
        rows.map(async (job) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          const composition = sqliteDb
            .query('SELECT title_marathi, type FROM compositions WHERE id = ?')
            .get(job.composition_id as string) as
            | { title_marathi: string; type: string }
            | undefined;

          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          const result = sqliteDb
            .query(
              'SELECT id, confidence_summary, reviewed, review_approved FROM ai_enrichment_results WHERE composition_id = ?',
            )
            .get(job.composition_id as string) as
            | { id: string; confidence_summary: string; reviewed: number; review_approved: number }
            | undefined;

          return {
            id: job.id,
            compositionId: job.composition_id,
            status: job.status,
            composition: composition
              ? {
                  id: job.composition_id,
                  titleMarathi: composition.title_marathi,
                  type: composition.type,
                }
              : null,
            result: result
              ? {
                  id: result.id,
                  confidenceSummary: result.confidence_summary || null,
                  reviewed: Boolean(result.reviewed),
                  reviewApproved: result.review_approved ? Boolean(result.review_approved) : null,
                }
              : null,
            updatedAt: job.updated_at,
          };
        }),
      );

      return jobs;
    },

    async groupBy(_params: {
      by: string[];
      _count: { id: boolean };
      where?: Record<string, unknown>;
    }): Promise<Record<string, unknown>[]> {
      return [];
    },
  },

  // Placeholder models for API routes (stubs - minimal implementation)
  canonicalRecord: {
    async findUnique(): Promise<unknown | null> {
      return null;
    },
  },

  user: {
    async findUnique(): Promise<unknown | null> {
      return null;
    },
    async findMany(): Promise<unknown[]> {
      return [];
    },
  },

  temple: {
    async count(): Promise<number> {
      return 0;
    },
  },

  region: {
    async count(): Promise<number> {
      return 0;
    },
  },

  audio: {
    async count(): Promise<number> {
      return 0;
    },
  },

  book: {
    async count(): Promise<number> {
      return 0;
    },
  },

  // Raw SQL query support for relationship engine
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $queryRawUnsafe: sqliteDb.query.bind(sqliteDb),
};

export const db = client;