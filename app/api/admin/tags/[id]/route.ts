/**
 * PATCH  /api/admin/tags/[id] — update a tag
 * DELETE /api/admin/tags/[id] — delete a tag
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { requireAdmin } from '@/src/lib/require-admin';
import { recordAuditLog } from '@/src/lib/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const existing = await db.tag.findUnique({ where: { id: (await params).id } });
    if (!existing) return NextResponse.json({ error: 'Tag not found.' }, { status: 404 });

    const body = await request.json();
    const { name, nameMarathi, description, color } = body;

    const updated = await db.tag.update({
      where: { id: (await params).id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(nameMarathi !== undefined ? { nameMarathi } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(color !== undefined ? { color } : {}),
      },
    });

    await recordAuditLog({
      actorId: auth.session.userId,
      action: 'UPDATE',
      entityType: 'Tag',
      entityId: updated.id,
      before: { name: existing.name },
      after: { name: updated.name },
    });

    return NextResponse.json({ tag: updated });
  } catch (err) {
    console.error('[Admin Tags API] PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update tag.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const existing = await db.tag.findUnique({ where: { id: (await params).id } });
    if (!existing) return NextResponse.json({ error: 'Tag not found.' }, { status: 404 });

    await db.tag.delete({ where: { id: (await params).id } });

    await recordAuditLog({
      actorId: auth.session.userId,
      action: 'DELETE',
      entityType: 'Tag',
      entityId: (await params).id,
      before: { name: existing.name, slug: existing.slug },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin Tags API] DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete tag.' }, { status: 500 });
  }
}
