import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (!['MODERATOR', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden. Access restricted to moderators and admins.' }, { status: 403 });
    }

    // Parse query params for pagination, filtering, search
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20));
    const status = searchParams.get('status') || undefined; // pending, approved, rejected, flagged
    const sourceType = searchParams.get('sourceType') || undefined; // ocr, suggestion
    const query = searchParams.get('q') || undefined; // search in title/text
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' as const : 'desc' as const;

    // Build where clause
    const where: Prisma.ModerationQueueWhereInput = {};

    if (status) {
      where.status = status;
    } else {
      // Default: show pending + flagged
      where.status = { in: ['pending', 'flagged'] };
    }

    if (sourceType) {
      where.sourceType = sourceType;
    }

    if (query) {
      where.OR = [
        { draftTitle: { contains: query, mode: 'insensitive' } },
        { draftText: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Build orderBy
    const orderBy: Prisma.ModerationQueueOrderByWithRelationInput = {};
    if (sortBy === 'tier') orderBy.tier = sortOrder;
    else if (sortBy === 'consensusScore') orderBy.consensusScore = sortOrder;
    else orderBy.createdAt = sortOrder;

    // Run count + findMany in parallel
    const [total, rawItems] = await Promise.all([
      db.moderationQueue.count({ where }),
      db.moderationQueue.findMany({
        where,
        orderBy: [orderBy, { createdAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          reviews: {
            select: { id: true, vote: true, reviewerId: true, createdAt: true },
          },
          uploadedFile: {
            select: {
              detectedMetadata: true,
              user: { select: { name: true, reputationScore: true } },
            },
          },
        },
      }),
    ]);

    // Enrich items with source context
    const enrichedItems = await Promise.all(
      rawItems.map(async (item) => {
        let volunteerName = 'System';
        let volunteerReputation = 0;
        let originalTitle = '';
        let originalText = '';
        let originalMeaning = '';
        let classification: Record<string, unknown> | null = null;

        if (item.sourceType === 'ocr') {
          if (item.uploadedFile) {
            volunteerName = item.uploadedFile.user?.name || 'Anonymous Volunteer';
            volunteerReputation = item.uploadedFile.user?.reputationScore || 0;
            if (item.uploadedFile.detectedMetadata) {
              try { classification = JSON.parse(item.uploadedFile.detectedMetadata); } catch { /* ignore */ }
            }
          } else {
            const upload = await db.manuscriptUpload.findUnique({
              where: { id: item.sourceId },
              include: { volunteer: { select: { name: true, reputationScore: true } } },
            });
            if (upload) {
              volunteerName = upload.volunteer?.name || 'Anonymous Volunteer';
              volunteerReputation = upload.volunteer?.reputationScore || 0;
            }
          }
        } else if (item.sourceType === 'suggestion') {
          const suggestion = await db.correctionSuggestion.findUnique({
            where: { id: item.sourceId },
            include: {
              user: { select: { name: true, reputationScore: true } },
              composition: { select: { titleMarathi: true, fullText: true, meaning: true } },
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

        return {
          id: item.id,
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          draftTitle: item.draftTitle,
          draftText: item.draftText,
          draftMeaning: item.draftMeaning,
          tier: item.tier,
          consensusScore: item.consensusScore,
          status: item.status,
          statusReason: item.statusReason,
          reviewCount: item.reviews.length,
          volunteer: { name: volunteerName, reputation: volunteerReputation },
          original: { title: originalTitle, text: originalText, meaning: originalMeaning },
          classification,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      items: enrichedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Moderation list API error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
