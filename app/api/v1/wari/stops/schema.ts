import { z } from 'zod';

export const listWariStopsQuerySchema = z.object({
  sort: z.enum(['asc', 'desc']).default('asc'),
  minDistance: z.coerce.number().int().min(0, 'minDistance must be >= 0').optional(),
  maxDistance: z.coerce.number().int().min(0, 'maxDistance must be >= 0').optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type ListWariStopsQuery = z.infer<typeof listWariStopsQuerySchema>;

export interface WariStopCursorPayload {
  sortOrder: number;
  id: string;
}

export function encodeWariStopCursor(sortOrder: number, id: string): string {
  const payload: WariStopCursorPayload = { sortOrder, id };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeWariStopCursor(cursor: string): WariStopCursorPayload | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.sortOrder === 'number' && typeof parsed.id === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
