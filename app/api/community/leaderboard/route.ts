/**
 * Digital Pandharpur — Leaderboard API
 *
 * GET /api/community/leaderboard
 *   Get top contributors by reputation score.
 *   Query: limit? (default 50), offset? (default 0)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';

export async function GET(request: NextRequest) {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10)));
    const offset = Math.max(0, parseInt(request.nextUrl.searchParams.get('offset') ?? '0', 10));

    const [users, total] = await Promise.all([
      db.user.findMany({
        where: { reputationScore: { gt: 0 } },
        orderBy: { reputationScore: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          imageUrl: true,
          bio: true,
          reputationScore: true,
          createdAt: true,
          _count: {
            select: {
              corrections: true,
              versions: true,
            },
          },
        },
      }),
      db.user.count({ where: { reputationScore: { gt: 0 } } }),
    ]);

    return NextResponse.json({
      users: users.map((u, i) => ({
        rank: offset + i + 1,
        id: u.id,
        name: u.name,
        imageUrl: u.imageUrl,
        bio: u.bio,
        reputationScore: u.reputationScore,
        correctionsCount: u._count.corrections,
        versionsCount: u._count.versions,
        memberSince: u.createdAt,
      })),
      total,
      limit,
      offset,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch leaderboard';
    console.error('[Community] Leaderboard error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
