import { NextResponse } from 'next/server';
import { db } from '@/src/db/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 150);

    const [saints, deities, compositions, edges] = await Promise.all([
      db.saint.findMany({
        take: limit,
        select: {
          id: true,
          nameMarathi: true,
          nameTranslit: true,
          slug: true,
          region: true,
        },
      }),
      db.deity.findMany({
        take: limit,
        select: {
          id: true,
          nameMarathi: true,
          nameTranslit: true,
          iconName: true,
        },
      }),
      db.composition.findMany({
        take: limit,
        select: {
          id: true,
          titleMarathi: true,
          slug: true,
          type: true,
          saintId: true,
          deityId: true,
        },
      }),
      db.entityGraphEdge.findMany({
        take: limit * 2,
        select: {
          id: true,
          sourceType: true,
          sourceId: true,
          targetType: true,
          targetId: true,
          relationship: true,
          weight: true,
          confidence: true,
        },
      }),
    ]);

    // Format nodes for Vis.js / 3D Graph visualizer
    const nodes = [
      ...saints.map((s) => ({
        id: `saint-${s.id}`,
        label: s.nameMarathi,
        group: 'Saint',
        slug: s.slug,
        type: 'saint',
        color: '#FF6B00', // Saffron
      })),
      ...deities.map((d) => ({
        id: `deity-${d.id}`,
        label: d.nameMarathi,
        group: 'Deity',
        type: 'deity',
        color: '#D4AF37', // Gold
      })),
      ...compositions.map((c) => ({
        id: `comp-${c.id}`,
        label: c.titleMarathi,
        group: 'Composition',
        slug: c.slug,
        type: c.type,
        color: '#4A0E17', // Maroon
      })),
    ];

    // Compute inferred edges between Compositions and Saints/Deities
    const compositionEdges = compositions.flatMap((c) => {
      const links: Array<{ from: string; to: string; relationship: string; weight: number; confidence: number }> = [];
      if (c.saintId) {
        links.push({
          from: `comp-${c.id}`,
          to: `saint-${c.saintId}`,
          relationship: 'AUTHORED_BY',
          weight: 1.0,
          confidence: 1.0,
        });
      }
      if (c.deityId) {
        links.push({
          from: `comp-${c.id}`,
          to: `deity-${c.deityId}`,
          relationship: 'DEDICATED_TO',
          weight: 0.9,
          confidence: 0.9,
        });
      }
      return links;
    });

    const formattedGraphEdges = edges.map((e) => ({
      from: `${e.sourceType.toLowerCase()}-${e.sourceId}`,
      to: `${e.targetType.toLowerCase()}-${e.targetId}`,
      relationship: e.relationship,
      weight: e.weight ?? 1.0,
      confidence: e.confidence ?? 1.0,
    }));

    return NextResponse.json({
      success: true,
      nodes,
      edges: [...compositionEdges, ...formattedGraphEdges],
      stats: {
        totalNodes: nodes.length,
        totalEdges: compositionEdges.length + formattedGraphEdges.length,
      },
    });
  } catch (error) {
    console.error('Failed to fetch Knowledge Graph nodes:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
