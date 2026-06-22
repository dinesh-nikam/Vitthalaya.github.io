/**
 * Digital Pandharpur — Content Classification API
 *
 * POST /api/acquire/classify
 *
 * Accepts extracted text from the upload pipeline and returns
 * AI-suggested classification (saint, type, deity, categories).
 *
 * Request body:
 *   { text: string, title?: string, fileId?: string }
 *
 * Response:
 *   { success: true, result: ClassificationResult }
 *   or { success: false, error: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';
import { classifyContent } from '@/src/ai-enrichment/classifier';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse input
    const body = await request.json();
    const text = (body.text ?? '').trim();
    const title = (body.title ?? '').trim() || undefined;
    const fileId = (body.fileId ?? '').trim() || undefined;

    if (!text || text.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Text must be at least 10 characters.' },
        { status: 400 }
      );
    }

    if (text.length > 100_000) {
      return NextResponse.json(
        { success: false, error: 'Text exceeds maximum length (100,000 characters).' },
        { status: 400 }
      );
    }

    // 3. Run classification
    const result = await classifyContent(text, title);

    // 4. Optionally persist to UploadedFile if fileId provided
    if (result.success && result.result && fileId) {
      try {
        await db.uploadedFile.update({
          where: { id: fileId },
          data: {
            detectedMetadata: JSON.stringify(result.result),
          },
        });
      } catch {
        // Non-critical — classification result still returned to client
        console.warn(`Failed to persist classification for file ${fileId}`);
      }
    }

    // 5. Return result
    return NextResponse.json(result, { status: result.success ? 200 : 502 });
  } catch (err) {
    console.error('Classification endpoint error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
