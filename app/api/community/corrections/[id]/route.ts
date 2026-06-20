import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/src/lib/auth';
import {
  getCorrection,
  submitCorrection,
  withdrawCorrection,
  startReview,
  reviewCorrection,
} from '@/src/community';

// ─── GET: Single correction (Secured) ────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }
    const sessionUserId = (session.user as any).id;
    const role = (session.user as any).role || 'USER';

    const { id } = await params;
    const correction = await getCorrection(id);

    if (!correction) {
      return NextResponse.json(
        { error: `Correction ${id} not found` },
        { status: 404 }
      );
    }

    // Security Gate: Only the creator of the suggestion or a moderator can view details
    if (correction.userId !== sessionUserId && role !== 'ADMIN' && role !== 'MODERATOR') {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permission to view this suggestion.' },
        { status: 403 }
      );
    }

    return NextResponse.json(correction);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch correction';
    console.error('[Community] Get correction error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST: Perform action (Secured & Gated) ──────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }
    const sessionUserId = (session.user as any).id;
    const role = (session.user as any).role || 'USER';

    const body = await request.json();
    const { action, reviewerNotes } = body as {
      action?: string;
      reviewerNotes?: string;
    };

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        { error: 'action is required (string)' },
        { status: 400 }
      );
    }

    // Fetch the target correction to verify ownership
    const correction = await getCorrection(id);
    if (!correction) {
      return NextResponse.json(
        { error: `Correction ${id} not found` },
        { status: 404 }
      );
    }

    switch (action) {
      case 'submit': {
        // Creator check
        if (correction.userId !== sessionUserId) {
          return NextResponse.json(
            { error: 'Forbidden. Only the creator can submit this correction suggestion.' },
            { status: 403 }
          );
        }
        const result = await submitCorrection(id, sessionUserId);
        return NextResponse.json(result);
      }

      case 'withdraw': {
        // Creator check
        if (correction.userId !== sessionUserId) {
          return NextResponse.json(
            { error: 'Forbidden. Only the creator can withdraw this correction suggestion.' },
            { status: 403 }
          );
        }
        const result = await withdrawCorrection(id, sessionUserId);
        return NextResponse.json(result);
      }

      case 'start-review': {
        // Moderator check
        if (role !== 'ADMIN' && role !== 'MODERATOR') {
          return NextResponse.json(
            { error: 'Forbidden. Only moderators can review corrections.' },
            { status: 403 }
          );
        }
        const result = await startReview(id, sessionUserId);
        return NextResponse.json(result);
      }

      case 'approve':
      case 'reject': {
        // Moderator check
        if (role !== 'ADMIN' && role !== 'MODERATOR') {
          return NextResponse.json(
            { error: 'Forbidden. Only moderators can approve/reject corrections.' },
            { status: 403 }
          );
        }
        const result = await reviewCorrection({
          correctionId: id,
          reviewerId: sessionUserId,
          action: action as 'approve' | 'reject',
          reviewerNotes,
        });
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          {
            error: `Unknown action "${action}". Valid actions: submit, withdraw, start-review, approve, reject`,
          },
          { status: 400 }
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to process correction action';
    console.error('[Community] Correction action error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
