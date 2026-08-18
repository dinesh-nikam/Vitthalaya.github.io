import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/src/db/client';
import CompositionsAdminClient from './CompositionsAdminClient';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

export default async function AdminCompositionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; q?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  if ((session.user as any).role !== 'ADMIN') redirect('/');

  const { page: pageRaw, type: typeRaw, q: qRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw || '1', 10) || 1);
  const type = typeRaw || undefined;
  const q = qRaw || undefined;

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (q) {
    where.OR = [
      { titleMarathi: { contains: q, mode: 'insensitive' } },
      { titleTranslit: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, compositions, distinctTypes] = await Promise.all([
    db.composition.count({ where }),
    db.composition.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        saint: { select: { nameMarathi: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        tags: { include: { tag: true } },
      },
    }),
    db.composition.findMany({ select: { type: true }, distinct: ['type'] }),
  ]);

  const serialized = compositions.map((c: any) => ({
    id: c.id,
    titleMarathi: c.titleMarathi,
    slug: c.slug,
    type: c.type,
    reviewed: c.reviewed,
    saintName: c.saint?.nameMarathi || null,
    creator: c.createdBy ? (c.createdBy.name || c.createdBy.email) : null,
    tags: c.tags.map((t: any) => ({ id: t.tag.id, name: t.tag.name, color: t.tag.color })),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return (
    <CompositionsAdminClient
      compositions={serialized}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      currentType={type || ''}
      currentQuery={q || ''}
      availableTypes={distinctTypes.map((t: any) => t.type).sort()}
    />
  );
}
