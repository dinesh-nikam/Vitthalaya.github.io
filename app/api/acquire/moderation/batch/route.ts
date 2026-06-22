import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (!['MODERATOR', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden. Restricted to moderators and admins.' }, { status: 403 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { queueIds, action, notes } = body;

    if (!Array.isArray(queueIds) || queueIds.length === 0) {
      return NextResponse.json({ error: '"queueIds" must be a non-empty array.' }, { status: 400 });
    }

    if (!['approve', 'reject', 'flag'].includes(action)) {
      return NextResponse.json({ error: '"action" must be "approve", "reject", or "flag".' }, { status: 400 });
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
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
