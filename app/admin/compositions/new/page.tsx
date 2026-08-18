import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/src/db/client';
import CompositionAddClient from './CompositionAddClient';

export const dynamic = 'force-dynamic';

export default async function AdminCompositionAddPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  if ((session.user as any).role !== 'ADMIN') redirect('/');

  const [saints, deities] = await Promise.all([
    db.saint.findMany({ select: { id: true, nameMarathi: true }, orderBy: { nameMarathi: 'asc' } }),
    db.deity.findMany({ select: { id: true, nameMarathi: true }, orderBy: { nameMarathi: 'asc' } }),
  ]);

  return <CompositionAddClient saints={saints} deities={deities} />;
}
