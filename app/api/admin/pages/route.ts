/**
 * GET  /api/admin/pages  — list CMS pages (paginated, filterable by status/type)
 * POST /api/admin/pages  — create a new CMS page
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { requireAdmin } from '@/src/lib/require-admin';
import { recordAuditLog } from '@/src/lib/audit';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const pageType = searchParams.get('pageType') || undefined;
    const query = searchParams.get('q') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20));

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (pageType) where.pageType = pageType;
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { slug: { contains: query, mode: 'insensitive' } },
      ];
    }

    const [total, pages] = await Promise.all([
      db.page.count({ where }),
      db.page.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: { select: { id: true, name: true, email: true } },
          lastEditedBy: { select: { id: true, name: true, email: true } },
          tags: { include: { tag: true } },
          _count: { select: { revisions: true } },
        },
      }),
    ]);

    return NextResponse.json({ pages, total, page, limit });
  } catch (err) {
    console.error('[Admin Pages API] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch pages.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { title, titleMarathi, content, excerpt, pageType, status, seoTitle, seoDescription, tagIds } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: '"title" is required.' }, { status: 400 });
    }

    let slug = body.slug && typeof body.slug === 'string' && body.slug.trim().length > 0
      ? slugify(body.slug)
      : slugify(title);

    if (!slug) {
      return NextResponse.json({ error: 'Could not derive a valid slug from the title.' }, { status: 400 });
    }

    const existing = await db.page.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const page = await db.page.create({
      data: {
        title: title.trim(),
        titleMarathi: titleMarathi || null,
        slug,
        pageType: pageType || 'STATIC',
        content: content || null,
        excerpt: excerpt || null,
        status: status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
        seoTitle: seoTitle || title.trim(),
        seoDescription: seoDescription || excerpt || null,
        authorId: auth.session.userId,
        lastEditedById: auth.session.userId,
        ...(Array.isArray(tagIds) && tagIds.length > 0
          ? { tags: { create: tagIds.map((tagId: string) => ({ tagId })) } }
          : {}),
      },
      include: { tags: { include: { tag: true } } },
    });

    await db.pageRevision.create({
      data: {
        pageId: page.id,
        title: page.title,
        content: page.content,
        changeNote: 'Initial creation',
        editedById: auth.session.userId,
      },
    });

    await recordAuditLog({
      actorId: auth.session.userId,
      action: 'CREATE',
      entityType: 'Page',
      entityId: page.id,
      after: { title: page.title, slug: page.slug, status: page.status },
    });

    return NextResponse.json({ page }, { status: 201 });
  } catch (err) {
    console.error('[Admin Pages API] POST error:', err);
    return NextResponse.json({ error: 'Failed to create page.' }, { status: 500 });
  }
}
