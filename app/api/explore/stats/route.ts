/**
 * Explore Stats API
 * Returns live counts for compositions, saints, and categories, plus a
 * per-type breakdown so category cards show real numbers.
 */

import { NextResponse } from 'next/server';
import { db } from '@/src/db/client';

export async function GET(): Promise<NextResponse> {
  try {
    const [compositions, saints, categories, byTypeRows] = await Promise.all([
      db.composition.count({ where: { reviewed: true } }),
      db.saint.count(),
      db.category.count(),
      db.composition.groupBy({
        by: ['type'],
        where: { reviewed: true },
        _count: { _all: true },
      }),
    ]);

    // Normalize case (legacy rows used UPPER types) and merge.
    const byType: Record<string, number> = {};
    for (const row of byTypeRows) {
      const key = row.type.toLowerCase();
      byType[key] = (byType[key] ?? 0) + row._count._all;
    }

    return NextResponse.json({
      compositions,
      saints,
      categories,
      byType,
    });
  } catch (err) {
    console.error('Explore stats error:', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
