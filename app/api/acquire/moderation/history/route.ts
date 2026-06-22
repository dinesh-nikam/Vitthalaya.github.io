import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (!['MODERATOR', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20));
    const status = searchParams.get('status') || undefined; // approved, rejected, flagged
    const sourceType = searchParams.get('sourceType') || undefined;
    const query = searchParams.get('q') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' as const : 'desc' as const;

    const where: Prisma.ModerationQueueWhereInput = {
      status: status ? status : { in: ['approved', 'rejected', 'flagged'] },
    };

    if (sourceType) where.sourceType = sourceType;
    if (query) {
      where.OR = [
        { draftTitle: { contains: query, mode: 'insensitive' } },
        { draftText: { contains: query, mode: 'insensitive' } },
      ];
    }
    if (dateFrom || dateTo) {
      where.reviewedAt = {};
      if (dateFrom) where.reviewedAt.gte = new Date(dateFrom);
      if (dateTo) where.reviewedAt.lte = new Date(dateTo);
    }

    const [total, items] = await Promise.all([
      db.moderationQueue.count({ where }),
      db.moderationQueue.findMany({
        where,
        orderBy: { reviewedAt: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          reviews: {
            select: { id: true, vote: true, reviewerId: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Moderation history API error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
