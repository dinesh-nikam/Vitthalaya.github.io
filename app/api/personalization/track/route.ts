/**
 * Personalization API - Track user interactions
 * 
 * Records user behavior for the recommendation engine.
 * Events: view, complete, bookmark, share, listen
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = (session!.user as any).id as string;
    const body = await request.json();
    const { compositionId, interaction, durationSeconds, scrollPercent } = body;

    // Validate required fields
    if (!compositionId || !interaction) {
      return NextResponse.json(
        { error: 'compositionId and interaction are required' },
        { status: 400 }
      );
    }

    // Validate interaction type
    const validInteractions = ['view', 'complete', 'bookmark', 'share', 'listen'];
    if (!validInteractions.includes(interaction)) {
      return NextResponse.json(
        { error: `Invalid interaction. Must be one of: ${validInteractions.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify composition exists
    const composition = await db.composition.findUnique({
      where: { id: compositionId },
      select: { id: true },
    });

    if (!composition) {
      return NextResponse.json({ error: 'Composition not found' }, { status: 404 });
    }

    // Record the interaction
    const userInteraction = await db.userInteraction.create({
      data: {
        userId,
        compositionId,
        interaction,
        durationSeconds: durationSeconds || null,
        scrollPercent: scrollPercent || null,
      },
    });

    // Update daily stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyStats = await db.dailyReadingStats.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: {
        compositionsRead: { increment: interaction === 'view' ? 1 : 0 },
        compositionsCompleted: { increment: interaction === 'complete' ? 1 : 0 },
        totalMinutesRead: { increment: Math.floor((durationSeconds || 0) / 60) },
      },
      create: {
        userId,
        date: today,
        compositionsRead: interaction === 'view' ? 1 : 0,
        compositionsCompleted: interaction === 'complete' ? 1 : 0,
        totalMinutesRead: Math.floor((durationSeconds || 0) / 60),
      },
    });

    // Check if daily goal is met
    const preferences = await db.userPreference.findUnique({
      where: { userId },
      select: { readingGoalPerDay: true },
    });

    if (preferences?.readingGoalPerDay && dailyStats.compositionsRead >= preferences.readingGoalPerDay) {
      await db.dailyReadingStats.update({
        where: { id: dailyStats.id },
        data: { goalMet: true },
      });
    }

    return NextResponse.json({
      success: true,
      interaction: userInteraction,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Track interaction error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
