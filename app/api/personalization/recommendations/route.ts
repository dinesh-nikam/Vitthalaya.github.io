/**
 * Personalized Recommendations API
 * 
 * Generates recommendations based on:
 * 1. User's reading history
 * 2. Favorite saints and deities
 * 3. Similar users' behavior (collaborative filtering)
 * 4. Content similarity (semantic search)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';

interface Recommendation {
  id: string;
  titleMarathi: string;
  titleTranslit: string;
  slug: string;
  type: string;
  saintName: string | null;
  reason: string;
  score: number;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!(session?.user as any)?.id) {
      // Return generic recommendations for unauthenticated users
      return getGenericRecommendations(request);
    }

    const userId = (session!.user as any).id as string;
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10', 10);

    // Get user preferences
    const preferences = await db.userPreference.findUnique({
      where: { userId },
    });

    // Get user's recent interactions
    const recentInteractions = await db.userInteraction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { compositionId: true, interaction: true },
    });

    const interactedCompositionIds = recentInteractions.map(i => i.compositionId);
    const viewedCompositionIds = recentInteractions
      .filter(i => i.interaction === 'view')
      .map(i => i.compositionId);

    // Get favorite saint IDs from preferences
    const favoriteSaintIds = preferences?.favoriteSaints
      ? JSON.parse(preferences.favoriteSaints)
      : [];

    // Get favorite deity IDs from preferences
    const favoriteDeityIds = preferences?.favoriteDeities
      ? JSON.parse(preferences.favoriteDeities)
      : [];

    const recommendations: Recommendation[] = [];

    // Strategy 1: More from favorite saints
    if (favoriteSaintIds.length > 0) {
      const saintComps = await db.composition.findMany({
        where: {
          saintId: { in: favoriteSaintIds },
          id: { notIn: interactedCompositionIds },
          reviewed: true,
        },
        include: { saint: { select: { nameMarathi: true } } },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      saintComps.forEach(comp => {
        recommendations.push({
          id: comp.id,
          titleMarathi: comp.titleMarathi,
          titleTranslit: comp.titleTranslit,
          slug: comp.slug,
          type: comp.type,
          saintName: comp.saint?.nameMarathi || null,
          reason: 'आपल्या आवडत्या संतांकडून',
          score: 0.9,
        });
      });
    }

    // Strategy 2: More from favorite deities
    if (favoriteDeityIds.length > 0 && recommendations.length < limit) {
      const deityComps = await db.composition.findMany({
        where: {
          deityId: { in: favoriteDeityIds },
          id: { notIn: [...interactedCompositionIds, ...recommendations.map(r => r.id)] },
          reviewed: true,
        },
        include: { deity: { select: { nameMarathi: true } } },
        take: limit - recommendations.length,
        orderBy: { createdAt: 'desc' },
      });

      deityComps.forEach(comp => {
        recommendations.push({
          id: comp.id,
          titleMarathi: comp.titleMarathi,
          titleTranslit: comp.titleTranslit,
          slug: comp.slug,
          type: comp.type,
          saintName: null,
          reason: 'आपल्या आवडत्या देवतेशी संबंधित',
          score: 0.85,
        });
      });
    }

    // Strategy 3: Similar users' favorites (collaborative filtering)
    if (recommendations.length < limit) {
      const similarUserIds = await findSimilarUsers(userId, viewedCompositionIds);
      
      if (similarUserIds.length > 0) {
        const similarUserComps = await db.userInteraction.findMany({
          where: {
            userId: { in: similarUserIds },
            interaction: { in: ['complete', 'bookmark'] },
            compositionId: {
              notIn: [...interactedCompositionIds, ...recommendations.map(r => r.id)],
            },
          },
          include: {
            composition: {
              include: { saint: { select: { nameMarathi: true } } },
            },
          },
          distinct: ['compositionId'],
          take: limit - recommendations.length,
        });

        similarUserComps.forEach(interaction => {
          if (interaction.composition) {
            recommendations.push({
              id: interaction.composition.id,
              titleMarathi: interaction.composition.titleMarathi,
              titleTranslit: interaction.composition.titleTranslit,
              slug: interaction.composition.slug,
              type: interaction.composition.type,
              saintName: interaction.composition.saint?.nameMarathi || null,
              reason: 'समान वाचकांना आवडले',
              score: 0.75,
            });
          }
        });
      }
    }

    // Strategy 4: Trending compositions (fill remaining slots)
    if (recommendations.length < limit) {
      const trending = await db.composition.findMany({
        where: {
          id: { notIn: [...interactedCompositionIds, ...recommendations.map(r => r.id)] },
          reviewed: true,
        },
        include: { saint: { select: { nameMarathi: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit - recommendations.length,
      });

      trending.forEach(comp => {
        recommendations.push({
          id: comp.id,
          titleMarathi: comp.titleMarathi,
          titleTranslit: comp.titleTranslit,
          slug: comp.slug,
          type: comp.type,
          saintName: comp.saint?.nameMarathi || null,
          reason: 'नवीनतम रचना',
          score: 0.5,
        });
      });
    }

    // Sort by score and return top results
    recommendations.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      recommendations: recommendations.slice(0, limit),
      personalization: {
        hasPreferences: !!preferences,
        interactedCount: recentInteractions.length,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Recommendations error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Find similar users based on overlapping viewed compositions
 */
async function findSimilarUsers(
  currentUserId: string,
  viewedCompositionIds: string[]
): Promise<string[]> {
  if (viewedCompositionIds.length === 0) return [];

  // Find users who viewed similar compositions
  const similarUsers = await db.userInteraction.findMany({
    where: {
      userId: { not: currentUserId },
      compositionId: { in: viewedCompositionIds },
      interaction: 'view',
    },
    select: { userId: true },
    distinct: ['userId'],
    take: 20,
  });

  return similarUsers.map(u => u.userId);
}

/**
 * Get generic recommendations for unauthenticated users
 */
async function getGenericRecommendations(
  request: NextRequest
): Promise<NextResponse> {
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10', 10);

  const trending = await db.composition.findMany({
    where: { reviewed: true },
    include: { saint: { select: { nameMarathi: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const recommendations: Recommendation[] = trending.map(comp => ({
    id: comp.id,
    titleMarathi: comp.titleMarathi,
    titleTranslit: comp.titleTranslit,
    slug: comp.slug,
    type: comp.type,
    saintName: comp.saint?.nameMarathi || null,
    reason: 'लोकप्रिय रचना',
    score: 0.5,
  }));

  return NextResponse.json({
    recommendations,
    personalization: {
      hasPreferences: false,
      interactedCount: 0,
    },
  });
}
