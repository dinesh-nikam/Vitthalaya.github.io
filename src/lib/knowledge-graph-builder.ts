/**
 * Digital Pandharpur — Knowledge Graph Edge Builder
 * 
 * Automatically builds and resolves weight-based multi-layered relationship edges:
 * - Saint ↔ Composition (composed)
 * - Composition ↔ Deity (dedicated_to)
 * - Composition ↔ Festival (associated_with)
 * - Festival ↔ Temple (celebrated_at)
 * - Temple ↔ Region (located_in)
 * - Book ↔ Composition (published_in)
 * - Audio ↔ Composition (audio_performance)
 */

import { db } from '../db/client';

export interface GraphEdgeInput {
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  relationship: string;
  weight?: number;
  metadata?: Record<string, any>;
}

export class KnowledgeGraphBuilder {
  constructor() {}

  /**
   * Run the full graph generation pipeline
   */
  async buildGraph(): Promise<{ edgesCreated: number }> {
    console.log('[KnowledgeGraphBuilder] Building relationship graph...');
    let edgesCreated = 0;

    // 1. Clear old edges (to prevent stale edges or duplicates)
    try {
      await db.entityGraphEdge.deleteMany({});
      console.log('[KnowledgeGraphBuilder] Cleaned existing graph edges.');
    } catch (err) {
      console.warn('[KnowledgeGraphBuilder] Non-critical error clearing edges table:', err);
    }

    // 2. Generate Saint ↔ Composition edges
    const saintEdges = await this.buildSaintCompositionEdges();
    edgesCreated += saintEdges;

    // 3. Generate Composition ↔ Deity edges
    const deityEdges = await this.buildCompositionDeityEdges();
    edgesCreated += deityEdges;

    // 4. Generate Composition ↔ Festival edges
    const festivalEdges = await this.buildCompositionFestivalEdges();
    edgesCreated += festivalEdges;

    // 5. Generate Book ↔ Composition edges
    const bookEdges = await this.buildBookCompositionEdges();
    edgesCreated += bookEdges;

    // 6. Generate Audio ↔ Composition edges
    const audioEdges = await this.buildAudioCompositionEdges();
    edgesCreated += audioEdges;

    // 7. Generate Temple / Region relationships
    const templeEdges = await this.buildTempleRegionEdges();
    edgesCreated += templeEdges;

    console.log(`[KnowledgeGraphBuilder] Graph build complete. Generated ${edgesCreated} edges.`);
    return { edgesCreated };
  }

  /**
   * Create edges: Saint -> composed -> Composition
   */
  private async buildSaintCompositionEdges(): Promise<number> {
    const compositions = await db.composition.findMany({
      where: { saintId: { not: null } },
      select: { id: true, saintId: true, type: true }
    });

    let count = 0;
    for (const comp of compositions) {
      if (!comp.saintId) continue;
      await this.upsertEdge({
        sourceType: 'saint',
        sourceId: comp.saintId,
        targetType: 'composition',
        targetId: comp.id,
        relationship: 'composed',
        weight: 1.0,
        metadata: { compositionType: comp.type }
      });
      count++;
    }
    console.log(`[KnowledgeGraphBuilder] Created ${count} Saint ↔ Composition edges.`);
    return count;
  }

  /**
   * Create edges: Composition -> dedicated_to -> Deity
   */
  private async buildCompositionDeityEdges(): Promise<number> {
    const compositions = await db.composition.findMany({
      where: { deityId: { not: null } },
      select: { id: true, deityId: true }
    });

    let count = 0;
    for (const comp of compositions) {
      if (!comp.deityId) continue;
      await this.upsertEdge({
        sourceType: 'composition',
        sourceId: comp.id,
        targetType: 'deity',
        targetId: comp.deityId,
        relationship: 'dedicated_to',
        weight: 1.0
      });
      count++;
    }
    console.log(`[KnowledgeGraphBuilder] Created ${count} Composition ↔ Deity edges.`);
    return count;
  }

  /**
   * Create edges: Composition -> associated_with -> Festival
   */
  private async buildCompositionFestivalEdges(): Promise<number> {
    // Check if compositionFestivals relation is loaded
    const links = await db.festivalComposition.findMany({
      select: { compositionId: true, festivalId: true }
    });

    let count = 0;
    for (const link of links) {
      await this.upsertEdge({
        sourceType: 'composition',
        sourceId: link.compositionId,
        targetType: 'festival',
        targetId: link.festivalId,
        relationship: 'associated_with',
        weight: 1.0
      });
      count++;
    }
    console.log(`[KnowledgeGraphBuilder] Created ${count} Composition ↔ Festival edges.`);
    return count;
  }

  /**
   * Create edges: Book -> contains -> Composition
   */
  private async buildBookCompositionEdges(): Promise<number> {
    const books = await db.book.findMany({
      select: { id: true, titleTranslit: true }
    });

    let count = 0;
    for (const book of books) {
      // Find compositions matching this book's source title/attribution
      const compositions = await db.composition.findMany({
        where: {
          source: {
            contains: book.titleTranslit || ''
          }
        },
        select: { id: true }
      });

      for (const comp of compositions) {
        await this.upsertEdge({
          sourceType: 'book',
          sourceId: book.id,
          targetType: 'composition',
          targetId: comp.id,
          relationship: 'contains',
          weight: 0.9
        });
        count++;
      }
    }
    console.log(`[KnowledgeGraphBuilder] Created ${count} Book ↔ Composition edges.`);
    return count;
  }

  /**
   * Create edges: Audio -> performance_of -> Composition
   */
  private async buildAudioCompositionEdges(): Promise<number> {
    const audioFiles = await db.audio.findMany({
      select: { id: true, titleTranslit: true, duration: true }
    });

    let count = 0;
    for (const file of audioFiles) {
      if (!file.titleTranslit) continue;

      // Match compositions with similar titleTranslit
      const compositions = await db.composition.findMany({
        where: {
          titleTranslit: {
            contains: file.titleTranslit
          }
        },
        select: { id: true }
      });

      for (const comp of compositions) {
        await this.upsertEdge({
          sourceType: 'audio',
          sourceId: file.id,
          targetType: 'composition',
          targetId: comp.id,
          relationship: 'performance_of',
          weight: 0.95,
          metadata: { duration: file.duration }
        });
        count++;
      }
    }
    console.log(`[KnowledgeGraphBuilder] Created ${count} Audio ↔ Composition edges.`);
    return count;
  }

  /**
   * Create edges: Temple -> located_in -> Region
   */
  private async buildTempleRegionEdges(): Promise<number> {
    const temples = await db.temple.findMany({
      select: { id: true, location: true }
    });

    let count = 0;
    for (const temple of temples) {
      if (!temple.location) continue;

      // Find region matching temple location name
      const regions = await db.region.findMany({
        where: {
          nameTranslit: {
            contains: temple.location
          }
        },
        select: { id: true }
      });

      for (const region of regions) {
        await this.upsertEdge({
          sourceType: 'temple',
          sourceId: temple.id,
          targetType: 'region',
          targetId: region.id,
          relationship: 'located_in',
          weight: 1.0
        });
        count++;
      }
    }
    console.log(`[KnowledgeGraphBuilder] Created ${count} Temple ↔ Region edges.`);
    return count;
  }

  /**
   * Helper to write edges to database
   */
  private async upsertEdge(input: GraphEdgeInput): Promise<void> {
    const metaStr = input.metadata ? JSON.stringify(input.metadata) : null;
    
    await db.entityGraphEdge.create({
      data: {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        targetType: input.targetType,
        targetId: input.targetId,
        relationship: input.relationship,
        weight: input.weight ?? 1.0,
        metadata: metaStr
      }
    });
  }
}
