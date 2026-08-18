import { NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { preprocessImage, runOcr } from '@/src/lib/ocr';
import { extractDevanagari, normalizeForComparison } from '@/src/canonical/normalization';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const uploadId = formData.get('uploadId') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No manuscript file uploaded' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Preprocess manuscript image (rotate, greyscale, binarize)
    const preprocessedBuffer = await preprocessImage(buffer);

    // 2. Execute OCR text extraction
    let rawOcrText = '';
    try {
      rawOcrText = await runOcr(preprocessedBuffer, 'google_vision');
    } catch (err: any) {
      // Never fabricate OCR text. Record the failure honestly so the upload
      // can be retried instead of publishing placeholder content as "completed".
      const message = err?.message || String(err);
      if (uploadId) {
        await db.manuscriptUpload.update({
          where: { id: uploadId },
          data: { status: 'failed' },
        });
      }
      console.error('OCR processing failed:', message);
      return NextResponse.json(
        { success: false, error: `OCR_PROCESSING_FAILED: ${message}` },
        { status: 502 }
      );
    }

    // 3. Extract and normalize Devanagari text
    const devanagariText = extractDevanagari(rawOcrText);
    const normalizedText = normalizeForComparison(devanagariText || rawOcrText);

    // 4. Save record if uploadId provided
    if (uploadId) {
      await db.manuscriptUpload.update({
        where: { id: uploadId },
        data: {
          status: 'ocr_completed',
          rawOcrText: devanagariText || rawOcrText,
        },
      });
    }

    return NextResponse.json({
      success: true,
      filename: file.name,
      sizeBytes: buffer.length,
      rawOcrText,
      devanagariText,
      normalizedText,
    });
  } catch (error: any) {
    console.error('OCR API Processing error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal OCR Error' },
      { status: 500 }
    );
  }
}
