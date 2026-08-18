/**
 * GET    /api/admin/pages/[id] — fetch a single page (with revisions)
 * PATCH  /api/admin/pages/[id] — update a page (creates a new revision)
 * DELETE /api/admin/pages/[id] — delete a page
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

  const page = await db.page.findUnique({
    where: { id: (await params).id },
    include: {
      author: { select: { id: true, name: true, email: true } },
      lastEditedBy: { select: { id: true, name: true, email: true } },
      tags: { include: { tag: true } },
      revisions: { orderBy: { createdAt: 'desc' }, take: 20, include: { editedBy: { select: { name: true, email: true } } } },
    },
  });

  if (!page) return NextResponse.json({ error: 'Page not found.' }, { status: 404 });
  return NextResponse.json({ page });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const existing = await db.page.findUnique({ where: { id: (await params).id } });
    if (!existing) return NextResponse.json({ error: 'Page not found.' }, { status: 404 });

    const body = await request.json();
    const {
      title, titleMarathi, content, excerpt, pageType, status,
      seoTitle, seoDescription, canonicalUrl, tagIds, changeNote,
    } = body;

    const wasPublished = existing.status === 'PUBLISHED';
    const willBePublished = status === 'PUBLISHED';

    const updated = await db.page.update({
      where: { id: (await params).id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(titleMarathi !== undefined ? { titleMarathi } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(excerpt !== undefined ? { excerpt } : {}),
        ...(pageType !== undefined ? { pageType } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(seoTitle !== undefined ? { seoTitle } : {}),
        ...(seoDescription !== undefined ? { seoDescription } : {}),
        ...(canonicalUrl !== undefined ? { canonicalUrl } : {}),
        ...(!wasPublished && willBePublished ? { publishedAt: new Date() } : {}),
        lastEditedById: auth.session.userId,
        ...(Array.isArray(tagIds)
          ? {
              tags: {
                deleteMany: {},
                create: tagIds.map((tagId: string) => ({ tagId })),
              },
            }
          : {}),
      },
      include: { tags: { include: { tag: true } } },
    });

    await db.pageRevision.create({
      data: {
        pageId: updated.id,
        title: updated.title,
        content: updated.content,
        changeNote: changeNote || 'Updated',
        editedById: auth.session.userId,
      },
    });

    await recordAuditLog({
      actorId: auth.session.userId,
      action: !wasPublished && willBePublished ? 'PUBLISH' : 'UPDATE',
      entityType: 'Page',
      entityId: updated.id,
      before: { title: existing.title, status: existing.status },
      after: { title: updated.title, status: updated.status },
    });

    return NextResponse.json({ page: updated });
  } catch (err) {
    console.error('[Admin Pages API] PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update page.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const existing = await db.page.findUnique({ where: { id: (await params).id } });
    if (!existing) return NextResponse.json({ error: 'Page not found.' }, { status: 404 });

    await db.page.delete({ where: { id: (await params).id } });

    await recordAuditLog({
      actorId: auth.session.userId,
      action: 'DELETE',
      entityType: 'Page',
      entityId: (await params).id,
      before: { title: existing.title, slug: existing.slug },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin Pages API] DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete page.' }, { status: 500 });
  }
}
