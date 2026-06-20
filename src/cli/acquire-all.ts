#!/usr/bin/env bun
/**
 * Digital Pandharpur — Unified Content Acquisition Engine CLI
 * 
 * Orchestrates the complete pipeline:
 * 1. Discovery (Sitemaps, Link Graphs, Query Seeds)
 * 2. Crawling (Web scrapers, PDF, EPUB, DOCX, ZIP, OCR scans)
 * 3. Normalization (Unicode & OCR correction rules)
 * 4. Deduplication (Fuzzy & Phonetic Canonical Matching)
 * 5. AI Enrichment (Saint, Deity, Category, Sentiment, meaning generation)
 * 6. Knowledge Graph (Polymorphic Edge Building)
 * 7. Search Index Sync (OpenSearch & Meilisearch)
 * 
 * Usage:
 *   bun run src/cli/acquire-all.ts --limit=50
 *   bun run src/cli/acquire-all.ts --dry-run
 */

import { parseArgs } from 'util';
import * as fs from 'fs';
import * as path from 'path';

// Discovery & Crawling
import { parseSitemap, crawlLinkGraph, discoverYouTubePlaylists } from '../scraper/discovery';
import { TukaramGathaScraper } from '../scraper/tukaram-gatha';
import { MarathiSourceScraper } from '../scraper/marathi-source';
import { PDFCrawler } from '../scraper/pdf-crawler';
import { EPUBCrawler } from '../scraper/epub-crawler';
import { UploadCrawler } from '../scraper/upload-crawler';
import { OCRCrawler } from '../scraper/ocr-crawler';

// Normalization & Deduplication
import { normalizeForDisplay, contentHash } from '../canonical/normalization';
import { canonicalEngine } from '../canonical/canonical-engine';
import { getCompositionSummaries, getAllCanonicalRecords, createCanonicalRecord, mergeIntoCanonical } from '../db/canonical';

// DB & Integrator
import { db } from '../db/client';

// AI Enrichment & KG
import { runBatchPipeline } from '../ai-enrichment';
import { KnowledgeGraphBuilder } from '../lib/knowledge-graph-builder';

// Search Index
import { indexAllCompositions as indexAllOS } from '../lib/opensearch-client';
import { indexAllCompositions as indexAllMeili } from '../lib/search-client';
import { processSearchSyncJobs, processAiEnrichmentJobs } from '../lib/workers';

// ============================================================
// CLI Setup & Directory Init
// ============================================================

interface AcquireArgs {
  limit: number;
  concurrency: number;
  dryRun: boolean;
  verbose: boolean;
  help: boolean;
}

function parseCliArgs(): AcquireArgs {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      limit: { type: 'string', short: 'l', default: '200' },
      concurrency: { type: 'string', short: 'c', default: '2' },
      'dry-run': { type: 'boolean', default: false },
      verbose: { type: 'boolean', short: 'v', default: false },
      help: { type: 'boolean', default: false },
    },
    allowPositionals: false,
  });

  return {
    limit: parseInt(values.limit as string, 10) || 200,
    concurrency: parseInt(values.concurrency as string, 10) || 2,
    dryRun: !!values['dry-run'],
    verbose: !!values.verbose,
    help: !!values.help,
  };
}

function initDataFolders() {
  const folders = [
    'data/uploads',
    'data/scans',
    'data/scraped',
    'data/ocr_audit',
  ];
  for (const f of folders) {
    if (!fs.existsSync(f)) {
      fs.mkdirSync(f, { recursive: true });
    }
  }

  // Create demo/placeholder files if empty so the pipeline can execute out of the box
  const sampleTxtPath = 'data/uploads/sample_abhang.txt';
  if (!fs.existsSync(sampleTxtPath)) {
    fs.writeFileSync(
      sampleTxtPath,
      `हेचि दान देगा देवा । तुझा विसर न व्हावा ॥१॥\nगुण गाईन आवडी । हेचि माझी आशा थोर ॥२॥\nसंत तुकाराम महाराज अभंग क्र. १`,
      'utf-8'
    );
  }
}

// ============================================================
// Main Pipeline
// ============================================================

async function main() {
  const args = parseCliArgs();

  if (args.help) {
    console.log(`
╔══════════════════════════════════════════════════════╗
║  Digital Pandharpur — Unified Acquisition Engine     ║
╚══════════════════════════════════════════════════════╝

Usage: bun run src/cli/acquire-all.ts [options]

Options:
  -l, --limit <number>       Max compositions to ingest per crawler (default: 200)
  -c, --concurrency <num>    Workers concurrency limit for crawler pool (default: 2)
      --dry-run              Dry run mode: crawler preview, skip DB & API writes
  -v, --verbose              Enable verbose output logs
      --help                 Show this help screen
    `);
    process.exit(0);
  }

  console.log(`\n📡 STARTING DIGITAL PANDHARPUR UNIFIED ACQUISITION ENGINE`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Mode:        ${args.dryRun ? '🟡 DRY RUN (Read-only)' : ' green 🟢 LIVE (DB & Search updates)'}`);
  console.log(`Max Limit:   ${args.limit} compositions per source`);
  console.log(`Workers:     ${args.concurrency}`);
  console.log(`Time:        ${new Date().toISOString()}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  initDataFolders();

  const metrics = {
    discoveredUrls: 0,
    crawledWeb: 0,
    parsedDocs: 0,
    ocrPages: 0,
    duplicatesSkipped: 0,
    autoMerged: 0,
    newCanonicalRecords: 0,
    enrichedCount: 0,
    kgEdges: 0,
    durationMs: 0
  };

  const startTime = Date.now();

  try {
    // -------------------------------------------------------------
    // PHASE 1: Source Discovery
    // -------------------------------------------------------------
    console.log(`\n[Phase 1] Executing Source Discovery Engine...`);
    const userAgent = 'DigitalPandharpur/1.0 (+https://github.com/digital-pandharpur)';
    
    // Sitemap discovery (demo using test / seed sitemaps where permitted)
    const discoveredSitemapUrls = await parseSitemap('https://www.marathisource.com/sitemap.xml', userAgent).catch(() => []);
    console.log(`  - Discovered sitemap URLs count: ${discoveredSitemapUrls.length}`);
    
    // YouTube playlist discovery
    const youtubePlaylists = await discoverYouTubePlaylists(['तुकाराम अभंग', 'हरिपाठ']);
    console.log(`  - Discovered YouTube playlists count: ${youtubePlaylists.length}`);

    metrics.discoveredUrls = discoveredSitemapUrls.length + youtubePlaylists.length;

    // -------------------------------------------------------------
    // PHASE 2: Crawling & Ingestion (Concurrent Scrapers & Parsers)
    // -------------------------------------------------------------
    console.log(`\n[Phase 2] Crawling & Document Ingestion...`);
    let compositionsToProcess: any[] = [];

    // Web Crawler (Tukaram Gatha)
    try {
      console.log(`  - Running Tukaram Gatha Web Scraper...`);
      const gathaScraper = new TukaramGathaScraper(Math.min(args.limit, 5)); // low limit for quick runs
      const gathaResult = await gathaScraper.run();
      compositionsToProcess.push(...gathaResult.compositions);
      metrics.crawledWeb += gathaResult.compositions.length;
    } catch (e) {
      console.warn(`  - Gatha scraper error:`, e);
    }

    // Web Crawler (MarathiSource)
    try {
      console.log(`  - Running MarathiSource Web Scraper...`);
      const sourceScraper = new MarathiSourceScraper(Math.min(args.limit, 5));
      const sourceResult = await sourceScraper.run();
      compositionsToProcess.push(...sourceResult.compositions);
      metrics.crawledWeb += sourceResult.compositions.length;
    } catch (e) {
      console.warn(`  - MarathiSource scraper error:`, e);
    }

    // Document & PDF Crawlers (data/uploads)
    console.log(`  - Scanning uploads folder (PDF, EPUB, DOCX, ZIP)...`);
    const uploadCrawler = new UploadCrawler();
    const uploads = fs.readdirSync('data/uploads');
    for (const f of uploads) {
      try {
        const fullPath = path.join('data/uploads', f);
        const parsed = await uploadCrawler.processUpload(fullPath);
        compositionsToProcess.push(...parsed);
        metrics.parsedDocs += parsed.length;
      } catch (e) {
        console.warn(`  - Error parsing upload file ${f}:`, e);
      }
    }

    // Image OCR Crawler (data/scans)
    console.log(`  - Scanning manuscript scans folder (OCR)...`);
    const ocrCrawler = new OCRCrawler({ outputDir: 'data/ocr_audit' });
    try {
      const ocrCompositions = await ocrCrawler.processDirectory('data/scans');
      compositionsToProcess.push(...ocrCompositions);
      metrics.ocrPages += ocrCompositions.length;
    } catch (e) {
      console.warn(`  - OCR processing error:`, e);
    }

    console.log(`  → Total items crawled/extracted: ${compositionsToProcess.length}`);

    // If dry run, print summary and terminate early
    if (args.dryRun) {
      console.log(`\n🟡 DRY RUN COMPLETE. Skipping DB Ingestion, Deduplication, and Search Index updates.`);
      process.exit(0);
    }

    // -------------------------------------------------------------
    // PHASE 3: Database Persistence & Normalization
    // -------------------------------------------------------------
    console.log(`\n[Phase 3] Normalizing & Persisting to Database...`);
    const dbCompositions: any[] = [];

    for (const comp of compositionsToProcess) {
      try {
        // Clean display text
        const cleanText = normalizeForDisplay(comp.full_text);
        const hash = contentHash(cleanText);

        // Find or create saint
        let saintId: string | undefined;
        if (comp.saint_name_transliteration) {
          const saint = await db.saint.findFirst({
            where: { nameTranslit: comp.saint_name_transliteration }
          });
          saintId = saint?.id;
        }

        // Find or create deity
        let deityId: string | undefined;
        if (comp.deity_name_transliteration) {
          const deity = await db.deity.findFirst({
            where: { nameTranslit: comp.deity_name_transliteration }
          });
          deityId = deity?.id;
        }

        // Save composition as unreviewed (reviewed: false) for editorial approval
        const slug = `${comp.title_transliteration.toLowerCase().replace(/\s+/g, '-')}-${hash.substring(0, 8)}`;
        
        // Check for exact duplicate in DB before insert
        const existing = await db.composition.findFirst({
          where: { contentHash: hash }
        });

        if (existing) {
          metrics.duplicatesSkipped++;
          dbCompositions.push(existing);
          continue;
        }

        const savedComp = await db.composition.create({
          data: {
            titleMarathi: comp.title_marathi,
            titleTranslit: comp.title_transliteration,
            slug,
            type: comp.type.toUpperCase(),
            fullText: cleanText,
            meaning: comp.meaning,
            saintId,
            deityId,
            region: comp.region,
            source: comp.source_attribution,
            reviewed: false, // unreviewed
            contentHash: hash,
            audioLinks: "[]"
          }
        });

        dbCompositions.push(savedComp);
      } catch (e) {
        console.warn(`  - DB save failed for composition ${comp.title_marathi}:`, e);
      }
    }

    // -------------------------------------------------------------
    // PHASE 4: Deduplication & Canonical Engine
    // -------------------------------------------------------------
    console.log(`\n[Phase 4] Running Deduplication Engine...`);
    const allCanonical = await getAllCanonicalRecords();

    for (const comp of dbCompositions) {
      if (comp.canonicalId) continue; // Already mapped

      // Treat DB composition as matching summary
      const summary = {
        id: comp.id,
        title: comp.titleMarathi,
        fullText: comp.fullText,
        type: comp.type,
        saintId: comp.saintId
      };

      const bestMatch = canonicalEngine.findBestMatch(summary, allCanonical);

      if (bestMatch && bestMatch.autoMerge) {
        // Auto-merge into existing canonical record
        await mergeIntoCanonical(
          comp.id,
          bestMatch.canonicalRecordId!,
          bestMatch.confidence,
          'auto_merge',
          'duplicate',
          { reason: `Auto-merged at ${(bestMatch.confidence * 100).toFixed(1)}% match` }
        );
        metrics.autoMerged++;
      } else {
        // Create new canonical master record
        const newRecordId = await createCanonicalRecord(comp.id);
        metrics.newCanonicalRecords++;
        
        // Cache this new record for subsequent iterations
        const newRecord = await db.canonicalRecord.findUnique({
          where: { id: newRecordId }
        });
        if (newRecord) {
          allCanonical.push({
            id: newRecord.id,
            title: newRecord.titleMarathi,
            canonicalText: newRecord.canonicalText,
            type: newRecord.type,
            saintId: newRecord.saintId,
            version: newRecord.canonicalVersion
          });
        }
      }
    }
    console.log(`  - New Canonical Masters: ${metrics.newCanonicalRecords}`);
    console.log(`  - Auto-merged Duplicates: ${metrics.autoMerged}`);

    // -------------------------------------------------------------
    // PHASE 5: AI Enrichment & Classification
    // -------------------------------------------------------------
    console.log(`\n[Phase 5] AI Enrichment (Metadata Classification)...`);
    
    // Auto-enqueue newly created unreviewed compositions for enrichment
    const pendingEnrichCount = await runBatchPipeline({
      limit: 100,
      skipEnriched: true,
      concurrency: args.concurrency,
      dryRun: false,
      retryFailed: true
    }).catch((e) => {
      console.warn(`  - AI Enrichment skipped or failed (API configuration issue):`, e.message || e);
      return { processed: 0 };
    });

    metrics.enrichedCount = pendingEnrichCount.processed || 0;
    console.log(`  - Compositions enriched: ${metrics.enrichedCount}`);

    // -------------------------------------------------------------
    // PHASE 6: Knowledge Graph Construction
    // -------------------------------------------------------------
    console.log(`\n[Phase 6] Constructing Knowledge Graph...`);
    const kgBuilder = new KnowledgeGraphBuilder();
    const kgResult = await kgBuilder.buildGraph();
    metrics.kgEdges = kgResult.edgesCreated;

    // -------------------------------------------------------------
    // PHASE 7: Search Indexing Sync
    // -------------------------------------------------------------
    console.log(`\n[Phase 7] Synchronizing Search Indexes...`);
    // Run search sync worker to drain any outstanding queue items
    const searchSyncJobs = await processSearchSyncJobs();
    console.log(`  - Processed ${searchSyncJobs} outbox sync jobs.`);

    // Re-index all active reviewed compositions
    const osIndexed = await indexAllOS().catch(() => 0);
    const meiliIndexed = await indexAllMeili().catch(() => 0);
    console.log(`  - OpenSearch Sync count: ${osIndexed}`);
    console.log(`  - Meilisearch Sync count: ${meiliIndexed}`);

    metrics.durationMs = Date.now() - startTime;

    // -------------------------------------------------------------
    // PRINT PIPELINE STATISTICS
    // -------------------------------------------------------------
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 PIPELINE RUN METRICS`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Total Run Time:             ${(metrics.durationMs / 1000).toFixed(2)} seconds`);
    console.log(`URLs Discovered:            ${metrics.discoveredUrls}`);
    console.log(`Web Pages Crawled:          ${metrics.crawledWeb}`);
    console.log(`Documents Parsed:           ${metrics.parsedDocs}`);
    console.log(`OCR Manuscript Pages:       ${metrics.ocrPages}`);
    console.log(`DB Exact Dups Skipped:      ${metrics.duplicatesSkipped}`);
    console.log(`Canonical Auto-merges:      ${metrics.autoMerged}`);
    console.log(`New Canonical Records:      ${metrics.newCanonicalRecords}`);
    console.log(`AI Compositions Enriched:   ${metrics.enrichedCount}`);
    console.log(`Knowledge Graph Edges:      ${metrics.kgEdges}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🟢 Unified Ingestion Engine complete.\n`);

  } catch (err) {
    console.error(`\n❌ Ingestion Pipeline crashed with critical error:`, err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\n❌ Fatal Error:`, err);
  process.exit(1);
});
