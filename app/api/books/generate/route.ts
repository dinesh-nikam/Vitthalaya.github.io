/**
 * POST /api/books/generate
 *
 * Triggers the book generation pipeline:
 *   1. Validate request body
 *   2. Run curation → structure → cover → export
 *   3. Return publication ID + edition download URLs
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { generateBook } from '../../../../src/book-generation/book-generator';
import type { GenerateBookRequest } from '../../../../src/book-generation/types';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const creatorId = (session.user as any).id;

    const body = await request.json();

    // ── Validation ──────────────────────────────────────────────────────────
    if (!body.titleMarathi || typeof body.titleMarathi !== 'string') {
      return NextResponse.json(
        { error: 'titleMarathi is required' },
        { status: 400 },
      );
    }

    if (!body.curationType) {
      return NextResponse.json(
        { error: 'curationType is required' },
        { status: 400 },
      );
    }

    if (!body.curationCriteria || typeof body.curationCriteria !== 'object') {
      return NextResponse.json(
        { error: 'curationCriteria is required' },
        { status: 400 },
      );
    }

    // ── Build Request ───────────────────────────────────────────────────────
    const req: GenerateBookRequest = {
      titleMarathi: body.titleMarathi,
      titleEnglish: body.titleEnglish,
      bookType: body.bookType ?? 'STANDARD',
      curationType: body.curationType,
      curationCriteria: {
        saintIds: body.curationCriteria.saintIds,
        deityIds: body.curationCriteria.deityIds,
        festivalIds: body.curationCriteria.festivalIds,
        themeSlug: body.curationCriteria.themeSlug,
        compositionTypes: body.curationCriteria.compositionTypes,
        keywordFilters: body.curationCriteria.keywordFilters,
        minScore: body.curationCriteria.minScore ?? 0.3,
        maxCount: body.curationCriteria.maxCount ?? 150,
        balanceByType: body.curationCriteria.balanceByType ?? true,
        balanceBySaint: body.curationCriteria.balanceBySaint ?? true,
        includeMeanings: body.curationCriteria.includeMeanings ?? true,
      },
      coverDesign: body.coverDesign,
      creatorId,
      isPublic: body.isPublic ?? false,
    };

    // ── Execute ─────────────────────────────────────────────────────────────
    const result = await generateBook(req);

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Book generation failed:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


