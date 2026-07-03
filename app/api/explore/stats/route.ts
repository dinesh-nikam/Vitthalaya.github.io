/**
 * Explore Stats API
 * Returns live counts for compositions, saints, and categories.
 */

import { NextResponse } from 'next/server';
import { db } from '@/src/db/client';

export async function GET(): Promise<NextResponse> {
  try {
    const [compositions, saints, categories] = await Promise.all([
      db.composition.count({ where: { reviewed: true } }),
      db.saint.count(),
      db.category.count(),
    ]);

    return NextResponse.json({
      compositions,
      saints,
      categories,
    });
  } catch (err) {
    console.error('Explore stats error:', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
