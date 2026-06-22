/**
 * Book Generator — top-level orchestrator that ties curation, structure
 * building, cover design, and format export into a single pipeline.
 *
 * Flow:
 *   1. Validate request
 *   2. Curate compositions based on criteria
 *   3. Build AI-driven structure (preface, sections, saint bios)
 *   4. Design cover
 *   5. Stage as BookPublication + BookEdition in DB
 *   6. Export to requested format(s)
 *   7. Return publication ID + download URLs
 */

import { db } from '../db/client';
import { curateBook } from './curator';
import { buildStructure } from './structure-builder';
import { exportBook } from './format-exporter';
import {
  type BookFormat,
  type BookStatus,
  type BookType,
  type CurationCriteria,
  type CurationType,
  type GenerateBookRequest,
  type GenerateBookResult,
  type LayoutConfig,
  type CoverDesign,
  DEFAULT_LAYOUTS,
} from './types';

// ── Config ────────────────────────────────────────────────────────────────────

const OUTPUT_DIR = 'public/books';
const DEFAULT_CURRENCY = 'INR';

// ── Slug Generation ───────────────────────────────────────────────────────────

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 80) || 'book';
}

// ── Default Cover Design ──────────────────────────────────────────────────────

function defaultCoverDesign(request: GenerateBookRequest): CoverDesign {
  return {
    titleMarathi: request.titleMarathi,
    titleEnglish: request.titleEnglish,
    subtitle: `संत वाङ्मय संग्रह | Devotional Collection`,
    palette: 'bhagwa',
    fontFamily: 'Noto Sans Devanagari',
    authorName: 'डिजिटल पंढरपूर',
    ...request.coverDesign,
  };
}

// ── Default Layout ────────────────────────────────────────────────────────────

function resolveLayout(bookType: BookType, custom?: Partial<LayoutConfig>): LayoutConfig {
  return { ...DEFAULT_LAYOUTS[bookType], ...custom };
}

// ── Main Generate Function ────────────────────────────────────────────────────

export async function generateBook(request: GenerateBookRequest): Promise<GenerateBookResult> {
  // 1. Curate compositions
  const selection = await curateBook(request.curationCriteria);

  if (selection.compositions.length === 0) {
    throw new Error('No compositions matched the curation criteria');
  }

  // 2. Build structure
  const structure = buildStructure(selection);

  // 3. Resolve cover + layout
  const coverDesign = defaultCoverDesign(request);
  const layout = resolveLayout(request.bookType, request.layoutConfig);
  const slug = toSlug(request.titleEnglish || request.titleMarathi);

  // 4. Create BookPublication record
  const publication = await db.bookPublication.create({
    data: {
      slug,
      titleMarathi: request.titleMarathi,
      titleEnglish: request.titleEnglish,
      subtitle: coverDesign.subtitle,
      bookType: request.bookType,
      curationType: request.curationType,
      curationCriteria: request.curationCriteria as any,
      status: 'DRAFT',
      creatorId: request.creatorId,
      isPublic: request.isPublic ?? false,
      totalCompositions: selection.compositions.length,
      totalSections: structure.sections.length,
      preface: structure.preface,
      afterword: structure.afterword,
      historicalContext: structure.historicalContext,
      saintBiographies: JSON.parse(structure.saintBiography ? JSON.stringify(structure.saintBiography) : 'null'),
    },
  });

  // 5. Create BookComposition links
  if (selection.compositions.length > 0) {
    await db.bookComposition.createMany({
      data: selection.compositions.map((comp, i) => ({
        bookPublicationId: publication.id,
        compositionId: comp.compositionId,
        sortOrder: i,
        score: comp.score,
        sectionType: comp.type,
      })),
    });
  }

  // 6. Export editions
  const editions: Array<{ format: BookFormat; fileUrl?: string; pageCount?: number }> = [];
  const targetFormats: BookFormat[] = ['DIGITAL_PDF'];

  for (const format of targetFormats) {
    const ext = format === 'DIGITAL_PDF' ? 'pdf' : 'epub';
    const filePath = `${OUTPUT_DIR}/${slug}/${slug}.${ext}`;

    try {
      const result = await exportBook(format, selection, structure, coverDesign, layout, filePath);
      editions.push({ format, fileUrl: filePath, pageCount: result.pageCount });
    } catch (err) {
      console.error(`Failed to export ${format}:`, err);
      editions.push({ format, pageCount: 0 });
    }
  }

  // 7. Create BookEdition records + update publication status
  const firstPageCount = editions[0]?.pageCount ?? 0;

  await db.bookEdition.createMany({
    data: editions.map((ed) => ({
      bookPublicationId: publication.id,
      format: ed.format,
      fileUrl: ed.fileUrl,
      pageCount: ed.pageCount ?? 0,
      isPublished: false,
    })),
  });

  await db.bookPublication.update({
    where: { id: publication.id },
    data: {
      status: editions.some((e) => e.fileUrl) ? ('READY' as BookStatus) : ('DRAFT' as BookStatus),
      totalPages: firstPageCount,
    },
  });

  return {
    publicationId: publication.id,
    slug,
    status: 'READY',
    editions,
    stats: {
      totalCompositions: selection.compositions.length,
      pageCount: firstPageCount,
      sections: structure.sections.length,
    },
  };
}

// ── Get Book by Slug ──────────────────────────────────────────────────────────

export async function getBookBySlug(slug: string) {
  return db.bookPublication.findUnique({
    where: { slug },
    include: {
      editions: true,
      compositions: {
        include: { composition: { select: { titleMarathi: true, type: true } } },
        orderBy: { sortOrder: 'asc' },
      },
      creator: { select: { id: true, name: true } },
      _count: { select: { orders: true } },
    },
  });
}

// ── List Books ────────────────────────────────────────────────────────────────

export async function listBooks(limit = 50, offset = 0) {
  return db.bookPublication.findMany({
    where: { isPublic: true, status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      slug: true,
      titleMarathi: true,
      titleEnglish: true,
      bookType: true,
      status: true,
      totalCompositions: true,
      totalPages: true,
      createdAt: true,
      editions: { select: { format: true, isPublished: true, price: true } },
      _count: { select: { orders: true } },
    },
  });
}
