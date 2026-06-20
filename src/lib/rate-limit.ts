import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

let ratelimiter: any;

if (!redis.isMock) {
  ratelimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'), // Default 60 requests/minute
    analytics: true,
  });
  console.log('✓ Upstash Ratelimit shield initialized.');
} else {
  // Resilient memory-based sliding window rate limiter for development/testing
  const requestLogs = new Map<string, number[]>();

  ratelimiter = {
    async limit(key: string, customLimit?: number, customDurationMs?: number) {
      const now = Date.now();
      
      // Default limits: 60 requests per 1 minute (60,000ms)
      const limitCount = customLimit || 60;
      const durationMs = customDurationMs || 60000;
      
      const logs = requestLogs.get(key) || [];
      
      // Filter out timestamps outside the sliding window duration
      const activeLogs = logs.filter((timestamp) => now - timestamp < durationMs);
      
      if (activeLogs.length >= limitCount) {
        return {
          success: false,
          limit: limitCount,
          remaining: 0,
          reset: now + (durationMs - (now - activeLogs[0])),
        };
      }
      
      activeLogs.push(now);
      requestLogs.set(key, activeLogs);
      
      return {
        success: true,
        limit: limitCount,
        remaining: limitCount - activeLogs.length,
        reset: now + durationMs,
      };
    },
    isMock: true,
  };
  console.warn('⚠️ Upstash Redis keys missing. Bypassing cloud rate-limiting. Initialized local sliding-window rate limiter.');
}

export { ratelimiter };
export default ratelimiter;
