/**
 * Digital Pandharpur — Activity Feed API
 *
 * GET /api/community/activity
 *   Get recent community activity.
 *   Query: limit? (default 20), offset? (default 0), type? (correction|version|review)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';

export async function GET(request: NextRequest) {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') ?? '20', 10)));
    const offset = Math.max(0, parseInt(request.nextUrl.searchParams.get('offset') ?? '0', 10));
    const typeFilter = request.nextUrl.searchParams.get('type');

    // Fetch recent corrections (submitted status) and versions in parallel
    const whereCorrection: Record<string, unknown> = {};
    if (typeFilter === 'correction' || typeFilter === 'review') {
      whereCorrection.status = typeFilter === 'review' ? 'approved' : 'submitted';
    }

    const [corrections, versions] = await Promise.all([
      db.correctionSuggestion.findMany({
        where: Object.keys(whereCorrection).length > 0 ? whereCorrection as any : undefined,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          status: true,
          fieldPath: true,
          newValue: true,
          reason: true,
          createdAt: true,
          reviewedAt: true,
          user: { select: { id: true, name: true, imageUrl: true } },
          reviewer: { select: { id: true, name: true } },
          composition: { select: { id: true, titleMarathi: true, slug: true } },
        },
      }),
      db.compositionVersion.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          versionNumber: true,
          changeReason: true,
          createdAt: true,
          createdByUser: { select: { id: true, name: true, imageUrl: true } },
          composition: { select: { id: true, titleMarathi: true, slug: true } },
          correction: { select: { id: true, fieldPath: true } },
        },
      }),
    ]);

    // Merge into a single timeline sorted by date
    const activities: {
      type: string;
      id: string;
      user: { id: string; name: string | null; imageUrl: string | null } | null;
      action: string;
      target: { id: string; titleMarathi: string; slug: string } | null;
      detail: string;
      timestamp: Date;
    }[] = [];

    for (const c of corrections) {
      activities.push({
        type: c.status === 'approved' ? 'review' : 'correction',
        id: c.id,
        user: c.user,
        action: c.status === 'submitted' ? 'correction_suggested' : c.status === 'approved' ? 'correction_approved' : 'correction_rejected',
        target: c.composition,
        detail: c.fieldPath,
        timestamp: c.reviewedAt || c.createdAt,
      });
    }

    for (const v of versions) {
      activities.push({
        type: 'version',
        id: v.id,
        user: v.createdByUser,
        action: v.changeReason === 'initial' ? 'version_created' : 'version_updated',
        target: v.composition,
        detail: `v${v.versionNumber}`,
        timestamp: v.createdAt,
      });
    }

    // Sort by timestamp descending
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const paginated = activities.slice(offset, offset + limit);

    return NextResponse.json({
      activities: paginated,
      total: activities.length,
      limit,
      offset,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch activity';
    console.error('[Community] Activity error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
