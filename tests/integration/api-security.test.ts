/**
 * API Security Tests
 *
 * Tests security controls: rate limiting, input sanitization,
 * circuit breaker, and cache management.
 */

import { describe, it, expect } from 'bun:test';
import { sanitizeText, stripHtml, escapeHtml, isSafeString } from '@/src/lib/sanitize';
import { circuitBreaker, createCircuitBreaker } from '@/src/lib/circuit-breaker';

// ─── Input Sanitization ──────────────────────────────────────────────────────

describe('Input Sanitization', () => {
  it('stripHtml should remove all HTML tags', () => {
    expect(stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
    expect(stripHtml('<img src="x" onerror="alert(1)">')).toBe('');
  });

  it('stripHtml should remove HTML entities', () => {
    expect(stripHtml('Hello &amp; World')).toBe('Hello  World');
    expect(stripHtml('Price: &#8377;100')).toBe('Price: 100');
  });

  it('stripHtml should remove dangerous protocols', () => {
    expect(stripHtml('javascript:alert(1)')).toBe('alert(1)');
    expect(stripHtml('data:text/html,<script>')).toBe('text/html,');
  });

  it('escapeHtml should escape special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    expect(escapeHtml("it's a test")).toBe('it&#x27;s a test');
  });

  it('sanitizeText should strip HTML and enforce max length', () => {
    const longInput = 'a'.repeat(10000);
    const result = sanitizeText(longInput, { maxLength: 100 });
    expect(result.length).toBeLessThanOrEqual(100);
  });

  it('sanitizeText should collapse multiple spaces', () => {
    expect(sanitizeText('hello    world')).toBe('hello world');
    expect(sanitizeText('a  b  c')).toBe('a b c');
  });

  it('sanitizeText should optionally remove newlines', () => {
    const input = 'line1\nline2\nline3';
    expect(sanitizeText(input, { allowNewlines: false })).toBe('line1 line2 line3');
    expect(sanitizeText(input, { allowNewlines: true })).toContain('line1');
  });
});

// ─── Safe String Validation ──────────────────────────────────────────────────

describe('Safe String Validation', () => {
  it('should accept normal text', () => {
    expect(isSafeString('Hello, World!')).toBe(true);
    expect(isSafeString('Marathi text: वारकरी')).toBe(true);
  });

  it('should reject null bytes', () => {
    expect(isSafeString('hello\x00world')).toBe(false);
  });

  it('should reject control characters', () => {
    expect(isSafeString('hello\x07world')).toBe(false);
    expect(isSafeString('hello\x1Fworld')).toBe(false);
  });

  it('should allow newlines and tabs', () => {
    expect(isSafeString('line1\nline2')).toBe(true);
    expect(isSafeString('col1\tcol2')).toBe(true);
  });

  it('should block SQL injection patterns', () => {
    expect(isSafeString("DROP TABLE users;")).toBe(false);
    expect(isSafeString("SELECT * FROM users WHERE 1=1")).toBe(false);
    expect(isSafeString("INSERT INTO users SELECT * FROM passwords")).toBe(false);
  });
});

// ─── Circuit Breaker ─────────────────────────────────────────────────────────

describe('Circuit Breaker', () => {
  it('should allow calls when in CLOSED state', async () => {
    const cb = createCircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 100, monitorWindowMs: 5000 });
    const result = await cb.execute(async () => 'success');
    expect(result).toBe('success');
  });

  it('should transition to OPEN after reaching failure threshold', async () => {
    const cb = createCircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 5000, monitorWindowMs: 5000 });

    // First two failures should trip the circuit
    try { await cb.execute(async () => { throw new Error('fail'); }); } catch {}
    try { await cb.execute(async () => { throw new Error('fail'); }); } catch {}

    // Third call should be rejected immediately
    let rejected = false;
    try {
      await cb.execute(async () => 'should not run');
    } catch (err) {
      rejected = true;
      expect((err as Error).message).toContain('OPEN');
    }
    expect(rejected).toBe(true);
  });

  it('should reset on manual reset', async () => {
    const cb = createCircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 50000, monitorWindowMs: 5000 });
    try { await cb.execute(async () => { throw new Error('fail'); }); } catch {}

    cb.reset();
    const result = await cb.execute(async () => 'recovered');
    expect(result).toBe('recovered');
  });

  it('should report metrics', async () => {
    const cb = createCircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 5000, monitorWindowMs: 5000 });
    await cb.execute(async () => 'ok');
    try { await cb.execute(async () => { throw new Error('fail'); }); } catch {}

    const metrics = cb.getMetrics();
    expect(metrics.state).toBe('CLOSED');
    expect(metrics.failureCount).toBe(1);
    expect(metrics.successCount).toBe(1);
  });
});
