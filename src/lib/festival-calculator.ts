/**
 * Festival Calculator for Digital Pandharpur
 * Computes Hindu lunar calendar dates for Marathi festivals
 */

interface FestivalDate {
  name: string;
  marathiName: string;
  month: number; // 1-indexed (Chaitra = 1)
  paksha: 'shukla' | 'krishna';
  tithi: number; // 1-15 (Ekadashi = 11)
  description: string;
}

// Marathi festivals with their lunar calendar rules
const MARATHI_FESTIVALS: FestivalDate[] = [
  {
    name: 'ashadhi_ekadashi',
    marathiName: 'आषाढी एकादशी',
    month: 4, // Ashadh
    paksha: 'krishna',
    tithi: 11, // Ekadashi
    description: 'वारकरी संप्रदायाचा महत्वाचा सण',
  },
  {
    name: 'kartiki_ekadashi',
    marathiName: 'कार्तिकी एकादशी',
    month: 11, // Kartik
    paksha: 'krishna',
    tithi: 11,
    description: 'वारकरी वर्षा सण',
  },
  {
    name: 'ganesh_chaturthi',
    marathiName: 'गणेश चतुर्थी',
    month: 6, // Bhadrapada (month 6 in Marathi calendar)
    paksha: 'shukla',
    tithi: 4, // Chaturthi
    description: 'गणपतीला समर्पित सण',
  },
  {
    name: 'datta_jayanti',
    marathiName: 'दत्त जयंती',
    month: 9, // Ashwin
    paksha: 'krishna',
    tithi: 11, // Ekadashi (Dattatreya's birth)
    description: 'भगवान दत्तांचा जन्मदिवस',
  },
];

/**
 * Calculate approximate Gregorian date for a Marathi festival
 * Uses simplified algorithm - for production, use Panchang APIs
 */
export function calculateFestivalDate(
  year: number,
  festival: FestivalDate
): Date | null {
  // Simplified calculation (actual implementation would use Panchang libraries)
  // This returns approximate dates for well-known festivals

  const baseDates: Record<string, { month: number; day: number }> = {
    ashadhi_ekadashi: {
      month: 6, // June (varies year to year)
      day: 23,
    },
    kartiki_ekadashi: {
      month: 11, // November (full moon night)
      day: 22,
    },
    ganesh_chaturthi: {
      month: 8, // August/September (Bhadrapada)
      day: 15,
    },
    datta_jayanti: {
      month: 12, // December (Pushya nakshatra)
      day: 14,
    },
  };

  const base = baseDates[festival.name];
  if (!base) return null;

  return new Date(year, base.month - 1, base.day);
}

/**
 * Get all festivals for a given year
 */
export function getFestivalsForYear(year: number): Array<{
  name: string;
  marathiName: string;
  date: Date;
  daysUntil: number;
  isUpcoming: boolean;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return MARATHI_FESTIVALS.map((festival) => {
    const date = calculateFestivalDate(year, festival);
    if (!date) return null;

    const daysUntil = Math.ceil(
      (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      name: festival.name,
      marathiName: festival.marathiName,
      date,
      daysUntil,
      isUpcoming: daysUntil >= 0 && daysUntil <= 60,
    };
  }).filter(Boolean) as Array<{
    name: string;
    marathiName: string;
    date: Date;
    daysUntil: number;
    isUpcoming: boolean;
  }>;
}

/**
 * Get the "Festival of the Moment" - next upcoming festival
 */
export function getCurrentFestival(): {
  name: string;
  marathiName: string;
  date: Date;
  daysUntil: number;
} | null {
  const festivals = getFestivalsForYear(new Date().getFullYear());
  const upcoming = festivals.filter((f) => f.isUpcoming);

  if (upcoming.length === 0) {
    // Check next year
    const nextYearFestivals = getFestivalsForYear(new Date().getFullYear() + 1);
    const nextUpcoming = nextYearFestivals.filter((f) => f.isUpcoming);
    return nextUpcoming[0] || null;
  }

  return upcoming.sort((a, b) => a.daysUntil - b.daysUntil)[0];
}

export { MARATHI_FESTIVALS };