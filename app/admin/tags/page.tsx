import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/src/db/client';
import TagsAdminClient from './TagsAdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminTagsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  if ((session.user as any).role !== 'ADMIN') redirect('/');

  const tags = await db.tag.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { compositions: true, pages: true } } },
  });

  const serialized = tags.map((t: any) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return <TagsAdminClient initialTags={serialized} />;
}
