/**
 * GET /api/graph/explore
 *
 * Returns the full knowledge graph for visualization.
 * Supports pagination and type filtering.
 *
 * Query params:
 *   types     - Comma-separated entity types to include (optional)
 *   limit     - Max nodes (default: 500)
 *   search    - Filter by node name
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/client';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const typesParam = searchParams.get('types');
    const limit = Math.min(2000, parseInt(searchParams.get('limit') ?? '500', 10));
    const search = searchParams.get('search')?.trim();

    const allowedTypes = typesParam
      ? typesParam.split(',').map((t) => t.trim()) as string[]
      : ['saint', 'composition', 'deity', 'festival', 'category', 'region'];

    // Fetch edges (limited)
    const whereEdges: Record<string, unknown> = {};
    if (typesParam) {
      whereEdges.OR = [
        { sourceType: { in: allowedTypes } },
        { targetType: { in: allowedTypes } },
      ];
    }

    const edges = await db.entityGraphEdge.findMany({
      where: whereEdges as any,
      orderBy: { weight: 'desc' },
      take: limit * 3, // edges ~ 3x nodes
    });

    // Collect unique entity references
    const entityRefs = new Set<string>();
    for (const edge of edges) {
      entityRefs.add(`${edge.sourceType}:${edge.sourceId}`);
      entityRefs.add(`${edge.targetType}:${edge.targetId}`);
    }

    // Fetch entity names from respective tables in batch to avoid N+1 query problem
    const nodes: Array<{ id: string; type: string; name: string; marathiName: string; slug?: string }> = [];

    const idsByType = new Map<string, string[]>();
    for (const ref of entityRefs) {
      const [type, id] = ref.split(':') as [string, string];
      if (!idsByType.has(type)) {
        idsByType.set(type, []);
      }
      idsByType.get(type)!.push(id);
    }

    const lookup = new Map<string, { name: string; marathiName: string; slug?: string }>();

    const fetchSaint = async () => {
      const ids = idsByType.get('saint') || [];
      if (ids.length === 0) return;
      const saints = await db.saint.findMany({
        where: { id: { in: ids } },
        select: { id: true, nameMarathi: true, nameTranslit: true, slug: true }
      });
      for (const s of saints) {
        lookup.set(`saint:${s.id}`, { name: s.nameMarathi, marathiName: s.nameMarathi, slug: s.slug });
      }
    };

    const fetchComposition = async () => {
      const ids = idsByType.get('composition') || [];
      if (ids.length === 0) return;
      const compositions = await db.composition.findMany({
        where: { id: { in: ids } },
        select: { id: true, titleMarathi: true, titleTranslit: true, slug: true }
      });
      for (const c of compositions) {
        lookup.set(`composition:${c.id}`, { name: c.titleMarathi, marathiName: c.titleMarathi, slug: c.slug });
      }
    };

    const fetchDeity = async () => {
      const ids = idsByType.get('deity') || [];
      if (ids.length === 0) return;
      const deities = await db.deity.findMany({
        where: { id: { in: ids } },
        select: { id: true, nameMarathi: true, nameTranslit: true, slug: true }
      });
      for (const d of deities) {
        lookup.set(`deity:${d.id}`, { name: d.nameMarathi, marathiName: d.nameMarathi, slug: d.slug });
      }
    };

    const fetchFestival = async () => {
      const ids = idsByType.get('festival') || [];
      if (ids.length === 0) return;
      const festivals = await db.festival.findMany({
        where: { id: { in: ids } },
        select: { id: true, nameMarathi: true, nameTranslit: true, slug: true }
      });
      for (const f of festivals) {
        lookup.set(`festival:${f.id}`, { name: f.nameMarathi, marathiName: f.nameMarathi, slug: f.slug });
      }
    };

    const fetchCategory = async () => {
      const ids = idsByType.get('category') || [];
      if (ids.length === 0) return;
      const categories = await db.category.findMany({
        where: { id: { in: ids } },
        select: { id: true, nameMarathi: true, nameTranslit: true, slug: true }
      });
      for (const c of categories) {
        lookup.set(`category:${c.id}`, { name: c.nameMarathi, marathiName: c.nameMarathi, slug: c.slug });
      }
    };

    const fetchRegion = async () => {
      const ids = idsByType.get('region') || [];
      if (ids.length === 0) return;
      const regions = await db.region.findMany({
        where: { id: { in: ids } },
        select: { id: true, nameMarathi: true, nameTranslit: true, slug: true }
      });
      for (const r of regions) {
        lookup.set(`region:${r.id}`, { name: r.nameMarathi, marathiName: r.nameMarathi, slug: r.slug });
      }
    };

    await Promise.all([
      fetchSaint(),
      fetchComposition(),
      fetchDeity(),
      fetchFestival(),
      fetchCategory(),
      fetchRegion()
    ]);

    for (const ref of entityRefs) {
      const item = lookup.get(ref);
      if (!item) continue;

      const { name, marathiName, slug } = item;
      const [type] = ref.split(':');

      // Apply search filter
      if (search && !name.toLowerCase().includes(search.toLowerCase()) && !marathiName.includes(search)) continue;

      nodes.push({ id: ref, type, name, marathiName, slug });

      if (nodes.length >= limit) break;
    }

    return NextResponse.json({
      nodes,
      edges: edges.map((e) => ({
        source: `${e.sourceType}:${e.sourceId}`,
        target: `${e.targetType}:${e.targetId}`,
        type: e.relationship,
        weight: e.weight,
      })),
      stats: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
