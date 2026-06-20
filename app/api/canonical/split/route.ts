/**
 * POST /api/canonical/split
 *
 * Split a source mapping out of a canonical record into its own
 * canonical record. Used when a merge was incorrect.
 *
 * Request body:
 *   { mappingId: string; reason?: string; reviewedBy?: string }
 *
 * Response:
 *   { success: true; oldCanonicalId: string; newCanonicalId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { splitFromCanonical } from '@/src/db/canonical';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { mappingId, reason, reviewedBy } = body;

    if (!mappingId || typeof mappingId !== 'string') {
      return NextResponse.json(
        { error: 'mappingId (string) is required' },
        { status: 400 }
      );
    }

    const newCanonicalId = await splitFromCanonical(mappingId, { reason, reviewedBy });

    return NextResponse.json({
      success: true,
      newCanonicalId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
