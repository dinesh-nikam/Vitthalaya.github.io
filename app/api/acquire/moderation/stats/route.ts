import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (!['MODERATOR', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Parallel counts
    const [
      pendingCount,
      approvedCount,
      rejectedCount,
      flaggedCount,
      approvedToday,
      approvedThisWeek,
      approvedThisMonth,
      totalReviews,
      topReviewers,
    ] = await Promise.all([
      db.moderationQueue.count({ where: { status: 'pending' } }),
      db.moderationQueue.count({ where: { status: 'approved' } }),
      db.moderationQueue.count({ where: { status: 'rejected' } }),
      db.moderationQueue.count({ where: { status: 'flagged' } }),
      db.moderationQueue.count({ where: { status: 'approved', reviewedAt: { gte: todayStart } } }),
      db.moderationQueue.count({ where: { status: 'approved', reviewedAt: { gte: weekStart } } }),
      db.moderationQueue.count({ where: { status: 'approved', reviewedAt: { gte: monthStart } } }),
      db.moderationReview.count(),
      db.moderationReview.groupBy({
        by: ['reviewerId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    // Resolve reviewer names
    const reviewerIds = topReviewers.map((r) => r.reviewerId);
    const reviewers = reviewerIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: reviewerIds } },
          select: { id: true, name: true, reputationScore: true },
        })
      : [];

    const reviewerStats = topReviewers.map((r) => {
      const user = reviewers.find((u) => u.id === r.reviewerId);
      return {
        reviewerId: r.reviewerId,
        name: user?.name || 'Unknown',
        reputationScore: user?.reputationScore || 0,
        reviewCount: r._count.id,
      };
    });

    // Daily trend: last 14 days — optimized single database call
    const fourteenDaysAgo = new Date(todayStart);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);

    const queueItems = await db.moderationQueue.findMany({
      where: {
        status: { in: ['approved', 'rejected'] },
        reviewedAt: { gte: fourteenDaysAgo },
      },
      select: {
        status: true,
        reviewedAt: true,
      },
    });

    const trendMap = new Map<string, { approved: number; rejected: number }>();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(todayStart);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      trendMap.set(dateStr, { approved: 0, rejected: 0 });
    }

    for (const item of queueItems) {
      if (!item.reviewedAt) continue;
      const dateStr = item.reviewedAt.toISOString().split('T')[0];
      const entry = trendMap.get(dateStr);
      if (entry) {
        if (item.status === 'approved') {
          entry.approved++;
        } else if (item.status === 'rejected') {
          entry.rejected++;
        }
      }
    }

    const dailyTrend = [...trendMap.entries()].map(([date, counts]) => ({
      date,
      approved: counts.approved,
      rejected: counts.rejected,
    }));

    return NextResponse.json({
      success: true,
      stats: {
        queue: {
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          flagged: flaggedCount,
          total: pendingCount + approvedCount + rejectedCount + flaggedCount,
        },
        activity: {
          approvedToday,
          approvedThisWeek,
          approvedThisMonth,
          totalReviews,
        },
        reviewers: reviewerStats,
        dailyTrend,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Moderation stats API error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
