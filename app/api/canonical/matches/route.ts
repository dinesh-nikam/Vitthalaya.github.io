/**
 * POST /api/canonical/matches
 *
 * Find potential canonical record matches for a composition.
 *
 * Request body:
 *   { compositionId: string; type?: string; minConfidence?: number }
 *
 * Response:
 *   { matches: MatchResult[] }
 *
 * The engine compares the composition against all existing canonical records
 * of the same type (or all types if not specified) and returns matches
 * sorted by confidence descending.
 */

import { NextRequest, NextResponse } from 'next/server';
import { canonicalEngine } from '@/src/canonical/canonical-engine';
import { getCompositionSummaries, getAllCanonicalRecords } from '@/src/db/canonical';
import { CONFIDENCE_THRESHOLDS } from '@/src/canonical/types';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { compositionId, type, minConfidence } = body;

    if (!compositionId || typeof compositionId !== 'string') {
      return NextResponse.json(
        { error: 'compositionId (string) is required' },
        { status: 400 }
      );
    }

    // Fetch the composition to match
    const [compositions] = await Promise.all([
      getCompositionSummaries({ limit: 1 }),
    ]);

    // Find the specific composition
    const allCompositions = await getCompositionSummaries({ limit: 5000 });
    const composition = allCompositions.find((c) => c.id === compositionId);

    if (!composition) {
      return NextResponse.json(
        { error: `Composition ${compositionId} not found` },
        { status: 404 }
      );
    }

    // Fetch candidate canonical records
    const candidates = await getAllCanonicalRecords({ type });

    if (candidates.length === 0) {
      return NextResponse.json({
        compositionId,
        matches: [],
        message: 'No canonical records exist yet. Create one with POST /api/canonical/merge?promote=true',
      });
    }

    // Run matching
    const matches = canonicalEngine.findMatches(composition, candidates);

    // Filter by minimum confidence
    const threshold = minConfidence ?? CONFIDENCE_THRESHOLDS.SUGGESTED;
    const filtered = matches.filter((m) => m.confidence >= threshold);

    return NextResponse.json({
      compositionId,
      totalCandidates: candidates.length,
      matches: filtered,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
