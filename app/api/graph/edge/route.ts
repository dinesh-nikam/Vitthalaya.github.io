/**
 * POST /api/graph/edge — Create a graph edge
 * DELETE /api/graph/edge — Delete a graph edge
 *
 * POST body:
 *   { sourceType, sourceId, targetType, targetId, relationship, weight?, metadata? }
 *
 * DELETE body:
 *   { edgeId } — Delete a specific edge
 *   { sourceType, sourceId } — Delete all edges for an entity
 */

import { NextRequest, NextResponse } from 'next/server';
import { createEdge, createBidirectionalEdge, deleteEdge, deleteEdgesForEntity } from '@/src/knowledge-graph/relationship-engine';
import type { EntityType, RelationshipType } from '@/src/knowledge-graph/graph-ontology';
import { ENTITY_TYPES, RELATIONSHIP_TYPES } from '@/src/knowledge-graph/graph-ontology';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { sourceType, sourceId, targetType, targetId, relationship, weight, metadata, bidirectional } = body;

    // Validate
    if (!sourceType || !sourceId || !targetType || !targetId || !relationship) {
      return NextResponse.json(
        { error: 'sourceType, sourceId, targetType, targetId, relationship are required' },
        { status: 400 }
      );
    }

    if (!ENTITY_TYPES.includes(sourceType)) {
      return NextResponse.json({ error: `Invalid sourceType: ${sourceType}` }, { status: 400 });
    }
    if (!ENTITY_TYPES.includes(targetType)) {
      return NextResponse.json({ error: `Invalid targetType: ${targetType}` }, { status: 400 });
    }

    if (bidirectional) {
      const [forward, reverse] = await createBidirectionalEdge(
        sourceType, sourceId,
        targetType, targetId,
        relationship as RelationshipType,
        { weight, metadata }
      );
      return NextResponse.json({ success: true, edges: [forward, reverse] });
    }

    const edge = await createEdge(
      sourceType, sourceId,
      targetType, targetId,
      relationship as RelationshipType,
      { weight, metadata }
    );
    return NextResponse.json({ success: true, edge });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { edgeId, sourceType, sourceId } = body;

    if (edgeId) {
      const deleted = await deleteEdge(edgeId);
      return NextResponse.json({ success: true, deleted });
    }

    if (sourceType && sourceId) {
      if (!ENTITY_TYPES.includes(sourceType)) {
        return NextResponse.json({ error: `Invalid sourceType: ${sourceType}` }, { status: 400 });
      }
      const count = await deleteEdgesForEntity(sourceType, sourceId);
      return NextResponse.json({ success: true, deleted: count });
    }

    return NextResponse.json(
      { error: 'Provide either edgeId or (sourceType + sourceId)' },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
