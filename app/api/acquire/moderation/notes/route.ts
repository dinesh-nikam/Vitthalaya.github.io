import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';
import { ApiErrors, errorResponse } from '@/src/lib/api-response';

// GET /api/acquire/moderation/notes?queueId=xxx — fetch notes for a queue item
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return ApiErrors.UNAUTHORIZED('Unauthorized.');
    }
    const role = (session.user as any).role;
    if (!['MODERATOR', 'ADMIN'].includes(role)) {
      return ApiErrors.FORBIDDEN('Forbidden.');
    }

    const { searchParams } = new URL(request.url);
    const queueId = searchParams.get('queueId');

    if (!queueId) {
      return ApiErrors.BAD_REQUEST('"queueId" query parameter is required.');
    }

    const notes = await db.moderationEditorialNote.findMany({
      where: { queueId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ success: true, notes });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Moderation notes GET error:', err);
    return errorResponse(msg, 500, { code: 'INTERNAL_ERROR' });
  }
}

// POST /api/acquire/moderation/notes — create a new editorial note
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return ApiErrors.UNAUTHORIZED('Unauthorized.');
    }
    const role = (session.user as any).role;
    if (!['MODERATOR', 'ADMIN'].includes(role)) {
      return ApiErrors.FORBIDDEN('Forbidden.');
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { queueId, content, parentNoteId } = body;

    if (!queueId || !content?.trim()) {
      return ApiErrors.BAD_REQUEST('"queueId" and "content" are required.');
    }

    // Verify queue item exists
    const queueItem = await db.moderationQueue.findUnique({ where: { id: queueId } });
    if (!queueItem) {
      return ApiErrors.NOT_FOUND('Moderation queue item not found.');
    }

    // If parentNoteId provided, verify it exists
    if (parentNoteId) {
      const parent = await db.moderationEditorialNote.findUnique({ where: { id: parentNoteId } });
      if (!parent || parent.queueId !== queueId) {
        return ApiErrors.BAD_REQUEST('Parent note not found or mismatch.');
      }
    }

    const note = await db.moderationEditorialNote.create({
      data: {
        queueId,
        authorId: userId,
        content: content.trim(),
        parentNoteId: parentNoteId || null,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ success: true, note }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Moderation notes POST error:', err);
    return errorResponse(msg, 500, { code: 'INTERNAL_ERROR' });
  }
}

// DELETE /api/acquire/moderation/notes?id=xxx — delete a note (author or admin only)
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return ApiErrors.UNAUTHORIZED('Unauthorized.');
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('id');

    if (!noteId) {
      return ApiErrors.BAD_REQUEST('"id" query parameter is required.');
    }

    const note = await db.moderationEditorialNote.findUnique({ where: { id: noteId } });
    if (!note) {
      return ApiErrors.NOT_FOUND('Note not found.');
    }

    // Only author or admin can delete
    if (note.authorId !== userId && role !== 'ADMIN') {
      return ApiErrors.FORBIDDEN('Forbidden. Only the author or an admin can delete this note.');
    }

    const hasReplies = await db.moderationEditorialNote.findFirst({
      where: { parentNoteId: noteId },
    });
    if (hasReplies) {
      return ApiErrors.BAD_REQUEST('Cannot delete note because it has replies.');
    }

    await db.moderationEditorialNote.delete({ where: { id: noteId } });

    return NextResponse.json({ success: true, message: 'Note deleted.' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Moderation notes DELETE error:', err);
    return errorResponse(msg, 500, { code: 'INTERNAL_ERROR' });
  }
}
