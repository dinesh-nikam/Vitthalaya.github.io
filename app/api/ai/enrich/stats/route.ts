/**
 * Digital Pandharpur — AI Enrichment Stats API
 *
 * GET /api/ai/enrich/stats
 *   Returns queue statistics and recent activity summary.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { getQueueStats } from '@/src/ai-enrichment';

export async function GET(_request: NextRequest) {
  try {
    const stats = await getQueueStats();

    // Recent activity: last 10 completed/failed/needs_review jobs
    const recentActivity = await db.aiEnrichmentJob.findMany({
      where: {
        status: { in: ['completed', 'failed', 'needs_review'] },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        composition: {
          select: { id: true, titleMarathi: true, type: true },
        },
        result: {
          select: {
            id: true,
            confidenceSummary: true,
            reviewed: true,
            reviewApproved: true,
          },
        },
      },
    });

    // Model usage breakdown
    const modelUsage = await db.aiEnrichmentJob.groupBy({
      by: ['modelProvider', 'modelName'],
      _count: { id: true },
      where: {
        modelProvider: { not: null },
      },
    });

    // Daily job counts for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyStats = await db.aiEnrichmentJob.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      _count: { id: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return NextResponse.json({
      stats,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      recentActivity: recentActivity.map((j: any) => ({
        id: j.id,
        compositionId: j.compositionId,
        status: j.status,
        title: j.composition.titleMarathi,
        type: j.composition.type,
        confidenceSummary: j.result?.confidenceSummary ?? null,
        reviewed: j.result?.reviewed ?? false,
        reviewApproved: j.result?.reviewApproved ?? null,
        updatedAt: j.updatedAt,
      })),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      modelUsage: modelUsage.map((m: any) => ({
        provider: m.modelProvider,
        model: m.modelName,
        count: m._count.id,
      })),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      dailyStats: dailyStats.map((d: any) => ({
        status: d.status,
        count: d._count.id,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch enrichment stats';
    console.error('[AI Enrich] Stats error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
