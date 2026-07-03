/**
 * User Preferences API
 * 
 * GET: Retrieve current user's preferences
 * PUT: Update user preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = (session!.user as any).id as string;
    const preferences = await db.userPreference.findUnique({
      where: { userId },
    });

    return NextResponse.json({
      preferences: preferences || {
        preferredLanguage: 'mr',
        dailyAbhangEnabled: false,
        notificationPush: true,
        notificationEmail: false,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Get preferences error:', err);
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
    const {
      preferredLanguage,
      favoriteSaints,
      favoriteDeities,
      favoriteCategories,
      dailyAbhangEnabled,
      dailyAbhangTime,
      dailyAbhangSaintId,
      readingGoalPerDay,
      notificationPush,
      notificationEmail,
    } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (preferredLanguage !== undefined) updateData.preferredLanguage = preferredLanguage;
    if (favoriteSaints !== undefined) updateData.favoriteSaints = JSON.stringify(favoriteSaints);
    if (favoriteDeities !== undefined) updateData.favoriteDeities = JSON.stringify(favoriteDeities);
    if (favoriteCategories !== undefined) updateData.favoriteCategories = JSON.stringify(favoriteCategories);
    if (dailyAbhangEnabled !== undefined) updateData.dailyAbhangEnabled = dailyAbhangEnabled;
    if (dailyAbhangTime !== undefined) updateData.dailyAbhangTime = dailyAbhangTime;
    if (dailyAbhangSaintId !== undefined) updateData.dailyAbhangSaintId = dailyAbhangSaintId;
    if (readingGoalPerDay !== undefined) updateData.readingGoalPerDay = readingGoalPerDay;
    if (notificationPush !== undefined) updateData.notificationPush = notificationPush;
    if (notificationEmail !== undefined) updateData.notificationEmail = notificationEmail;

    // Upsert preferences
    const preferences = await db.userPreference.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        ...updateData,
      },
    });

    return NextResponse.json({ success: true, preferences });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Update preferences error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
