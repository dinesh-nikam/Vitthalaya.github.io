/**
 * Explore Festivals API
 * Returns upcoming festivals based on date rules.
 */

import { NextResponse } from 'next/server';
import { db } from '@/src/db/client';

export async function GET(): Promise<NextResponse> {
  try {
    // Get all festivals (we'll filter client-side or implement date calculation later)
    const festivals = await db.festival.findMany({
      orderBy: { nameMarathi: 'asc' },
      take: 10,
    });

    return NextResponse.json(
      festivals.map(f => ({
        id: f.id,
        nameMarathi: f.nameMarathi,
        nameTranslit: f.nameTranslit,
        dateRule: f.dateRule,
      }))
    );
  } catch (err) {
    console.error('Explore festivals error:', err);
    return NextResponse.json({ error: 'Failed to fetch festivals' }, { status: 500 });
  }
}
