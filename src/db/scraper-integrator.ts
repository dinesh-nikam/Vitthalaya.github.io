/**
 * Scraper-to-Database Integrator
 * Takes scraped content and saves to database as UNREVIEWED (for editorial workflow)
 *
 * Per Phase 0 requirements:
 * - Scraped content is NOT auto-published
 * - All content requires editorial review before going live
 * - Only editor-approved content has reviewed: true
 */

import { db } from './client';
import * as fs from 'fs';
import * as path from 'path';

interface ScrapedComposition {
  title: string;
  marathiTitle?: string;
  slug: string;
  type: string;
  full_text: string;
  saint?: string;
  deity?: string;
  source_url: string;
}

/**
 * Import scraped compositions into database as unreviewed
 */
export async function importScrapedContent(
  jsonPath: string,
  options?: {
    autoApprove?: boolean; // If true, marks as reviewed (USE WITH CAUTION)
    defaultSaint?: string;
    defaultDeity?: string;
  }
): Promise<{ imported: number; skipped: number }> {
  const result = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const compositions = result.compositions || [];

  let imported = 0;
  let skipped = 0;

  for (const comp of compositions) {
    const scraped = comp as ScrapedComposition;

    // Check if already exists
    const existing = await db.composition.findUnique({
      where: { slug: scraped.slug },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Find or create saint/deity
    let saintId: string | undefined;
    let deityId: string | undefined;

    if (scraped.saint) {
      const saint = await db.saint.findFirst({
        where: { nameTranslit: scraped.saint },
      });
      saintId = saint?.id;
    }

    if (scraped.deity) {
      const deity = await db.deity.findFirst({
        where: { nameTranslit: scraped.deity },
      });
      deityId = deity?.id;
    }

    // Create composition as UNREVIEWED (requires editorial approval)
    await db.composition.create({
      data: {
        titleMarathi: scraped.marathiTitle || scraped.title,
        titleTranslit: scraped.title,
        slug: scraped.slug,
        type: mapToCompositionType(scraped.type),
        fullText: scraped.full_text,
        saintId,
        deityId,
        source: scraped.source_url,
        reviewed: options?.autoApprove ?? false, // Always false unless explicitly set
        audioLinks: "[]", // Scraped content should NOT include audio
      },
    });

    imported++;
  }

  console.log(`✓ Imported ${imported} compositions (unreviewed)`);
  console.log(`✓ Skipped ${skipped} duplicates`);

  return { imported, skipped };
}

function mapToCompositionType(type: string): 'ABHANG' | 'AARTI' | 'BHAJAN' | 'STOTRA' | 'HARIPATH' | 'GAULANI' | 'BHARUD' | 'KIRTAN' | 'NAMASMARAN' | 'POWADA' {
  const mapping: Record<string, 'ABHANG' | 'AARTI' | 'BHAJAN' | 'STOTRA' | 'HARIPATH' | 'GAULANI' | 'BHARUD' | 'KIRTAN' | 'NAMASMARAN' | 'POWADA'> = {
    abhang: 'ABHANG',
    aarti: 'AARTI',
    bhajan: 'BHAJAN',
    stotra: 'STOTRA',
    haripath: 'HARIPATH',
    gaulani: 'GAULANI',
    bharud: 'BHARUD',
    kirtan: 'KIRTAN',
  };

  return mapping[type.toLowerCase()] || 'ABHANG';
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const jsonPath = args[0];

  if (!jsonPath) {
    console.error('Usage: bun run src/db/scraper-integrator.ts <scraped-json-path>');
    process.exit(1);
  }

  importScrapedContent(jsonPath)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}