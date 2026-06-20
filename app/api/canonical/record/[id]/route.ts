/**
 * GET /api/canonical/record/[id]
 *
 * Get full details of a canonical record including source mappings
 * and version history.
 *
 * Response:
 *   { record: CanonicalRecordDetail; sourceMappings: [...]; versions: [...] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const record = await db.canonicalRecord.findUnique({
      where: { id },
      include: {
        saint: {
          select: { id: true, nameMarathi: true, slug: true },
        },
        deity: {
          select: { id: true, nameMarathi: true },
        },
        sourceMappings: {
          include: {
            composition: {
              select: { id: true, titleMarathi: true, slug: true, fullText: true },
            },
          },
          orderBy: [{ mappingType: 'asc' }, { confidenceScore: 'desc' }],
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
        mergeLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        compositions: {
          select: { id: true, titleMarathi: true, slug: true, type: true, source: true },
          orderBy: { titleMarathi: 'asc' },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: `CanonicalRecord ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ record });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
