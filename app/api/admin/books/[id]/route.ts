import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { requireAdmin } from '@/src/lib/require-admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const { id } = await params;
    const book = await db.bookPublication.findUnique({
      where: { id },
      include: {
        editions: true,
        compositions: {
          include: {
            composition: {
              select: { titleMarathi: true, titleTranslit: true, type: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, book });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Admin Book Details GET] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const { id } = await params;
    const body = await request.json();

    const {
      titleMarathi,
      titleEnglish,
      description,
      status,
      isPublic,
      basePrice,
      royaltyPercent,
    } = body;

    const updatedBook = await db.bookPublication.update({
      where: { id },
      data: {
        ...(titleMarathi !== undefined && { titleMarathi }),
        ...(titleEnglish !== undefined && { titleEnglish }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(isPublic !== undefined && { isPublic }),
        ...(basePrice !== undefined && { basePrice: Number(basePrice) }),
        ...(royaltyPercent !== undefined && { royaltyPercent: Number(royaltyPercent) }),
      },
    });

    return NextResponse.json({ success: true, book: updatedBook });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Admin Book Details PATCH] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const { id } = await params;

    await db.bookPublication.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Book deleted successfully' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Admin Book Details DELETE] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
