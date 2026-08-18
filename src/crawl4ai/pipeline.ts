/**
 * Vitthalaya — Full Acquisition Pipeline
 *
 * End-to-end pipeline that processes a single content source:
 *   1. Crawl → 2. Extract → 3. Segment → 4. Normalize →
 *   5. Deduplicate → 6. Score Quality → 7. Enrich Metadata →
 *   8. Submit to Moderation → 9. Publish (if quality is high) →
 *   10. Index in Search
 *
 * Each step is independent and can be run in isolation.
 */

import { db } from '../db/client';
import { SourceRegistry } from '../discovery/source-registry';
import type { CrawlerEngine } from './types';
import { ContentExtractor } from './content-extractor';
import { ContentSegmenter } from './content-segmenter';
import { MetadataExtractor } from './metadata-extractor';
import { QualityScorer } from './quality-scorer';
import { contentHash, normalizeForDisplay, normalizeCompositionType } from '../canonical/normalization';
import type { ContentSource } from '../discovery/types';
import type { ExtractedComposition, ContentQualityReport } from './types';

export interface PipelineResult {
  sourceId: string;
  sourceName: string;
  status: 'success' | 'failed' | 'skipped';
  urlsCrawled: number;
  compositionsExtracted: number;
  duplicatesFound: number;
  sentToModeration: number;
  autoApproved: number;
  errors: string[];
  durationMs: number;
  reports?: ContentQualityReport[];
  compositions?: ExtractedComposition[];
}

export interface PipelineConfig {
  dryRun: boolean;
  maxCompositionsPerSource: number;
  autoApproveThreshold: number;
  enableEnrichment: boolean;
}

const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  dryRun: false,
  maxCompositionsPerSource: 500,
  autoApproveThreshold: 0.70, // Standard or above auto-approves
  enableEnrichment: true,
};

export class AcquisitionPipeline {
  private config: PipelineConfig;

  constructor(
    private engine: CrawlerEngine,
    private extractor: ContentExtractor,
    private segmenter: ContentSegmenter,
    private metadataExtractor: MetadataExtractor,
    private qualityScorer: QualityScorer,
    config?: Partial<PipelineConfig>,
  ) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
  }

  /**
   * Run the full pipeline for a single content source.
   */
  async runForSource(source: ContentSource): Promise<PipelineResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const sourceId = source.id;
    const sourceName = source.name;

    console.log(`[Pipeline] Processing source: ${sourceName} (${source.url})`);

    try {
      // ─── Step 1: Crawl ───────────────────────────────────
      console.log(`  [1/6] Crawling: ${source.url}`);
      const crawlResult = await this.engine.crawl(source.url, {
        strategy: (source.scraperType as any) ?? 'auto',
        allowedPaths: source.allowedPaths ? (source.allowedPaths as any as string[]) : undefined,
        excludedPaths: source.excludedPaths ? (source.excludedPaths as any as string[]) : undefined,
        mode: 'full',
      });

      if (crawlResult.status !== 'completed' || !crawlResult.content) {
        await SourceRegistry.recordError(sourceId, crawlResult.error?.message ?? 'Crawl failed');
        return {
          sourceId,
          sourceName,
          status: 'failed',
          urlsCrawled: 1,
          compositionsExtracted: 0,
          duplicatesFound: 0,
          sentToModeration: 0,
          autoApproved: 0,
          errors: [crawlResult.error?.message ?? 'Unknown crawl error'],
          durationMs: Date.now() - startTime,
        };
      }

      // ─── Step 2: Extract Compositions ────────────────────
      console.log(`  [2/6] Extracting compositions`);
      const extracted = await this.extractor.extract(crawlResult);

      if (extracted.length === 0) {
        console.log(`  → No compositions found on page`);
        await SourceRegistry.recordError(sourceId, 'No compositions extracted');
        return {
          sourceId,
          sourceName,
          status: 'failed',
          urlsCrawled: 1,
          compositionsExtracted: 0,
          duplicatesFound: 0,
          sentToModeration: 0,
          autoApproved: 0,
          errors: ['No compositions extracted'],
          durationMs: Date.now() - startTime,
        };
      }

      // ─── Step 3: Segment multi-composition pages ─────────
      console.log(`  [3/6] Segmenting (${extracted.length} raw extractions)`);
      const templates = this.extractor.getTemplates();
      const templateMap = new Map(templates.map((t) => [t.name, t]));
      const segmented = this.segmenter.segmentBatch(extracted, templateMap);

      // Cap at max
      const compositions = segmented.slice(0, this.config.maxCompositionsPerSource);
      console.log(`  → ${compositions.length} compositions after segmentation`);

      // ─── Step 4: Normalize & Deduplicate ─────────────────
      console.log(`  [4/6] Normalizing & deduplicating`);
      const newCompositions: ExtractedComposition[] = [];
      let duplicatesFound = 0;

      for (const comp of compositions) {
        // Normalize text
        comp.fullText = normalizeForDisplay(comp.fullText);
        const hash = contentHash(comp.fullText);

        // Check for existing composition by content hash
        const existing = await db.composition.findFirst({
          where: { contentHash: hash },
        });

        if (existing) {
          comp.existingCompositionId = existing.id;
          duplicatesFound++;
          continue;
        }

        newCompositions.push(comp);
      }

      console.log(`  → ${newCompositions.length} new, ${duplicatesFound} duplicates skipped`);

      if (newCompositions.length === 0) {
        await SourceRegistry.recordSuccess(sourceId, 0);
        return {
          sourceId,
          sourceName,
          status: 'success',
          urlsCrawled: 1,
          compositionsExtracted: 0,
          duplicatesFound,
          sentToModeration: 0,
          autoApproved: 0,
          errors: [],
          durationMs: Date.now() - startTime,
        };
      }

      // ─── Step 5: Score Quality ───────────────────────────
      console.log(`  [5/6] Scoring quality`);
      const reports = this.qualityScorer.scoreBatch(newCompositions, source.trustScore);

      // ─── Step 6: Persist, Moderate, Publish ──────────────
      console.log(`  [6/6] Persisting to database`);
      let sentToModeration = 0;
      let autoApproved = 0;

      if (!this.config.dryRun) {
        for (let i = 0; i < newCompositions.length; i++) {
          const comp = newCompositions[i];
          const report = reports[i];

          try {
            // Extract local metadata (saint, deity, type)
            const metadata = this.metadataExtractor.extractLocal(comp);

            // Generate slug
            const slug = this.generateSlug(comp);

            // Create composition record (always unreviewed)
            const savedComp = await db.composition.create({
              data: {
                titleMarathi: comp.titleMarathi,
                titleTranslit: comp.titleTranslit ?? '',
                slug,
                type: normalizeCompositionType(metadata.type),
                fullText: comp.fullText,
                meaning: comp.meaning ?? null,
                region: comp.region ?? null,
                source: comp.sourceAttribution,
                reviewed: report.score.overall >= 0.85, // Auto-approve only premium
                contentHash: contentHash(comp.fullText),
                audioLinks: '[]',
              },
            });

            // Enqueue for AI enrichment
            if (this.config.enableEnrichment) {
              await this.metadataExtractor.enqueueAIEnrichment(savedComp.id);
            }

            if (report.score.overall >= this.config.autoApproveThreshold) {
              autoApproved++;

              // Update source record for verified content
              if (report.score.overall >= 0.85) {
                await db.composition.update({
                  where: { id: savedComp.id },
                  data: { reviewed: true },
                });

                // Index in search
                await db.searchSyncJob.create({
                  data: {
                    compositionId: savedComp.id,
                    action: 'upsert',
                    status: 'pending',
                  },
                });
              }
            } else {
              sentToModeration++;

              // Submit to moderation queue
              await db.moderationQueue.create({
                data: {
                  sourceType: 'suggestion',
                  sourceId: savedComp.id,
                  draftTitle: comp.titleMarathi,
                  draftText: comp.fullText,
                  draftMeaning: comp.meaning ?? null,
                  tier: report.score.overall >= 0.5 ? 1 : 2,
                  status: 'pending',
                },
              });
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`Failed to persist composition "${comp.titleMarathi}": ${msg}`);
          }
        }
      }

      // Record success in source registry
      if (!this.config.dryRun) {
        await SourceRegistry.recordSuccess(sourceId, autoApproved);
      }

      console.log(`  ✅ Pipeline complete:`);
      console.log(`     ${autoApproved} auto-approved, ${sentToModeration} sent to moderation`);

      return {
        sourceId,
        sourceName,
        status: 'success',
        urlsCrawled: 1,
        compositionsExtracted: newCompositions.length,
        duplicatesFound,
        sentToModeration,
        autoApproved,
        errors,
        durationMs: Date.now() - startTime,
        reports,
        compositions: newCompositions,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Pipeline] Fatal error for ${sourceName}:`, msg);
      await SourceRegistry.recordError(sourceId, msg);

      return {
        sourceId,
        sourceName,
        status: 'failed',
        urlsCrawled: 0,
        compositionsExtracted: 0,
        duplicatesFound: 0,
        sentToModeration: 0,
        autoApproved: 0,
        errors: [msg],
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Run the pipeline for pre-parsed compositions (skips crawl + extract steps).
   *
   * Useful for OCR text downloads, API imports, and other non-web sources
   * where compositions are already extracted. Runs steps 3-10:
   *   Segment → Dedup → Score → Metadata → Persist → Moderate → Index → Enrich
   */
  async runForExtractedCompositions(
    compositions: ExtractedComposition[],
    sourceName: string,
    options?: {
      sourceId?: string;
      sourceUrl?: string;
      sourceTrustScore?: number;
      dryRun?: boolean;
    },
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const dryRun = options?.dryRun ?? this.config.dryRun;
    const sourceTrustScore = options?.sourceTrustScore ?? 0.7;

    console.log(`[Pipeline] Processing extracted compositions for: ${sourceName}`);

    try {
      // ─── Step 3: Segment (pass-through — already segmented) ──
      console.log(`  [3/6] Received ${compositions.length} pre-segmented compositions`);
      const capped = compositions.slice(0, this.config.maxCompositionsPerSource);
      const toProcess = capped;
      console.log(`  → ${toProcess.length} compositions to process`);

      if (toProcess.length === 0) {
        return {
          sourceId: options?.sourceId ?? '',
          sourceName,
          status: 'success',
          urlsCrawled: 0,
          compositionsExtracted: 0,
          duplicatesFound: 0,
          sentToModeration: 0,
          autoApproved: 0,
          errors: [],
          durationMs: Date.now() - startTime,
        };
      }

      // ─── Step 4: Normalize & Deduplicate ─────────────────────
      console.log(`  [4/6] Normalizing & deduplicating`);
      const newCompositions: ExtractedComposition[] = [];
      let duplicatesFound = 0;

      for (const comp of toProcess) {
        comp.fullText = normalizeForDisplay(comp.fullText);
        const hash = contentHash(comp.fullText);

        const existing = await db.composition.findFirst({
          where: { contentHash: hash },
        });

        if (existing) {
          comp.existingCompositionId = existing.id;
          duplicatesFound++;
          continue;
        }

        newCompositions.push(comp);
      }

      console.log(`  → ${newCompositions.length} new, ${duplicatesFound} duplicates skipped`);

      if (newCompositions.length === 0) {
        if (options?.sourceId) {
          await SourceRegistry.recordSuccess(options.sourceId, 0);
        }
        return {
          sourceId: options?.sourceId ?? '',
          sourceName,
          status: 'success',
          urlsCrawled: 0,
          compositionsExtracted: 0,
          duplicatesFound,
          sentToModeration: 0,
          autoApproved: 0,
          errors: [],
          durationMs: Date.now() - startTime,
        };
      }

      // ─── Step 5: Score Quality ───────────────────────────────
      console.log(`  [5/6] Scoring quality`);
      const reports = this.qualityScorer.scoreBatch(newCompositions, sourceTrustScore);

      // ─── Step 6: Persist, Moderate, Publish ──────────────────
      console.log(`  [6/6] Persisting to database`);
      let sentToModeration = 0;
      let autoApproved = 0;

      if (!dryRun) {
        for (let i = 0; i < newCompositions.length; i++) {
          const comp = newCompositions[i];
          const report = reports[i];

          try {
            const metadata = this.metadataExtractor.extractLocal(comp);
            const slug = this.generateSlug(comp);

            const savedComp = await db.composition.create({
              data: {
                titleMarathi: comp.titleMarathi,
                titleTranslit: comp.titleTranslit ?? '',
                slug,
                type: normalizeCompositionType(metadata.type),
                fullText: comp.fullText,
                meaning: comp.meaning ?? null,
                region: comp.region ?? null,
                source: comp.sourceAttribution,
                reviewed: report.score.overall >= 0.85,
                contentHash: contentHash(comp.fullText),
                audioLinks: '[]',
              },
            });

            // Link saint if detected by metadata extractor or provided
            if (metadata.saintNameTranslit) {
              const saintRecord = await db.saint.findFirst({
                where: { nameTranslit: metadata.saintNameTranslit },
              });
              if (saintRecord) {
                await db.composition.update({
                  where: { id: savedComp.id },
                  data: { saintId: saintRecord.id },
                });
              }
            }

            if (this.config.enableEnrichment) {
              await this.metadataExtractor.enqueueAIEnrichment(savedComp.id);
            }

            if (report.score.overall >= this.config.autoApproveThreshold) {
              autoApproved++;

              if (report.score.overall >= 0.85) {
                await db.composition.update({
                  where: { id: savedComp.id },
                  data: { reviewed: true },
                });

                await db.searchSyncJob.create({
                  data: {
                    compositionId: savedComp.id,
                    action: 'upsert',
                    status: 'pending',
                  },
                });
              }
            } else {
              sentToModeration++;

              await db.moderationQueue.create({
                data: {
                  sourceType: 'suggestion',
                  sourceId: savedComp.id,
                  draftTitle: comp.titleMarathi,
                  draftText: comp.fullText,
                  draftMeaning: comp.meaning ?? null,
                  tier: report.score.overall >= 0.5 ? 1 : 2,
                  status: 'pending',
                },
              });
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`Failed to persist composition "${comp.titleMarathi}": ${msg}`);
          }
        }
      }

      if (!dryRun && options?.sourceId) {
        await SourceRegistry.recordSuccess(options.sourceId, autoApproved);
      }

      console.log(`  ✅ Pipeline complete:`);
      console.log(`     ${autoApproved} auto-approved, ${sentToModeration} sent to moderation`);

      return {
        sourceId: options?.sourceId ?? '',
        sourceName,
        status: 'success',
        urlsCrawled: 0,
        compositionsExtracted: newCompositions.length,
        duplicatesFound,
        sentToModeration,
        autoApproved,
        errors,
        durationMs: Date.now() - startTime,
        reports,
        compositions: newCompositions,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Pipeline] Fatal error for ${sourceName}:`, msg);
      if (options?.sourceId) {
        await SourceRegistry.recordError(options.sourceId, msg);
      }

      return {
        sourceId: options?.sourceId ?? '',
        sourceName,
        status: 'failed',
        urlsCrawled: 0,
        compositionsExtracted: 0,
        duplicatesFound: 0,
        sentToModeration: 0,
        autoApproved: 0,
        errors: [msg],
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate a URL-safe slug for a composition.
   */
  private generateSlug(comp: ExtractedComposition): string {
    const base = comp.titleTranslit
      ? comp.titleTranslit.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : `comp-${Date.now()}`;

    const hash = contentHash(comp.fullText).substring(0, 8);
    return `${base}-${hash}`;
  }
}
