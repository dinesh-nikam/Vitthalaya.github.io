import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/src/lib/auth';
import { SourceRegistry } from '@/src/discovery/source-registry';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }
    const sessionUserId = (session.user as any).id;

    const body = await request.json();
    const { url, notes } = body as {
      url?: string;
      notes?: string;
    };

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'url is required (string)' },
        { status: 400 }
      );
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format.' },
        { status: 400 }
      );
    }

    const source = await SourceRegistry.submitCommunityTip(url, sessionUserId, notes);

    return NextResponse.json({ source }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to submit community tip';
    console.error('[Community Tip API] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
