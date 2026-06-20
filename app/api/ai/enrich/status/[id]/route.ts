/**
 * Digital Pandharpur — AI Enrichment Job Status API
 *
 * GET /api/ai/enrich/status/:id
 *   Returns full job details including enrichment result (if completed).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await db.aiEnrichmentJob.findUnique({
      where: { id },
      include: {
        composition: {
          select: {
            id: true,
            titleMarathi: true,
            type: true,
            fullText: true,
            saintId: true,
          },
        },
        result: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: `Job ${id} not found` }, { status: 404 });
    }

    return NextResponse.json({
      job: {
        id: job.id,
        compositionId: job.compositionId,
        status: job.status,
        priority: job.priority,
        attemptCount: job.attemptCount,
        maxAttempts: job.maxAttempts,
        errorMessage: job.errorMessage,
        modelProvider: job.modelProvider,
        modelName: job.modelName,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
      composition: job.composition,
      result: job.result
        ? {
            id: job.result.id,
            summary: job.result.summary,
            meaning: job.result.meaning,
            keywords: job.result.keywords,
            deityId: job.result.deityId,
            festivalIds: job.result.festivalIds,
            categories: job.result.categories,
            tags: job.result.tags,
            difficulty: job.result.difficulty,
            sentiment: job.result.sentiment,
            historicalNotes: job.result.historicalNotes,
            confidenceSummary: job.result.confidenceSummary,
            confidenceDeity: job.result.confidenceDeity,
            confidenceFestival: job.result.confidenceFestival,
            reviewed: job.result.reviewed,
            reviewApproved: job.result.reviewApproved,
            reviewNotes: job.result.reviewNotes,
            reviewedBy: job.result.reviewedBy,
            reviewedAt: job.result.reviewedAt,
            promptTokens: job.result.promptTokens,
            completionTokens: job.result.completionTokens,
            createdAt: job.result.createdAt,
          }
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch job status';
    console.error('[AI Enrich] Status error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
