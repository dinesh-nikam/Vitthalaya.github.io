import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (!['MODERATOR', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden. Access restricted to moderators and admins.' }, { status: 403 });
    }

    // 2. Fetch pending and flagged moderation items
    const queueItems = await db.moderationQueue.findMany({
      where: {
        status: { in: ['pending', 'flagged'] },
      },
      orderBy: [
        { tier: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    // 3. Enrich items with source context (volunteers, suggestions, target compositions)
    const enrichedItems: any[] = [];

    for (const item of queueItems) {
      let volunteerName = 'System';
      let volunteerReputation = 0;
      let originalTitle = '';
      let originalText = '';
      let originalMeaning = '';

      if (item.sourceType === 'ocr') {
        const upload = await db.manuscriptUpload.findUnique({
          where: { id: item.sourceId },
          include: {
            volunteer: {
              select: { name: true, reputationScore: true },
            },
          },
        });
        if (upload) {
          volunteerName = upload.volunteer?.name || 'Anonymous Volunteer';
          volunteerReputation = upload.volunteer?.reputationScore || 0;
        }
      } else if (item.sourceType === 'suggestion') {
        const suggestion = await db.correctionSuggestion.findUnique({
          where: { id: item.sourceId },
          include: {
            user: {
              select: { name: true, reputationScore: true },
            },
            composition: {
              select: { titleMarathi: true, fullText: true, meaning: true },
            },
          },
        });
        if (suggestion) {
          volunteerName = suggestion.user?.name || 'Anonymous Contributor';
          volunteerReputation = suggestion.user?.reputationScore || 0;
          originalTitle = suggestion.composition?.titleMarathi || '';
          originalText = suggestion.composition?.fullText || '';
          originalMeaning = suggestion.composition?.meaning || '';
        }
      }

      enrichedItems.push({
        id: item.id,
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        draftTitle: item.draftTitle,
        draftText: item.draftText,
        draftMeaning: item.draftMeaning,
        tier: item.tier,
        consensusScore: item.consensusScore,
        status: item.status,
        volunteer: {
          name: volunteerName,
          reputation: volunteerReputation,
        },
        original: {
          title: originalTitle,
          text: originalText,
          meaning: originalMeaning,
        },
        createdAt: item.createdAt,
      });
    }

    return NextResponse.json({
      success: true,
      items: enrichedItems,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Moderation list API error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
