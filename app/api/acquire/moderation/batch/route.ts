import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';
import { ApiErrors, errorResponse } from '@/src/lib/api-response';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return ApiErrors.UNAUTHORIZED('Unauthorized. Please sign in.');
    }

    const role = (session.user as any).role;
    if (!['MODERATOR', 'ADMIN'].includes(role)) {
      return ApiErrors.FORBIDDEN('Forbidden. Restricted to moderators and admins.');
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { queueIds, action, notes } = body;

    if (!Array.isArray(queueIds) || queueIds.length === 0) {
      return ApiErrors.BAD_REQUEST('"queueIds" must be a non-empty array.');
    }

    if (!['approve', 'reject', 'flag'].includes(action)) {
      return ApiErrors.BAD_REQUEST('"action" must be "approve", "reject", or "flag".');
    }

    await db.$transaction(async (tx) => {
      for (const queueId of queueIds) {
        const item = await tx.moderationQueue.findUnique({
          where: { id: queueId },
          include: { reviews: true },
        });

        if (!item) {
          throw new Error(`Item not found: ${queueId}`);
        }

        // Check duplicate vote
        const alreadyVoted = item.reviews.some((r) => r.reviewerId === userId);
        if (alreadyVoted) {
          throw new Error(`Already voted on item: ${queueId}`);
        }

        // Register the review
        await tx.moderationReview.create({
          data: { queueId, reviewerId: userId, vote: action, notes: notes || null },
        });

        // Apply immediate action for moderators/admins
        await tx.moderationQueue.update({
          where: { id: queueId },
          data: { status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged', reviewedAt: new Date() },
        });
      }
    });

    return NextResponse.json({
      success: true,
      summary: `Batch ${action} processed successfully for ${queueIds.length} items.`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Batch moderation API error:', err);
    return errorResponse(msg, 500, { code: 'INTERNAL_ERROR' });
  }
}
