/**
 * Digital Pandharpur — Universal Upload Controller
 *
 * Accepts all supported formats (audio, images, PDFs, documents, YouTube URLs),
 * verifies authentication and per-user rate limits, then delegates processing
 * to AcquireUploadService.
 *
 * POST /api/acquire/upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { isYouTubeUrl } from '@/src/lib/extractors';
import { type RightsInput } from '@/src/lib/rights';
import {
  checkUserRateLimit,
  rateLimitExceededResponse,
  addRateLimitHeaders,
} from '@/src/lib/api-auth';
import { ApiErrors, errorResponse } from '@/src/lib/api-response';
import { acquireUploadService } from '@/src/services/acquire-upload.service';

const UPLOAD_RATE_LIMIT_PER_MINUTE = 10;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return ApiErrors.UNAUTHORIZED('Unauthorized. Please sign in to contribute.');
    }
    const userId = (session.user as { id: string }).id;

    // 2. Check per-user upload rate limit before consuming body
    const rateLimit = checkUserRateLimit(userId, UPLOAD_RATE_LIMIT_PER_MINUTE, 'upload');
    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit.resetAt);
    }
    const withRateHeaders = (res: NextResponse) =>
      addRateLimitHeaders(res, rateLimit.remaining, rateLimit.resetAt);

    // 3. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const url = formData.get('url')?.toString().trim() || '';
    const customTitle = formData.get('title')?.toString().trim() || '';
    const isRecording = formData.get('isRecording')?.toString() === 'true';

    if (!file && !url) {
      return withRateHeaders(
        ApiErrors.BAD_REQUEST('Please provide a file or a YouTube URL.')
      );
    }

    // 4. Delegate to AcquireUploadService
    if (url && isYouTubeUrl(url)) {
      const result = await acquireUploadService.processYouTubeUpload({
        url,
        customTitle,
        userId,
      });
      return withRateHeaders(NextResponse.json(result.body, { status: result.status }));
    }

    if (!file) {
      return withRateHeaders(
        ApiErrors.BAD_REQUEST('No file provided. Attach a file or provide a YouTube URL.')
      );
    }

    const rightsInput: RightsInput = {
      declaredStatus: formData.get('rightsStatus')?.toString() ?? null,
      consentGranted: formData.get('consentGranted')?.toString() === 'true',
      publicationPermission: formData.get('publicationPermission')?.toString() === 'true',
      attribution: formData.get('attribution')?.toString() ?? null,
      source: 'record',
    };

    const result = await acquireUploadService.processFileUpload({
      file,
      customTitle,
      userId,
      isRecording,
      rightsInput,
    });

    return withRateHeaders(NextResponse.json(result.body, { status: result.status }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Upload API Controller] Error:', err);
    return errorResponse(message, 500, { code: 'INTERNAL_ERROR' });
  }
}
