/**
 * Digital Pandharpur — Admin Authorization Guard
 *
 * Reusable guard for admin-only API routes.
 * Call at the top of every admin API handler.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { NextResponse } from 'next/server';

export interface AdminSession {
  userId: string;
  email: string;
  name: string | null;
  role: string;
}

/**
 * Require an authenticated admin session.
 * Returns the session on success, or a NextResponse error on failure.
 */
export async function requireAdmin(): Promise<
  { session: AdminSession } | { error: NextResponse }
> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized. Sign in required.' }, { status: 401 }) };
  }

  const role = (session.user as any).role;
  if (role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 }) };
  }

  return {
    session: {
      userId: (session.user as any).id,
      email: session.user.email ?? '',
      name: session.user.name ?? null,
      role,
    },
  };
}
