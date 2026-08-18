import { describe, expect, test, setSystemTime } from 'bun:test';
import {
  checkUserRateLimit,
  enforceUserRateLimit,
  rateLimitExceededResponse,
  addRateLimitHeaders,
} from '@/src/lib/api-auth';

// Module-level USER_RATE_LIMITS is shared across tests, so every test uses a
// unique user id to avoid cross-test pollution.
let userIdCounter = 0;
const nextUserId = () => `rl-test-user-${++userIdCounter}`;

describe('checkUserRateLimit', () => {
  test('allows the first request and reports remaining', () => {
    const id = nextUserId();
    const r = checkUserRateLimit(id, 5);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(4);
    expect(r.resetAt.getTime()).toBeGreaterThan(Date.now());
  });

  test('decrements remaining within the window', () => {
    const id = nextUserId();
    checkUserRateLimit(id, 3);
    const second = checkUserRateLimit(id, 3);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(1);
  });

  test('blocks once the limit is exhausted and keeps remaining at 0', () => {
    const id = nextUserId();
    checkUserRateLimit(id, 2);
    checkUserRateLimit(id, 2);
    const blocked = checkUserRateLimit(id, 2);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    // Still blocked on further attempts
    const stillBlocked = checkUserRateLimit(id, 2);
    expect(stillBlocked.allowed).toBe(false);
  });

  test('keeps independent buckets per user', () => {
    const exhausted = nextUserId();
    checkUserRateLimit(exhausted, 1); // exhaust this user
    expect(checkUserRateLimit(exhausted, 1).allowed).toBe(false);

    const fresh = nextUserId();
    expect(checkUserRateLimit(fresh, 1).allowed).toBe(true);
  });

  test('keeps independent buckets per scope on the same user', () => {
    const id = nextUserId();
    checkUserRateLimit(id, 1, 'upload'); // exhaust the upload scope
    expect(checkUserRateLimit(id, 1, 'upload').allowed).toBe(false);
    // A different route on the same user is unaffected
    expect(checkUserRateLimit(id, 1, 'correction').allowed).toBe(true);
  });

  test('resets the window after expiry', () => {
    const id = nextUserId();
    checkUserRateLimit(id, 1); // exhaust the window
    expect(checkUserRateLimit(id, 1).allowed).toBe(false);

    // Advance past the 60s window and verify the bucket refills
    setSystemTime(new Date(Date.now() + 61_000));
    try {
      const after = checkUserRateLimit(id, 1);
      expect(after.allowed).toBe(true);
      expect(after.remaining).toBe(0);
    } finally {
      setSystemTime(); // restore real clock
    }
  });
});

describe('rateLimitExceededResponse', () => {
  test('returns 429 with RATE_LIMITED code and Retry-After header', async () => {
    const resetAt = new Date(Date.now() + 45_000);
    const res = rateLimitExceededResponse(resetAt);

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('45');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(res.headers.get('X-RateLimit-Reset')).toBe(resetAt.toISOString());

    const body = await res.json();
    expect(body.code).toBe('RATE_LIMITED');
    expect(typeof body.error).toBe('string');
  });

  test('never emits a Retry-After below 1 second', () => {
    // resetAt in the past — the guard floors at 1
    const res = rateLimitExceededResponse(new Date(Date.now() - 5000));
    expect(res.headers.get('Retry-After')).toBe('1');
  });
});

describe('enforceUserRateLimit', () => {
  test('returns null when the request is allowed', () => {
    const id = nextUserId();
    expect(enforceUserRateLimit(id, 3)).toBeNull();
  });

  test('returns the 429 response once exhausted', () => {
    const id = nextUserId();
    enforceUserRateLimit(id, 1);
    enforceUserRateLimit(id, 1);
    const res = enforceUserRateLimit(id, 1);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    expect(res!.headers.get('Retry-After')).not.toBeNull();
  });
});

describe('addRateLimitHeaders', () => {
  test('sets X-RateLimit headers and preserves the response type', async () => {
    const res = new Response('ok', { status: 200 });
    const out = addRateLimitHeaders(res, 3, new Date('2026-01-01T00:00:00Z'));
    expect(out).toBe(res); // same instance returned
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('3');
    expect(res.headers.get('X-RateLimit-Reset')).toBe('2026-01-01T00:00:00.000Z');
  });
});
