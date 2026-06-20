/**
 * Database client - prefers Prisma (PostgreSQL) when DATABASE_URL is set.
 * Falls back to the SQLite compatibility shim (client-sqlite.ts).
 *
 * Implements a global singleton pattern for PostgreSQL PrismaClient
 * to prevent connection leakage during serverless deployments/dev hot reloads,
 * and dynamically configures connection pool parameters.
 */

const hasUrl = typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.length > 0;

let _db: any = null;

// Global object to persist client across hot reloads in Next.js development
const globalForPrisma = global as unknown as { prisma: any };

// Try Prisma first
if (hasUrl) {
  try {
    if (!globalForPrisma.prisma) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PrismaClient } = require('@prisma/client');
      
      let dbUrl = process.env.DATABASE_URL;
      
      // Dynamically configure connection pooling options to prevent pool exhaustion
      if (dbUrl && !dbUrl.includes('connection_limit')) {
        const separator = dbUrl.includes('?') ? '&' : '?';
        dbUrl = `${dbUrl}${separator}connection_limit=20&pool_timeout=15`;
      }

      globalForPrisma.prisma = new PrismaClient({
        datasources: {
          db: {
            url: dbUrl,
          },
        },
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      });
    }
    _db = globalForPrisma.prisma;
    console.log('✓ Enterprise Prisma PostgreSQL client initialized (Singleton with pooling)');
  } catch (err) {
    console.error('⚠️ Failed to initialize Prisma Client, falling back to SQLite:', err);
    // fall through to SQLite
  }
}

// Fall back to SQLite
if (!_db) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    _db = require('./client-sqlite').db;
    console.log('✓ Development SQLite client initialized');
  } catch {
    // Worst case — empty stub
    _db = {};
  }
}

// Cast to any to allow flexible access patterns for both Prisma and SQLite shims
const db: any = _db;
export { db };
export default db;
