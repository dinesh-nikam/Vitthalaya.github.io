/**
 * Digital Pandharpur — My Uploads / Recordings List API (owner-gated)
 *
 * GET /api/acquire/uploads
 *
 * Returns the authenticated user's uploads (audio/recordings first) with
 * processing status, so /record can show a personal library. Owners only —
 * no cross-user access. Paginated via ?page=&limit= (default page=1,
 * limit=50, capped at 50) with a standard `pagination` envelope alongside
 * the `uploads` array (additive — older clients reading `uploads` keep
 * working).
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';
import {
  parsePagination,
  buildPagination,
  ApiErrors,
} from '@/src/lib/api-response';

export async function GET(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  if (!userId) {
    return ApiErrors.UNAUTHORIZED();
  }

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);

  const [total, uploads] = await Promise.all([
    db.uploadedFile.count({ where: { userId } }),
    db.uploadedFile.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        originalName: true,
        format: true,
        mimeType: true,
        sizeBytes: true,
        processingStatus: true,
        extractedText: true,
        extractionConfidence: true,
        extractedMetadata: true,
        createdAt: true,
      },
    }),
  ]);

  // Strip long transcripts to a preview for the list view.
  const items = uploads.map((upload) => {
    let transcriptionMethod: string | null = null;
    if (upload.extractedMetadata) {
      try {
        const metadata = JSON.parse(upload.extractedMetadata);
        if (typeof metadata.transcriptionMethod === 'string') {
          transcriptionMethod = metadata.transcriptionMethod;
        }
      } catch {
        // best-effort
      }
    }
    return {
      id: upload.id,
      originalName: upload.originalName,
      format: upload.format,
      processingStatus: upload.processingStatus,
      sizeBytes: upload.sizeBytes,
      extractionConfidence: upload.extractionConfidence,
      transcriptionMethod,
      transcriptPreview: upload.extractedText ? upload.extractedText.slice(0, 120) : null,
      createdAt: upload.createdAt,
    };
  });

  return NextResponse.json({
    uploads: items,
    pagination: buildPagination(page, limit, total),
  });
}
