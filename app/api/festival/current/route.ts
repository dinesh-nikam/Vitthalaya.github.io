import { NextResponse } from 'next/server';
import { getCurrentFestival, MARATHI_FESTIVALS } from '@/src/lib/festival-calculator';

export async function GET() {
  const festival = getCurrentFestival();

  if (!festival) {
    // Return default festival
    const defaultFest = MARATHI_FESTIVALS[0];
    return NextResponse.json({
      name: defaultFest?.name || 'ashadhi_ekadashi',
      nameMarathi: defaultFest?.marathiName || 'आषाढी एकादशी',
    });
  }

  return NextResponse.json({
    name: festival.name,
    nameMarathi: festival.marathiName,
    date: festival.date.toISOString(),
    daysUntil: festival.daysUntil,
  });
}