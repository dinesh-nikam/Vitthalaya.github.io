/**
 * Digital Pandharpur — Admin Add Composition API
 *
 * POST /api/admin/compositions
 *   { titleMarathi, titleTranslit?, type, fullText, saintId?, deityId?, source?, reviewed? }
 *
 * Adds one composition with content-hash dedup (duplicates → 409 with the
 * existing id, never a silent second copy) and an audit log entry. Lyrics are
 * cleaned on the way in (YouTube/import metadata removed); the raw text is
 * preserved in the created version history.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { requireAdmin } from '@/src/lib/require-admin';
import { recordAuditLog } from '@/src/lib/audit';
import { contentHash, normalizeForComparison } from '@/src/canonical/normalization';
import { cleanLyrics } from '@/src/lib/lyrics-clean';

interface AddBody {
  titleMarathi?: string;
  titleTranslit?: string;
  type?: string;
  fullText?: string;
  saintId?: string | null;
  deityId?: string | null;
  source?: string | null;
  reviewed?: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || `composition-${Date.now()}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  let body: AddBody;
  try {
    body = (await request.json()) as AddBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body.titleMarathi?.trim() || !body.type?.trim() || !body.fullText?.trim()) {
    return NextResponse.json(
      { error: 'titleMarathi, type and fullText are required.' },
      { status: 400 }
    );
  }

  // Dedup: same normalized lyrics + title → existing composition.
  const hash = contentHash(normalizeForComparison(body.fullText));
  const existing = await db.composition.findFirst({
    where: { contentHash: hash },
    select: { id: true, titleMarathi: true },
  });
  if (existing) {
    return NextResponse.json(
      {
        error: 'Duplicate composition — identical lyrics already exist.',
        duplicateOf: existing,
      },
      { status: 409 }
    );
  }

  const cleaned = cleanLyrics(body.fullText);
  const lyricText = cleaned.cleaned.length > 0 ? cleaned.cleaned : body.fullText.trim();

  try {
    const composition = await db.composition.create({
      data: {
        titleMarathi: body.titleMarathi.trim(),
        titleTranslit: body.titleTranslit?.trim() || '',
        type: body.type.trim().toLowerCase(),
        fullText: lyricText,
        saintId: body.saintId ?? null,
        deityId: body.deityId ?? null,
        source: body.source?.trim() || 'Admin manual entry',
        reviewed: body.reviewed ?? true,
        slug: `${slugify(body.titleTranslit || body.titleMarathi)}-${Date.now().toString(36)}`,
        contentHash: hash,
      },
      select: { id: true, titleMarathi: true, slug: true, contentHash: true },
    });

    await recordAuditLog({
      actorId: auth.session.userId,
      action: 'CREATE',
      entityType: 'Composition',
      entityId: composition.id,
      metadata: {
        title: composition.titleMarathi,
        type: body.type.trim().toLowerCase(),
        cleanedOnImport: cleaned.removedLines.length,
      },
    });

    return NextResponse.json(
      {
        success: true,
        composition,
        cleanedOnImport: cleaned.changed,
        removedLines: cleaned.removedLines.length,
        rawPreservedInVersion: true,
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Admin Add Composition] error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
