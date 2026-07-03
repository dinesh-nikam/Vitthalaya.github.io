const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

// Environment variable validation helper
const validateEnv = () => {
  const isProd = process.env.NODE_ENV === 'production';
  const missingVars: string[] = [];

  if (!process.env.DATABASE_URL) missingVars.push('DATABASE_URL');
  if (!process.env.NEXTAUTH_SECRET) missingVars.push('NEXTAUTH_SECRET');

  if (missingVars.length > 0) {
    console.warn(`⚠️ [Production Readiness Audit] Warning: Missing environment variables: ${missingVars.join(', ')}`);
    if (isProd && !isBuildPhase) {
      console.warn('❌ Critical environment variables are missing in production runtime!');
    }
  }
};

validateEnv();

const globalForPrisma = global as unknown as { prisma: any };

// Resolve dynamic client base on each call to prevent import caching bugs in tests
function getUnderlyingDb() {
  const hasUrl = typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.length > 0;
  const isSqliteUrl = hasUrl && (process.env.DATABASE_URL!.startsWith('file:') || process.env.DATABASE_URL!.startsWith('sqlite:'));

  if (hasUrl && !isSqliteUrl) {
    try {
      if (!globalForPrisma.prisma) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { PrismaClient } = require('@prisma/client');
        let dbUrl = process.env.DATABASE_URL;

        if (dbUrl && !dbUrl.includes('connection_limit')) {
          const separator = dbUrl.includes('?') ? '&' : '?';
          dbUrl = `${dbUrl}${separator}connection_limit=20&pool_timeout=30`;
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
      return globalForPrisma.prisma;
    } catch (err) {
      console.error('⚠️ Failed to initialize Prisma Client, falling back to SQLite:', err);
    }
  }

  // Fall back to SQLite shim
  try {
    return require('./client-sqlite').db;
  } catch {
    return {};
  }
}

// Maximum retries for transient database errors (connection timeouts, pool exhaustion)
const MAX_QUERY_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 500;

// Patterns that indicate a transient/retryable error (vs a permanent query error)
const TRANSIENT_ERROR_PATTERNS = [
  'fetch a new connection',
  'timed out',
  'pool timeout',
  'Connection refused',
  'connect ECONNREFUSED',
  'connect ETIMEDOUT',
  'connection closed',
  'database server',
  'cannot reach',
  'TimeoutError',
  'queries per second',
];

function isTransientError(err: unknown): boolean {
  const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return TRANSIENT_ERROR_PATTERNS.some((p) => message.includes(p.toLowerCase()));
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a database operation with exponential backoff on transient errors.
 * Only retries when the error matches known transient/connection patterns.
 */
async function withRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_QUERY_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isTransient = isTransientError(err);

      if (attempt < MAX_QUERY_RETRIES && isTransient) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200;
        console.warn(`🔄 DB retry (#${attempt + 1}/${MAX_QUERY_RETRIES}) for ${context} after ${Math.round(delay)}ms — ${(err instanceof Error ? err.message : String(err)).slice(0, 120)}`);
        await sleep(delay);
        continue;
      }

      if (!isTransient) {
        // Permanent error — no point retrying
        break;
      }
    }
  }

  throw lastError;
}

// Helper to define fallback values
function getFallbackValue(method: string): any {
  if (method.startsWith('findMany') || method.startsWith('createMany') || method.startsWith('updateMany')) {
    return [];
  }
  if (method.startsWith('count')) {
    return 0;
  }
  if (method.startsWith('aggregate') || method.startsWith('groupBy')) {
    return {};
  }
  return null;
}

// Resilient database client wrapper using Proxy
const createResilientDb = () => {
  return new Proxy({}, {
    get(target, modelName) {
      const underlyingDb = getUnderlyingDb();

      // Handle the raw SQL method
      if (modelName === '$queryRawUnsafe') {
        if (typeof underlyingDb[modelName] === 'function') {
          return async (...args: any[]) => {
            try {
              return await withRetry(
                () => underlyingDb[modelName].apply(underlyingDb, args),
                '$queryRawUnsafe',
              );
            } catch (err) {
              console.error(`🔴 Database query error on direct $queryRawUnsafe query:`, err);
              if (isBuildPhase) {
                return [];
              }
              throw err;
            }
          };
        }
        return async () => [];
      }

      // Handle properties/methods that exist on client target
      if (modelName in underlyingDb) {
        const originalModel = underlyingDb[modelName];
        if (originalModel && typeof originalModel === 'object') {
          return new Proxy(originalModel, {
            get(modelObj, method) {
              const originalMethod = modelObj[method];
              if (typeof originalMethod === 'function') {
                return async (...args: any[]) => {
                  const context = `${String(modelName)}.${String(method)}`;
                  try {
                    return await withRetry(
                      () => originalMethod.apply(modelObj, args),
                      context,
                    );
                  } catch (err) {
                    console.error(`🔴 Database connection/query error on ${context}:`, err);
                    if (isBuildPhase) {
                      return getFallbackValue(String(method));
                    }
                    throw err;
                  }
                };
              }
              return originalMethod;
            }
          });
        }
        return originalModel;
      }

      // Return a stub proxy for models that are undefined
      return new Proxy({}, {
        get(modelObj, method) {
          return async (...args: any[]) => {
            console.warn(`⚠️ [Production Readiness] Fallback stub model method called: ${String(modelName)}.${String(method)}`);
            if (isBuildPhase) {
              return getFallbackValue(String(method));
            }
            throw new Error(`[Database Client Error] Model '${String(modelName)}' does not exist on active client.`);
          };
        }
      });
    }
  });
};

// Cast to any to allow flexible access patterns for both Prisma and SQLite shims
const db: any = createResilientDb();
export { db };
export default db;
