/**
 * GET /api/canonical/stats
 *
 * Get aggregate statistics about the canonicalization system.
 *
 * Response:
 *   { stats: CanonicalStats }
 */

import { NextResponse } from 'next/server';
import { getCanonicalStats } from '@/src/db/canonical';

export async function GET(): Promise<NextResponse> {
  try {
    const stats = await getCanonicalStats();
    return NextResponse.json({ stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
