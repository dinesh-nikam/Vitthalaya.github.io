/**
 * POST /api/canonical/merge
 *
 * Merge a composition into a canonical record, or promote a composition
 * to become a new canonical record.
 *
 * Request body (merge into existing):
 *   { compositionId: string; canonicalRecordId: string; reviewedBy?: string; reason?: string }
 *
 * Request body (promote to new canonical):
 *   { compositionId: string; promote: true; reviewedBy?: string; reason?: string }
 *
 * Response:
 *   { success: true; canonicalRecordId: string; action: 'merged' | 'promoted' }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createCanonicalRecord,
  mergeIntoCanonical,
  getCanonicalRecordDetail,
} from '@/src/db/canonical';
import { canonicalEngine } from '@/src/canonical/canonical-engine';
import { getCompositionSummaries, getAllCanonicalRecords } from '@/src/db/canonical';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { compositionId, canonicalRecordId, promote, reviewedBy, reason } = body;

    if (!compositionId || typeof compositionId !== 'string') {
      return NextResponse.json(
        { error: 'compositionId (string) is required' },
        { status: 400 }
      );
    }

    // ─── Promote: create new canonical record ──────────────────────────────
    if (promote) {
      const recordId = await createCanonicalRecord(compositionId);
      const detail = await getCanonicalRecordDetail(recordId);

      return NextResponse.json({
        success: true,
        action: 'promoted',
        canonicalRecordId: recordId,
        record: detail,
      });
    }

    // ─── Merge into existing ───────────────────────────────────────────────
    if (!canonicalRecordId || typeof canonicalRecordId !== 'string') {
      return NextResponse.json(
        { error: 'canonicalRecordId (string) is required when promote is not set' },
        { status: 400 }
      );
    }

    // Compute confidence using the engine
    const [compositions, candidates] = await Promise.all([
      getCompositionSummaries({ limit: 5000 }),
      getAllCanonicalRecords(),
    ]);

    const composition = compositions.find((c) => c.id === compositionId);
    if (!composition) {
      return NextResponse.json(
        { error: `Composition ${compositionId} not found` },
        { status: 404 }
      );
    }

    const canonical = candidates.find((c) => c.id === canonicalRecordId);
    if (!canonical) {
      return NextResponse.json(
        { error: `CanonicalRecord ${canonicalRecordId} not found` },
        { status: 404 }
      );
    }

    const bestMatch = canonicalEngine.findBestMatch(composition, [canonical]);
    const confidence = bestMatch?.confidence ?? 0.5;

    const action = canonicalEngine.determineAction(confidence);
    const mappingType = canonicalEngine.determineMappingType(action);

    await mergeIntoCanonical(
      compositionId,
      canonicalRecordId,
      confidence,
      action,
      mappingType,
      { reviewedBy, reason }
    );

    const detail = await getCanonicalRecordDetail(canonicalRecordId);

    return NextResponse.json({
      success: true,
      action: 'merged',
      canonicalRecordId,
      confidence,
      autoMerge: action === 'auto_merge',
      requiresReview: action === 'suggested_merge',
      record: detail,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
