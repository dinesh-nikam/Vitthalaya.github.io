/**
 * GET /api/books/download/[id]
 *
 * Serves a purchased digital book file. Verifies that the requesting
 * user has a CONFIRMED order containing this edition before streaming.
 *
 * Returns the file from the filesystem path stored in BookEdition.fileUrl.
 */
import { NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { existsSync } from 'fs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'orderId query parameter is required' }, { status: 400 });
    }

    // Look up the edition
    const edition = await db.bookEdition.findUnique({
      where: { id },
      select: {
        id: true,
        format: true,
        fileUrl: true,
        publicationId: true,
        publication: { select: { slug: true } },
      },
    });

    if (!edition || !edition.fileUrl) {
      return NextResponse.json({ error: 'Edition not found or file unavailable' }, { status: 404 });
    }

    // Authorization: verify this edition belongs to a CONFIRMED order
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : null;

    const orderItem = await db.orderItem.findFirst({
      where: {
        editionId: id,
        order: {
          id: orderId,
          status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
          ...(userId ? { userId } : {}),
        },
      },
      select: { id: true },
    });

    if (!orderItem) {
      return NextResponse.json({ error: 'Unauthorized — no paid order for this edition' }, { status: 403 });
    }

    // Resolve the file path relative to project root
    const filePath = edition.fileUrl;
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found on server' }, { status: 404 });
    }

    // Determine MIME type
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      epub: 'application/epub+zip',
      mobi: 'application/x-mobipocket-ebook',
      azw3: 'application/vnd.amazon.mobi8-ebook',
    };
    const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
    const contentType = mimeTypes[ext] ?? 'application/octet-stream';

    const fileName = `${edition.publication.slug}.${ext}`;

    // Read and return the file
    const fileBuffer = await Bun.file(filePath).arrayBuffer();

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(fileBuffer.byteLength),
      },
    });
  } catch (err) {
    console.error('[Download] Error:', err);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
