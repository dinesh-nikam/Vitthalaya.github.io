import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';

// GET /api/acquire/moderation/notes?queueId=xxx — fetch notes for a queue item
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (!['MODERATOR', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const queueId = searchParams.get('queueId');

    if (!queueId) {
      return NextResponse.json({ error: '"queueId" query parameter is required.' }, { status: 400 });
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
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/acquire/moderation/notes — create a new editorial note
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (!['MODERATOR', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { queueId, content, parentNoteId } = body;

    if (!queueId || !content?.trim()) {
      return NextResponse.json({ error: '"queueId" and "content" are required.' }, { status: 400 });
    }

    // Verify queue item exists
    const queueItem = await db.moderationQueue.findUnique({ where: { id: queueId } });
    if (!queueItem) {
      return NextResponse.json({ error: 'Moderation queue item not found.' }, { status: 404 });
    }

    // If parentNoteId provided, verify it exists
    if (parentNoteId) {
      const parent = await db.moderationEditorialNote.findUnique({ where: { id: parentNoteId } });
      if (!parent || parent.queueId !== queueId) {
        return NextResponse.json({ error: 'Parent note not found or mismatch.' }, { status: 400 });
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
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/acquire/moderation/notes?id=xxx — delete a note (author or admin only)
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('id');

    if (!noteId) {
      return NextResponse.json({ error: '"id" query parameter is required.' }, { status: 400 });
    }

    const note = await db.moderationEditorialNote.findUnique({ where: { id: noteId } });
    if (!note) {
      return NextResponse.json({ error: 'Note not found.' }, { status: 404 });
    }

    // Only author or admin can delete
    if (note.authorId !== userId && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. Only the author or an admin can delete this note.' }, { status: 403 });
    }

    const hasReplies = await db.moderationEditorialNote.findFirst({
      where: { parentNoteId: noteId },
    });
    if (hasReplies) {
      return NextResponse.json({ error: 'Cannot delete note because it has replies.' }, { status: 400 });
    }

    await db.moderationEditorialNote.delete({ where: { id: noteId } });

    return NextResponse.json({ success: true, message: 'Note deleted.' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Moderation notes DELETE error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
