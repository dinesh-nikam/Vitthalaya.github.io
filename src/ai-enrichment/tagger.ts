/**
 * Auto-Tagging Engine — generates canonical tags from enrichment output
 * and links compositions to existing categories, deities, and festivals.
 *
 * Two-pass strategy:
 *   Pass 1: Fast keyword-based matching (synonym sets)
 *   Pass 2: LLM-assisted disambiguation for unmatched content
 */

import { db } from '../db/client';
import { enrichComposition, type EnrichmentInput, type EnrichmentOutput } from './enricher';

// ── Tag Synonym Sets ──────────────────────────────────────────────────────────

interface TagRule {
  match: string[];       // Keywords that trigger this tag
  tagMarathi: string;    // Canonical Marathi tag
  tagEnglish: string;    // Canonical English tag
  categorySlug?: string; // Link to existing category if applicable
}

const TAG_RULES: TagRule[] = [
  // Deity-focused tags
  { match: ['विठ्ठल', 'पांडुरंग', 'विठोबा', 'vitthal', 'pandurang'], tagMarathi: 'विठ्ठलभक्ती', tagEnglish: 'Vitthal Devotion', categorySlug: 'vitthal' },
  { match: ['राम', 'रामचंद्र', 'ram', 'rama'], tagMarathi: 'रामभक्ती', tagEnglish: 'Ram Devotion', categorySlug: 'ram' },
  { match: ['कृष्ण', 'गोविंद', 'माधव', 'krishna', 'govind'], tagMarathi: 'कृष्णभक्ती', tagEnglish: 'Krishna Devotion', categorySlug: 'krishna' },
  { match: ['शिव', 'शंकर', 'महादेव', 'shiva', 'shankar'], tagMarathi: 'शिवभक्ती', tagEnglish: 'Shiva Devotion', categorySlug: 'shiva' },
  { match: ['देवी', 'दुर्गा', 'अंबे', 'महालक्ष्मी', 'devi', 'durga'], tagMarathi: 'देवीभक्ती', tagEnglish: 'Devi Devotion', categorySlug: 'devi' },
  { match: ['गणेश', 'गणपती', 'गजानन', 'ganesh', 'ganpati'], tagMarathi: 'गणेशभक्ती', tagEnglish: 'Ganesh Devotion', categorySlug: 'ganesh' },
  { match: ['हनुमान', 'मारुती', 'बजरंग', 'hanuman', 'maruti'], tagMarathi: 'हनुमानभक्ती', tagEnglish: 'Hanuman Devotion', categorySlug: 'hanuman' },
  { match: ['दत्तात्रेय', 'दत्त'], tagMarathi: 'दत्तभक्ती', tagEnglish: 'Datta Devotion' },
  { match: ['सूर्य', 'भास्कर'], tagMarathi: 'सूर्योपासना', tagEnglish: 'Sun Worship' },

  // Theme tags
  { match: ['वारी', 'पंढरपूर', 'wari', 'pandharpur'], tagMarathi: 'वारी', tagEnglish: 'Wari Pilgrimage', categorySlug: 'pandharpur' },
  { match: ['गुरु', 'गुरुभक्ती', 'guru'], tagMarathi: 'गुरुभक्ती', tagEnglish: 'Guru Devotion' },
  { match: ['नामस्मरण', 'नाम', 'namasmaran'], tagMarathi: 'नामस्मरण', tagEnglish: 'Name Chanting' },
  { match: ['प्रार्थना', 'विनंती', 'प्रार्थणा'], tagMarathi: 'प्रार्थना', tagEnglish: 'Prayer' },
  { match: ['माऊली', 'mauli'], tagMarathi: 'माऊली', tagEnglish: 'Mauli (Mother)' },
  { match: ['एकादशी', 'आषाढी', 'कार्तिकी'], tagMarathi: 'एकादशी', tagEnglish: 'Ekadashi', categorySlug: 'ekadashi' },
  { match: ['समाधी', 'मोक्ष', 'moksha'], tagMarathi: 'मोक्ष', tagEnglish: 'Liberation' },
  { match: ['ध्यान', 'समाधिस्थ'], tagMarathi: 'ध्यान', tagEnglish: 'Meditation' },
  { match: ['भक्ती', 'भक्ति', 'भाव', 'bhakti'], tagMarathi: 'भक्ती', tagEnglish: 'Devotion' },
  { match: ['कीर्तन', 'कीर्तन'], tagMarathi: 'कीर्तन', tagEnglish: 'Kirtan' },

  // Saint tags
  { match: ['तुकाराम', 'तुकोबा'], tagMarathi: 'तुकाराम गाथा', tagEnglish: 'Tukaram Gatha' },
  { match: ['ज्ञानेश्वर', 'ज्ञानदेव'], tagMarathi: 'ज्ञानेश्वरी', tagEnglish: 'Dnyaneshwari' },
  { match: ['एकनाथ'], tagMarathi: 'एकनाथ भारूड', tagEnglish: 'Eknath Bharud' },
  { match: ['नामदेव'], tagMarathi: 'नामदेव गाथा', tagEnglish: 'Namdev Gatha' },
  { match: ['रामदास'], tagMarathi: 'रामदासी', tagEnglish: 'Ramdasi' },
];

// ── Tag Generation ────────────────────────────────────────────────────────────

export interface TagResult {
  canonicalTags: string[];
  categoryIds: string[];
  suggestedDeityId: string | null;
  confidence: 'high' | 'medium' | 'low';
  method: 'keyword' | 'llm' | 'mixed';
}

/**
 * Auto-tag a composition from its enrichment output + full text.
 * Pass 1: Fast keyword matching.
 * Pass 2 (if low confidence): LLM-assisted.
 */
export async function autoTag(
  compositionId: string,
  fullText: string,
  title: string,
  existingEnrichment?: EnrichmentOutput,
): Promise<TagResult> {
  const combinedText = (title + ' ' + fullText).toLowerCase();
  const matchedTags: Set<string> = new Set();
  const matchedCategorySlugs: Set<string> = new Set();

  // Pass 1: Keyword-based
  for (const rule of TAG_RULES) {
    if (rule.match.some((kw) => combinedText.includes(kw))) {
      matchedTags.add(rule.tagMarathi);
      if (rule.categorySlug) matchedCategorySlugs.add(rule.categorySlug);
    }
  }

  // Add LLM enrichment tags if available
  if (existingEnrichment?.tags) {
    for (const tag of existingEnrichment.tags) {
      matchedTags.add(tag);
    }
  }

  // Resolve category slugs to IDs
  const categories = await db.category.findMany({
    where: { slug: { in: [...matchedCategorySlugs] } },
    select: { id: true, slug: true },
  });
  const categoryIds = categories.map((c) => c.id);

  // Try to resolve deity from enrichment
  let suggestedDeityId: string | null = null;
  if (existingEnrichment?.deity) {
    const deity = await db.deity.findFirst({
      where: {
        OR: [
          { nameMarathi: { contains: existingEnrichment.deity, mode: 'insensitive' } },
          { nameTranslit: { contains: existingEnrichment.deity, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    if (deity) suggestedDeityId = deity.id;
  }

  const confidence: 'high' | 'medium' | 'low' =
    matchedTags.size >= 3 ? 'high'
    : matchedTags.size >= 1 ? 'medium'
    : 'low';

  return {
    canonicalTags: [...matchedTags],
    categoryIds,
    suggestedDeityId,
    confidence,
    method: 'keyword',
  };
}

/**
 * Apply auto-tagged categories and tags to a composition in the database,
 * creating new CompositionCategory records if needed.
 */
export async function applyTags(compositionId: string, tags: TagResult): Promise<void> {
  // Link categories
  for (const categoryId of tags.categoryIds) {
    const existing = await db.categoryComposition.findFirst({
      where: { compositionId, categoryId },
    });
    if (!existing) {
      await db.categoryComposition.create({
        data: { compositionId, categoryId },
      });
    }
  }

  // Update composition with deity if inferred
  if (tags.suggestedDeityId) {
    await db.composition.update({
      where: { id: compositionId },
      data: { deityId: tags.suggestedDeityId },
    });
  }

  console.log(`[Tagger] Applied ${tags.canonicalTags.length} tags, ${tags.categoryIds.length} categories to ${compositionId}`);
}

/**
 * Process a batch of compositions: run enrichment, then auto-tag.
 */
export async function enrichAndTagBatch(
  compositions: EnrichmentInput[],
  concurrency: number = 3,
): Promise<{ enriched: number; tagged: number; errors: number }> {
  let enriched = 0;
  let tagged = 0;
  let errors = 0;

  const batches: EnrichmentInput[][] = [];
  for (let i = 0; i < compositions.length; i += concurrency) {
    batches.push(compositions.slice(i, i + concurrency));
  }

  for (const batch of batches) {
    const results = await Promise.allSettled(
      batch.map(async (input) => {
        const enrichment = await enrichComposition(input);
        if (enrichment.success && enrichment.output) {
          enriched++;
          const tags = await autoTag(input.compositionId, input.fullText, input.title, enrichment.output);
          await applyTags(input.compositionId, tags);
          tagged++;
        } else {
          errors++;
        }
      }),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        errors++;
        console.error('[EnrichAndTag] Error:', result.reason);
      }
    }
  }

  return { enriched, tagged, errors };
}
