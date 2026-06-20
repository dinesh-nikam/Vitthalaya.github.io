import { Redis } from '@upstash/redis';

const hasConfig = 
  typeof process.env.UPSTASH_REDIS_REST_URL === 'string' && 
  process.env.UPSTASH_REDIS_REST_URL.length > 0 &&
  typeof process.env.UPSTASH_REDIS_REST_TOKEN === 'string' &&
  process.env.UPSTASH_REDIS_REST_TOKEN.length > 0;

let redis: any;

if (hasConfig) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  console.log('✓ Upstash Redis client initialized successfully.');
} else {
  // Resilient memory fallback for development
  const localCache = new Map<string, any>();
  const timeouts = new Map<string, any>();

  redis = {
    async get(key: string) {
      const val = localCache.get(key);
      if (val === undefined) return null;
      // Upstash Redis returns parsed JSON objects for json-like strings
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    },
    async set(key: string, value: any, options?: { ex?: number; px?: number }) {
      const stringifiedValue = typeof value === 'string' ? value : JSON.stringify(value);
      localCache.set(key, stringifiedValue);
      
      // Handle expiration
      if (options?.ex) {
        if (timeouts.has(key)) {
          clearTimeout(timeouts.get(key));
        }
        const timer = setTimeout(() => {
          localCache.delete(key);
          timeouts.delete(key);
        }, options.ex * 1000);
        timeouts.set(key, timer);
      }
      return 'OK';
    },
    async del(key: string) {
      localCache.delete(key);
      if (timeouts.has(key)) {
        clearTimeout(timeouts.get(key));
        timeouts.delete(key);
      }
      return 1;
    },
    isMock: true,
  };
  console.warn('⚠️ Upstash Redis keys missing. Fallback to resilient in-memory cache client.');
}

export { redis };
export default redis;
