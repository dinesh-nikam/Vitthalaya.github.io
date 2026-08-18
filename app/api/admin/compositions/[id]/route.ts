/**
 * GET   /api/admin/compositions/[id] — fetch a composition with full editorial metadata
 * PATCH /api/admin/compositions/[id] — update type/tags/creator/review status
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { requireAdmin } from '@/src/lib/require-admin';
import { recordAuditLog } from '@/src/lib/audit';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const composition = await db.composition.findUnique({
    where: { id: (await params).id },
    include: {
      saint: { select: { id: true, nameMarathi: true } },
      deity: { select: { id: true, nameMarathi: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      lastEditedBy: { select: { id: true, name: true, email: true } },
      tags: { include: { tag: true } },
      categories: { include: { category: true } },
    },
  });

  if (!composition) return NextResponse.json({ error: 'Composition not found.' }, { status: 404 });
  return NextResponse.json({ composition });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const existing = await db.composition.findUnique({ where: { id: (await params).id } });
    if (!existing) return NextResponse.json({ error: 'Composition not found.' }, { status: 404 });

    const body = await request.json();
    const { type, reviewed, saintId, deityId, createdById, tagIds } = body;

    if (createdById) {
      const creator = await db.user.findUnique({ where: { id: createdById }, select: { id: true } });
      if (!creator) {
        return NextResponse.json({ error: `No user found with id "${createdById}".` }, { status: 400 });
      }
    }

    const updated = await db.composition.update({
      where: { id: (await params).id },
      data: {
        ...(type !== undefined ? { type } : {}),
        ...(reviewed !== undefined ? { reviewed: Boolean(reviewed) } : {}),
        ...(saintId !== undefined ? { saintId: saintId || null } : {}),
        ...(deityId !== undefined ? { deityId: deityId || null } : {}),
        ...(createdById !== undefined ? { createdById: createdById || null } : {}),
        lastEditedById: auth.session.userId,
        ...(Array.isArray(tagIds)
          ? { tags: { deleteMany: {}, create: tagIds.map((tagId: string) => ({ tagId })) } }
          : {}),
      },
      include: { tags: { include: { tag: true } }, createdBy: { select: { id: true, name: true } } },
    });

    await recordAuditLog({
      actorId: auth.session.userId,
      action: 'UPDATE',
      entityType: 'Composition',
      entityId: updated.id,
      before: { type: existing.type, reviewed: existing.reviewed, createdById: existing.createdById },
      after: { type: updated.type, reviewed: updated.reviewed, createdById: updated.createdById },
    });

    return NextResponse.json({ composition: updated });
  } catch (err) {
    console.error('[Admin Compositions API] PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update composition.' }, { status: 500 });
  }
}
