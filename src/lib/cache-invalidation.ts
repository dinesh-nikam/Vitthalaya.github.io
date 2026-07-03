/**
 * Cache Invalidation Utility for Digital Pandharpur
 *
 * Provides distributed cache invalidation using Upstash Redis when available,
 * falling back to in-memory Map with automatic TTL expiry.
 */

// ─── In-Memory Cache Store ────────────────────────────────────────────────────

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Cleanup expired entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryCache) {
    if (entry.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }
}, 60_000);

// ─── Cache Manager ────────────────────────────────────────────────────────────

function isRedisAvailable(): boolean {
  return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
}

async function redisGet(key: string): Promise<unknown | null> {
  if (!isRedisAvailable()) return null;
  try {
    const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
    });
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : null;
  } catch {
    return null;
  }
}

async function redisSet(key: string, value: unknown, ttlMs: number): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    const ttlSec = Math.ceil(ttlMs / 1000);
    await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}/EX/${ttlSec}`, {
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
    });
  } catch {
    // Silent fallback
  }
}

async function redisDel(key: string): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/del/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
    });
  } catch {
    // Silent fallback
  }
}

async function redisDelPattern(pattern: string): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/keys/${encodeURIComponent(pattern)}`, {
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
    });
    const data = await res.json();
    if (Array.isArray(data.result)) {
      for (const key of data.result) {
        await redisDel(key);
      }
    }
  } catch {
    // Silent fallback
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const cacheManager = {
  async get<T = unknown>(key: string): Promise<T | null> {
    // Try Redis first
    const redisVal = await redisGet(key);
    if (redisVal !== null) return redisVal as T;

    // Fall back to memory
    const entry = memoryCache.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      memoryCache.delete(key);
      return null;
    }
    return entry.value as T;
  },

  async set(key: string, value: unknown, ttlMs: number = DEFAULT_TTL_MS): Promise<void> {
    // Set in both
    await Promise.all([
      redisSet(key, value, ttlMs),
      Promise.resolve(memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs })),
    ]);
  },

  async delete(key: string): Promise<void> {
    await Promise.all([
      redisDel(key),
      Promise.resolve(memoryCache.delete(key)),
    ]);
  },

  async clear(): Promise<void> {
    memoryCache.clear();
    if (isRedisAvailable()) {
      await redisDelPattern('cache:*');
    }
  },
};

// ─── Domain-Specific Invalidation ─────────────────────────────────────────────

/**
 * Invalidate cached data when a composition is updated.
 */
export async function invalidateCompositionCache(compositionId: string): Promise<void> {
  await cacheManager.delete(`composition:${compositionId}`);
  await cacheManager.delete('trending:compositions');
  await cacheManager.clear(); // Clear prefix-matched entries
  console.log(`[Cache] Invalidated composition cache: ${compositionId}`);
}

/**
 * Invalidate search-related caches.
 */
export async function invalidateSearchCache(): Promise<void> {
  await cacheManager.clear();
  console.log('[Cache] Invalidated all search caches');
}

/**
 * Nuclear option — clear all caches.
 */
export async function invalidateAllCaches(): Promise<void> {
  await cacheManager.clear();
  console.log('[Cache] All caches invalidated');
}
