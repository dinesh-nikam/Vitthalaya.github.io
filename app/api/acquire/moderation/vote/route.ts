import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { submitPeerVote } from '@/src/lib/moderation-workflow';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // 2. Parse request payload
    const body = await request.json();
    const { queueId, vote, notes } = body;

    if (!queueId || !vote) {
      return NextResponse.json({ error: 'Parameters "queueId" and "vote" are required.' }, { status: 400 });
    }

    if (!['approve', 'reject', 'flag'].includes(vote)) {
      return NextResponse.json({ error: 'Invalid vote. Must be "approve", "reject", or "flag".' }, { status: 400 });
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
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
