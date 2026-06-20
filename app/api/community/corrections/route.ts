import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/src/lib/auth';
import { createCorrection, listCorrections, getCorrectionStats } from '@/src/community';

// ─── GET: List corrections (Secured) ─────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role || 'USER';
    const sessionUserId = (session?.user as any)?.id;

    const status = request.nextUrl.searchParams.get('status') ?? undefined;
    const compositionId = request.nextUrl.searchParams.get('compositionId') ?? undefined;
    const queryUserId = request.nextUrl.searchParams.get('userId') ?? undefined;
    const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(request.nextUrl.searchParams.get('offset') ?? '0', 10);

    // If requesting stats, require admin/moderator
    if (request.nextUrl.searchParams.get('stats') === 'true') {
      if (role !== 'ADMIN' && role !== 'MODERATOR') {
        return NextResponse.json({ error: 'Forbidden. Access restricted to moderators.' }, { status: 403 });
      }
      const stats = await getCorrectionStats();
      return NextResponse.json({ stats });
    }

    // Role-based filtering: Regular users can only see their own suggestions
    let finalUserId = queryUserId;
    if (role !== 'ADMIN' && role !== 'MODERATOR') {
      if (!sessionUserId) {
        return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
      }
      finalUserId = sessionUserId;
    }

    const result = await listCorrections({ status, compositionId, userId: finalUserId, limit, offset });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list corrections';
    console.error('[Community] List corrections error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST: Create correction (Secured) ────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }
    const sessionUserId = (session.user as any).id;

    const body = await request.json();
    const { compositionId, fieldPath, newValue, reason, diffJson } = body as {
      compositionId?: string;
      fieldPath?: string;
      newValue?: string;
      reason?: string;
      diffJson?: unknown;
    };

    // Validate required fields
    if (!compositionId || typeof compositionId !== 'string') {
      return NextResponse.json(
        { error: 'compositionId is required (string)' },
        { status: 400 }
      );
    }

    if (!fieldPath || typeof fieldPath !== 'string') {
      return NextResponse.json(
        { error: 'fieldPath is required (string)' },
        { status: 400 }
      );
    }

    if (!newValue || typeof newValue !== 'string') {
      return NextResponse.json(
        { error: 'newValue is required (string)' },
        { status: 400 }
      );
    }

    // Create correction using secure sessionUserId to prevent impersonation
    const correction = await createCorrection({
      compositionId,
      userId: sessionUserId,
      fieldPath,
      newValue,
      reason,
      diffJson,
    });

    return NextResponse.json(correction, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create correction';
    console.error('[Community] Create correction error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
