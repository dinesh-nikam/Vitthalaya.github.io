import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Forwarding page for /profile.
 * Redirects authenticated users to their specific profile sub-page /profile/[id].
 */
export default async function ProfileIndexPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/auth/signin');
  }
  redirect(`/profile/${(session.user as any).id}`);
}
