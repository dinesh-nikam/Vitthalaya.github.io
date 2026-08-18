import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/src/db/client';
import PagesAdminClient from './PagesAdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPagesListPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  if ((session.user as any).role !== 'ADMIN') redirect('/');

  const [pages, tags] = await Promise.all([
    db.page.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, email: true } },
        tags: { include: { tag: true } },
      },
    }),
    db.tag.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const serializedPages = pages.map((p: any) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
  }));

  return <PagesAdminClient initialPages={serializedPages} availableTags={tags} currentUserName={session.user.name || session.user.email || 'Admin'} />;
}
