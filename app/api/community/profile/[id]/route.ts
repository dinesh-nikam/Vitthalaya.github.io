/**
 * Digital Pandharpur — User Profile API
 *
 * GET /api/community/profile/[id]
 *   Get user profile with stats, corrections, versions.
 *   Query: limit?, offset?
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const limit = Math.min(50, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') ?? '20', 10)));
    const offset = Math.max(0, parseInt(request.nextUrl.searchParams.get('offset') ?? '0', 10));

    // Fetch user with stats
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        imageUrl: true,
        bio: true,
        role: true,
        reputationScore: true,
        createdAt: true,
        _count: {
          select: {
            corrections: true,
            versions: true,
            collections: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch user's recent corrections
    const corrections = await db.correctionSuggestion.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        fieldPath: true,
        oldValue: true,
        newValue: true,
        reason: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
        composition: { select: { id: true, titleMarathi: true, slug: true } },
        reviewer: { select: { id: true, name: true } },
      },
    });

    // Count corrections by status
    const statusCounts = await db.correctionSuggestion.groupBy({
      by: ['status'],
      where: { userId: id },
      _count: { id: true },
    });
    const correctionStats: Record<string, number> = {};
    for (const s of statusCounts) {
      correctionStats[s.status] = s._count.id;
    }

    // Fetch user's recent version contributions
    const versions = await db.compositionVersion.findMany({
      where: { createdByUserId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        versionNumber: true,
        changeReason: true,
        createdAt: true,
        composition: { select: { id: true, titleMarathi: true, slug: true } },
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        imageUrl: user.imageUrl,
        bio: user.bio,
        role: user.role,
        reputationScore: user.reputationScore,
        memberSince: user.createdAt,
        collectionsCount: user._count.collections,
        totalCorrections: user._count.corrections,
        totalVersions: user._count.versions,
        correctionStats,
      },
      corrections: corrections.map((c) => ({
        id: c.id,
        fieldPath: c.fieldPath,
        oldValue: c.oldValue,
        newValue: c.newValue,
        reason: c.reason,
        status: c.status,
        createdAt: c.createdAt,
        reviewedAt: c.reviewedAt,
        composition: c.composition,
        reviewer: c.reviewer,
      })),
      versions: versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        changeReason: v.changeReason,
        createdAt: v.createdAt,
        composition: v.composition,
      })),
      pagination: { limit, offset },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch profile';
    console.error('[Community] Profile error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
