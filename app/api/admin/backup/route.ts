/**
 * GET /api/admin/backup — List recent backup records with status
 * POST /api/admin/backup — Record a new backup event (called by backup scripts)
 */

import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/src/lib/require-admin';

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const { db } = await import('@/src/db/client');

    const records = await db.backupRecord.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const summary = await db.backupRecord.groupBy({
      by: ['type', 'status'],
      _count: true,
      orderBy: { _count: { type: 'desc' } },
    });

    return NextResponse.json({
      records,
      summary,
    });
  } catch (error) {
    console.error('[Admin/Backup] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const { db } = await import('@/src/db/client');
    const body = await request.json();

    const { type, status, filename, checksumSha256, checksumValid, fileSizeBytes, durationMs, errorMessage, metadata } = body;

    if (!type || !status || !filename) {
      return NextResponse.json(
        { error: 'Missing required fields: type, status, filename' },
        { status: 400 },
      );
    }

    const record = await db.backupRecord.create({
      data: {
        type,
        status,
        filename,
        checksumSha256: checksumSha256 ?? null,
        checksumValid: checksumValid ?? null,
        fileSizeBytes: fileSizeBytes ?? null,
        durationMs: durationMs ?? null,
        errorMessage: errorMessage ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    console.error('[Admin/Backup] Record error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
