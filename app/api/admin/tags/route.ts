/**
 * GET  /api/admin/tags — list all tags with usage counts
 * POST /api/admin/tags — create a new tag
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

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const tags = await db.tag.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { compositions: true, pages: true } },
    },
  });

  return NextResponse.json({ tags });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { name, nameMarathi, description, color } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: '"name" is required.' }, { status: 400 });
    }

    const slug = slugify(name);
    if (!slug) {
      return NextResponse.json({ error: 'Could not derive a valid slug from the name.' }, { status: 400 });
    }

    const existing = await db.tag.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: `A tag with slug "${slug}" already exists.` }, { status: 409 });
    }

    const tag = await db.tag.create({
      data: { name: name.trim(), nameMarathi: nameMarathi || null, slug, description: description || null, color: color || null },
    });

    await recordAuditLog({
      actorId: auth.session.userId,
      action: 'CREATE',
      entityType: 'Tag',
      entityId: tag.id,
      after: { name: tag.name, slug: tag.slug },
    });

    return NextResponse.json({ tag }, { status: 201 });
  } catch (err) {
    console.error('[Admin Tags API] POST error:', err);
    return NextResponse.json({ error: 'Failed to create tag.' }, { status: 500 });
  }
}
