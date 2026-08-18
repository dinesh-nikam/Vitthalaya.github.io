import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { submitPeerVote } from '@/src/lib/moderation-workflow';
import { ApiErrors, errorResponse } from '@/src/lib/api-response';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return ApiErrors.UNAUTHORIZED('Unauthorized. Please sign in.');
    }

    const userId = (session.user as any).id;

    // 2. Parse request payload
    const body = await request.json();
    const { queueId, vote, notes } = body;

    if (!queueId || !vote) {
      return ApiErrors.BAD_REQUEST('Parameters "queueId" and "vote" are required.');
    }

    if (!['approve', 'reject', 'flag'].includes(vote)) {
      return ApiErrors.BAD_REQUEST('Invalid vote. Must be "approve", "reject", or "flag".');
    }

    // 3. Register peer review vote
    await submitPeerVote(userId, queueId, vote, notes);

    return NextResponse.json({
      success: true,
      message: 'Vote registered successfully.',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Moderation vote API error:', err);
    return errorResponse(msg, 500, { code: 'INTERNAL_ERROR' });
  }
}
