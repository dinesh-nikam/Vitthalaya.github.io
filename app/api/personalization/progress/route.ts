/**
 * Reading Progress API
 * 
 * GET: Retrieve reading progress for a composition
 * PUT: Update reading progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = (session!.user as any).id as string;
    const compositionId = request.nextUrl.searchParams.get('compositionId');
    
    if (!compositionId) {
      return NextResponse.json({ error: 'compositionId is required' }, { status: 400 });
    }

    const progress = await db.readingProgress.findUnique({
      where: {
        userId_compositionId: {
          userId,
          compositionId,
        },
      },
    });

    return NextResponse.json({ progress });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Get reading progress error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = (session!.user as any).id as string;
    const body = await request.json();
    const { compositionId, scrollPosition, scrollPercent, completed } = body;

    if (!compositionId) {
      return NextResponse.json({ error: 'compositionId is required' }, { status: 400 });
    }

    // Upsert reading progress
    const progress = await db.readingProgress.upsert({
      where: {
        userId_compositionId: {
          userId,
          compositionId,
        },
      },
      update: {
        scrollPosition: scrollPosition || 0,
        scrollPercent: scrollPercent || 0,
        completed: completed || false,
        lastReadAt: new Date(),
      },
      create: {
        userId,
        compositionId,
        scrollPosition: scrollPosition || 0,
        scrollPercent: scrollPercent || 0,
        completed: completed || false,
      },
    });

    return NextResponse.json({ success: true, progress });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Update reading progress error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
