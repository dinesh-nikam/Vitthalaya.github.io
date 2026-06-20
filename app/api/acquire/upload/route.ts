import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';
import { preprocessImage, runOcr } from '@/src/lib/ocr';
import { submitToModeration } from '@/src/lib/moderation-workflow';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to contribute.' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // 2. Parse Multipart Form Data
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    let title = formData.get('title')?.toString().trim() || `OCR Manuscript ${new Date().toLocaleDateString('mr-IN')}`;

    // Sanitize title - remove any HTML/script injection
    title = title.replace(/[<>]/g, '').substring(0, 200);

    if (!file) {
      return NextResponse.json({ error: 'Image file "image" is required.' }, { status: 400 });
    }

    // 2a. Validate file type (only images allowed)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type "${file.type}". Allowed: ${allowedTypes.join(', ')}` },
        { status: 415 }
      );
    }

    // 2b. Validate file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const fileSize = file.size;
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (${Math.round(fileSize / 1024 / 1024)}MB). Maximum size: 10MB` },
        { status: 413 }
      );
    }

    // 2c. Validate file has content
    if (fileSize === 0) {
      return NextResponse.json({ error: 'Empty file uploaded.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 3. Image Preprocessing (binarize & deskew)
    const preprocessedBuffer = await preprocessImage(buffer);

    // 4. Save image locally
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch {
      // Ignore if dir already exists
    }

    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = join(uploadDir, filename);
    await writeFile(filePath, preprocessedBuffer);
    const imageUrl = `/uploads/${filename}`;

    // 5. Create database record
    const uploadRecord = await db.manuscriptUpload.create({
      data: {
        volunteerId: userId,
        imageUrl,
        status: 'pending',
      },
    });

    // 6. Execute OCR processing (Google Vision / PaddleOCR)
    const ocrJob = await db.ocrProcessingJob.create({
      data: {
        uploadId: uploadRecord.id,
        engine: process.env.OCR_ENGINE || 'paddleocr',
        status: 'processing',
      },
    });

    let ocrText = '';
    try {
      ocrText = await runOcr(preprocessedBuffer, ocrJob.engine);
      
      await db.ocrProcessingJob.update({
        where: { id: ocrJob.id },
        data: {
          status: 'succeeded',
          resultText: ocrText,
        },
      });

      await db.manuscriptUpload.update({
        where: { id: uploadRecord.id },
        data: {
          status: 'ocr_completed',
          rawOcrText: ocrText,
        },
      });
    } catch (ocrErr) {
      const errMsg = ocrErr instanceof Error ? ocrErr.message : String(ocrErr);
      await db.ocrProcessingJob.update({
        where: { id: ocrJob.id },
        data: {
          status: 'failed',
          errorLog: errMsg,
        },
      });
      return NextResponse.json({ error: 'OCR processing failed', log: errMsg }, { status: 500 });
    }

    // 7. Route the parsed text into the 3-Tier Moderation workflow
    const queueId = await submitToModeration('ocr', uploadRecord.id, title, ocrText);

    return NextResponse.json({
      success: true,
      uploadId: uploadRecord.id,
      imageUrl,
      ocrText,
      queueId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Manuscript upload API error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
