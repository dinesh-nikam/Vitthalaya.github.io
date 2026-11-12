import { describe, expect, it, mock } from 'bun:test';
import { NextRequest } from 'next/server';

let mockSessionUser: { id: string; email: string } | null = null;

mock.module('next-auth', () => ({
  getServerSession: async () => (mockSessionUser ? { user: mockSessionUser } : null),
}));

import { GET as getCompositionById } from '@/app/api/v1/compositions/[id]/route';
import { GET as getWariStops } from '@/app/api/v1/wari/stops/route';
import { GET as getPlaylists, POST as createPlaylist } from '@/app/api/playlists/route';
import {
  encodeWariStopCursor,
  decodeWariStopCursor,
  listWariStopsQuerySchema,
} from '@/app/api/v1/wari/stops/schema';
import { registerApiKey } from '@/src/lib/api-auth';

describe('Public API v1 — Compositions [id]', () => {
  it('TC-API-V1-001: rejects request when X-API-Key header is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/compositions/test-id');
    const res = await getCompositionById(req, { params: Promise.resolve({ id: 'test-id' }) });
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe('Missing API key. Provide X-API-Key header.');
    expect(body.code).toBe('MISSING_API_KEY');
  });

  it('TC-API-V1-002: rejects request when X-API-Key is invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/compositions/test-id', {
      headers: { 'X-API-Key': 'invalid-key-123' },
    });
    const res = await getCompositionById(req, { params: Promise.resolve({ id: 'test-id' }) });
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe('Invalid API key.');
    expect(body.code).toBe('INVALID_API_KEY');
  });

  it('TC-API-V1-003: returns 404 with structured error when composition not found', async () => {
    registerApiKey('valid-test-key-comp', 'Test Key', 100);

    const req = new NextRequest('http://localhost:3000/api/v1/compositions/non-existent-uuid', {
      headers: { 'X-API-Key': 'valid-test-key-comp' },
    });
    const res = await getCompositionById(req, { params: Promise.resolve({ id: 'non-existent-uuid' }) });
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toBe('Composition not found');
    expect(body.code).toBe('NOT_FOUND');
    expect(res.headers.get('X-RateLimit-Remaining')).toBeDefined();
  });

  it('TC-API-V1-004: returns 400 validation error for empty identifier', async () => {
    registerApiKey('valid-test-key-comp-2', 'Test Key 2', 100);

    const req = new NextRequest('http://localhost:3000/api/v1/compositions/%20', {
      headers: { 'X-API-Key': 'valid-test-key-comp-2' },
    });
    const res = await getCompositionById(req, { params: Promise.resolve({ id: '   ' }) });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details).toBeDefined();
  });
});

describe('Public API v1 — Wari Pilgrimage Stops Schema & Cursors', () => {
  it('TC-WARI-001: encodes and decodes cursor payload faithfully', () => {
    const cursor = encodeWariStopCursor(5, 'stop-uuid-123');
    expect(typeof cursor).toBe('string');

    const decoded = decodeWariStopCursor(cursor);
    expect(decoded).not.toBeNull();
    expect(decoded?.sortOrder).toBe(5);
    expect(decoded?.id).toBe('stop-uuid-123');
  });

  it('TC-WARI-002: returns null for invalid cursor string', () => {
    expect(decodeWariStopCursor('not-valid-base64')).toBeNull();
    expect(decodeWariStopCursor(Buffer.from('{"invalid": true}').toString('base64url'))).toBeNull();
  });

  it('TC-WARI-003: validates query parameters with defaults', () => {
    const parsed = listWariStopsQuerySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sort).toBe('asc');
      expect(parsed.data.limit).toBe(50);
    }
  });

  it('TC-WARI-004: clamps and coerces numeric distance and limit parameters', () => {
    const parsed = listWariStopsQuerySchema.safeParse({
      minDistance: '10',
      maxDistance: '250',
      limit: '25',
      sort: 'desc',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.minDistance).toBe(10);
      expect(parsed.data.maxDistance).toBe(250);
      expect(parsed.data.limit).toBe(25);
      expect(parsed.data.sort).toBe('desc');
    }
  });

  it('TC-WARI-005: rejects invalid sort direction or negative distance', () => {
    const invalidSort = listWariStopsQuerySchema.safeParse({ sort: 'diagonal' });
    expect(invalidSort.success).toBe(false);

    const negativeDist = listWariStopsQuerySchema.safeParse({ minDistance: '-5' });
    expect(negativeDist.success).toBe(false);
  });
});

describe('Public API v1 — Wari Stops Handler', () => {
  it('TC-WARI-006: rejects unauthenticated requests with 401 MISSING_API_KEY', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/wari/stops');
    const res = await getWariStops(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe('Missing API key. Provide X-API-Key header.');
  });

  it('TC-WARI-007: rejects requests with malformed cursor token with 400', async () => {
    registerApiKey('valid-test-key-wari', 'Test Key Wari', 100);

    const req = new NextRequest('http://localhost:3000/api/v1/wari/stops?cursor=invalid-cursor-token', {
      headers: { 'X-API-Key': 'valid-test-key-wari' },
    });
    const res = await getWariStops(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('Malformed cursor token.');
    expect(body.code).toBe('INVALID_CURSOR');
  });

  it('TC-WARI-008: returns empty collection with pagination metadata when no stops in range', async () => {
    registerApiKey('valid-test-key-wari-2', 'Test Key Wari 2', 100);

    const req = new NextRequest('http://localhost:3000/api/v1/wari/stops?minDistance=99999', {
      headers: { 'X-API-Key': 'valid-test-key-wari-2' },
    });
    const res = await getWariStops(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta).toBeDefined();
    expect(body.meta.has_next).toBe(false);
    expect(body.meta.next_cursor).toBeNull();
    expect(body.links).toBeDefined();
    expect(body.links.self).toBeDefined();
    expect(res.headers.get('X-RateLimit-Remaining')).toBeDefined();
    expect(res.headers.get('Cache-Control')).toContain('max-age');
  });
});

describe('API Playlists Handler Hardening', () => {
  it('TC-PL-API-001: rejects unauthenticated GET with 401 UNAUTHORIZED', async () => {
    mockSessionUser = null;
    const req = new Request('http://localhost:3000/api/playlists');
    const res = await getPlaylists(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('TC-PL-API-002: rejects unauthenticated POST with 401 UNAUTHORIZED', async () => {
    mockSessionUser = null;
    const req = new Request('http://localhost:3000/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Devotional List' }),
    });
    const res = await createPlaylist(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('TC-PL-API-003: rejects POST with invalid body format with 400 INVALID_JSON', async () => {
    mockSessionUser = { id: 'test-user-1', email: 'test@example.com' };
    const req = new Request('http://localhost:3000/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json{',
    });
    const res = await createPlaylist(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.code).toBe('INVALID_JSON');
  });

  it('TC-PL-API-004: rejects POST with missing or blank name with 400 VALIDATION_ERROR', async () => {
    mockSessionUser = { id: 'test-user-1', email: 'test@example.com' };
    const req = new Request('http://localhost:3000/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '   ' }),
    });
    const res = await createPlaylist(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details).toBeDefined();
    expect(body.details.name).toBe('Playlist name is required.');
  });
});
