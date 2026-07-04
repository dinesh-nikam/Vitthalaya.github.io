import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/src/lib/auth';
import { createCorrection, listCorrections, getCorrectionStats } from '@/src/community';
import {
  createdResponse,
  errorResponse,
  CORS_HEADERS,
} from '@/src/lib/api-response';

// ─── GET: List corrections (Secured) ─────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string })?.role || 'USER';
    const sessionUserId = (session?.user as { id?: string })?.id;

    const status = request.nextUrl.searchParams.get('status') ?? undefined;
    const compositionId = request.nextUrl.searchParams.get('compositionId') ?? undefined;
    const queryUserId = request.nextUrl.searchParams.get('userId') ?? undefined;
    const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(request.nextUrl.searchParams.get('offset') ?? '0', 10);

    // If requesting stats, require admin/moderator
    if (request.nextUrl.searchParams.get('stats') === 'true') {
      if (role !== 'ADMIN' && role !== 'MODERATOR') {
        return errorResponse('Forbidden. Access restricted to moderators.', 403, {
          code: 'FORBIDDEN',
        });
      }
      const stats = await getCorrectionStats();
      return NextResponse.json({ stats }, { headers: CORS_HEADERS });
    }

    // Role-based filtering: Regular users can only see their own suggestions
    let finalUserId = queryUserId;
    if (role !== 'ADMIN' && role !== 'MODERATOR') {
      if (!sessionUserId) {
        return errorResponse('Unauthorized. Please sign in.', 401, {
          code: 'UNAUTHORIZED',
        });
      }
      finalUserId = sessionUserId;
    }

    const result = await listCorrections({ status, compositionId, userId: finalUserId, limit, offset });
    return NextResponse.json(result, { headers: CORS_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list corrections';
    console.error('[Community] List corrections error:', message);
    return errorResponse(message, 500);
  }
}

// ─── POST: Create correction (Secured) ────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return errorResponse('Unauthorized. Please sign in.', 401, {
        code: 'UNAUTHORIZED',
      });
    }
    const sessionUserId = (session.user as { id: string }).id;

    const body = await request.json();
    const { compositionId, fieldPath, newValue, reason, diffJson } = body as {
      compositionId?: string;
      fieldPath?: string;
      newValue?: string;
      reason?: string;
      diffJson?: unknown;
    };

    // Validate required fields
    const errors: Record<string, string> = {};
    if (!compositionId || typeof compositionId !== 'string') {
      errors.compositionId = 'compositionId is required (string)';
    }
    if (!fieldPath || typeof fieldPath !== 'string') {
      errors.fieldPath = 'fieldPath is required (string)';
    }
    if (!newValue || typeof newValue !== 'string') {
      errors.newValue = 'newValue is required (string)';
    }

    if (Object.keys(errors).length > 0) {
      return errorResponse('Validation failed', 400, {
        code: 'VALIDATION_ERROR',
        details: errors,
      });
    }

    // Create correction using secure sessionUserId to prevent impersonation
    const correction = await createCorrection({
      compositionId: compositionId as string,
      userId: sessionUserId,
      fieldPath: fieldPath as string,
      newValue: newValue as string,
      reason,
      diffJson,
    });

    return createdResponse(correction);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create correction';
    console.error('[Community] Create correction error:', message);
    return errorResponse(message, 500);
  }
}
