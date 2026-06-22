// Environment variable validation helper
const validateEnv = () => {
  const isProd = process.env.NODE_ENV === 'production';
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
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
const createResilientDb = (client: any) => {
  return new Proxy(client || {}, {
    get(target, modelName) {
      // Handle the raw SQL method
      if (modelName === '$queryRawUnsafe') {
        if (typeof target[modelName] === 'function') {
          return async (...args: any[]) => {
            try {
              return await target[modelName].apply(target, args);
            } catch (err) {
              console.error(`🔴 Database query error on direct $queryRawUnsafe query:`, err);
              return [];
            }
          };
        }
        return async () => [];
      }

      // Handle properties/methods that exist on client target
      if (modelName in target) {
        const originalModel = target[modelName];
        if (originalModel && typeof originalModel === 'object') {
          return new Proxy(originalModel, {
            get(modelObj, method) {
              const originalMethod = modelObj[method];
              if (typeof originalMethod === 'function') {
                return async (...args: any[]) => {
                  try {
                    return await originalMethod.apply(modelObj, args);
                  } catch (err) {
                    console.error(`🔴 Database connection/query error on ${String(modelName)}.${String(method)}:`, err);
                    return getFallbackValue(String(method));
                  }
                };
              }
              return originalMethod;
            }
          });
        }
        return originalModel;
      }

      // Return a stub proxy for models that are undefined (e.g. during build fallback failure)
      return new Proxy({}, {
        get(modelObj, method) {
          return async (...args: any[]) => {
            console.warn(`⚠️ [Production Readiness] Fallback stub model method called: ${String(modelName)}.${String(method)}`);
            return getFallbackValue(String(method));
          };
        }
      });
    }
  });
};

// Cast to any to allow flexible access patterns for both Prisma and SQLite shims
const db: any = createResilientDb(_db);
export { db };
export default db;
