import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/src/db/client';
import CompositionEditClient from './CompositionEditClient';

export const dynamic = 'force-dynamic';

export default async function AdminCompositionEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  if ((session.user as any).role !== 'ADMIN') redirect('/');

  const [composition, saints, deities, tags, users] = await Promise.all([
    db.composition.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        lastEditedBy: { select: { id: true, name: true, email: true } },
        tags: { include: { tag: true } },
      },
    }),
    db.saint.findMany({ select: { id: true, nameMarathi: true }, orderBy: { nameMarathi: 'asc' } }),
    db.deity.findMany({ select: { id: true, nameMarathi: true }, orderBy: { nameMarathi: 'asc' } }),
    db.tag.findMany({ select: { id: true, name: true, color: true }, orderBy: { name: 'asc' } }),
    db.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: 'asc' }, take: 200 }),
  ]);

  if (!composition) notFound();

  return (
    <CompositionEditClient
      composition={{
        id: composition.id,
        titleMarathi: composition.titleMarathi,
        titleTranslit: composition.titleTranslit,
        slug: composition.slug,
        type: composition.type,
        reviewed: composition.reviewed,
        saintId: composition.saintId,
        deityId: composition.deityId,
        createdById: composition.createdById,
        createdByLabel: composition.createdBy ? (composition.createdBy.name || composition.createdBy.email) : null,
        lastEditedByLabel: composition.lastEditedBy ? (composition.lastEditedBy.name || composition.lastEditedBy.email) : null,
        tagIds: composition.tags.map((t: any) => t.tag.id),
      }}
      saints={saints}
      deities={deities}
      tags={tags}
      users={users}
    />
  );
}
