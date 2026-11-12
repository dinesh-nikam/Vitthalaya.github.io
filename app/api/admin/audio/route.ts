/**
 * Digital Pandharpur — Admin Audio Dashboard API Controller
 *
 * GET /api/admin/audio
 *
 * Validates admin permissions and delegates dashboard aggregation
 * to AudioAdminService.
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/require-admin';
import { audioAdminService } from '@/src/services/audio-admin.service';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const data = await audioAdminService.getDashboardData();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Admin Audio API Controller] Error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
