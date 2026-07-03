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

const FESTIVAL_DATES_MAP: Record<string, Record<number, { month: number; day: number }>> = {
  ashadhi_ekadashi: {
    2020: { month: 7, day: 1 },
    2021: { month: 7, day: 20 },
    2022: { month: 7, day: 10 },
    2023: { month: 6, day: 29 },
    2024: { month: 7, day: 17 },
    2025: { month: 7, day: 6 },
    2026: { month: 6, day: 25 },
    2027: { month: 7, day: 14 },
    2028: { month: 7, day: 2 },
    2029: { month: 7, day: 21 },
    2030: { month: 7, day: 10 },
    2031: { month: 6, day: 30 },
    2032: { month: 7, day: 18 },
    2033: { month: 7, day: 7 },
    2034: { month: 6, day: 26 },
    2035: { month: 7, day: 16 }
  },
  kartiki_ekadashi: {
    2020: { month: 11, day: 25 },
    2021: { month: 11, day: 14 },
    2022: { month: 11, day: 4 },
    2023: { month: 11, day: 23 },
    2024: { month: 11, day: 12 },
    2025: { month: 11, day: 21 },
    2026: { month: 11, day: 20 },
    2027: { month: 11, day: 9 },
    2028: { month: 11, day: 27 },
    2029: { month: 11, day: 17 },
    2030: { month: 11, day: 6 },
    2031: { month: 11, day: 25 },
    2032: { month: 11, day: 13 },
    2033: { month: 11, day: 2 },
    2034: { month: 11, day: 22 },
    2035: { month: 11, day: 11 }
  },
  ganesh_chaturthi: {
    2020: { month: 8, day: 22 },
    2021: { month: 9, day: 10 },
    2022: { month: 8, day: 31 },
    2023: { month: 9, day: 19 },
    2024: { month: 9, day: 7 },
    2025: { month: 8, day: 27 },
    2026: { month: 9, day: 14 },
    2027: { month: 9, day: 4 },
    2028: { month: 8, day: 23 },
    2029: { month: 9, day: 11 },
    2030: { month: 9, day: 1 },
    2031: { month: 9, day: 20 },
    2032: { month: 9, day: 8 },
    2033: { month: 8, day: 29 },
    2034: { month: 9, day: 17 },
    2035: { month: 9, day: 5 }
  },
  datta_jayanti: {
    2020: { month: 12, day: 29 },
    2021: { month: 12, day: 18 },
    2022: { month: 12, day: 7 },
    2023: { month: 12, day: 26 },
    2024: { month: 12, day: 14 },
    2025: { month: 12, day: 4 },
    2026: { month: 12, day: 23 },
    2027: { month: 12, day: 12 },
    2028: { month: 12, day: 1 },
    2029: { month: 12, day: 20 },
    2030: { month: 12, day: 9 },
    2031: { month: 12, day: 28 },
    2032: { month: 12, day: 17 },
    2033: { month: 12, day: 6 },
    2034: { month: 12, day: 25 },
    2035: { month: 12, day: 14 }
  }
};

/**
 * Calculate accurate Gregorian date for a Marathi festival using precomputed lunisolar table
 */
export function calculateFestivalDate(
  year: number,
  festival: FestivalDate
): Date | null {
  const festivalMap = FESTIVAL_DATES_MAP[festival.name];
  if (!festivalMap) return null;

  const targetDate = festivalMap[year] || festivalMap[2026]; // Fallback to 2026 if outside range
  return new Date(year, targetDate.month - 1, targetDate.day);
}

/**
 * Get all festivals for a given year
 */
export function getFestivalsForYear(year: number, referenceDate: Date = new Date()): Array<{
  name: string;
  marathiName: string;
  date: Date;
  daysUntil: number;
  isUpcoming: boolean;
}> {
  const today = new Date(referenceDate);
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
export function getCurrentFestival(referenceDate: Date = new Date()): {
  name: string;
  marathiName: string;
  date: Date;
  daysUntil: number;
} | null {
  const festivals = getFestivalsForYear(referenceDate.getFullYear(), referenceDate);
  const upcoming = festivals.filter((f) => f.isUpcoming);

  if (upcoming.length === 0) {
    // If no festival is within 60 days, find the absolute next future festival (daysUntil >= 0)
    const future = festivals
      .filter((f) => f.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil);
    if (future.length > 0) {
      return future[0];
    }
    // Check next year
    const nextYearFestivals = getFestivalsForYear(referenceDate.getFullYear() + 1, referenceDate);
    const nextFuture = nextYearFestivals
      .filter((f) => f.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil);
    return nextFuture[0] || null;
  }

  return upcoming.sort((a, b) => a.daysUntil - b.daysUntil)[0];
}

/**
 * Gets a festival occurring on a specific date (if any)
 */
export function getFestivalForDate(date: Date): { name: string; marathiName: string } | null {
  if (!date || isNaN(date.getTime())) return null;
  const festivals = getFestivalsForYear(date.getFullYear(), date);
  const match = festivals.find(f => {
    const fDate = new Date(f.date);
    return fDate.getDate() === date.getDate() && 
           fDate.getMonth() === date.getMonth();
  });
  return match ? { name: match.name, marathiName: match.marathiName } : null;
}

/**
 * Gets the next upcoming festival
 */
export function getNextFestival(referenceDate: Date = new Date()) {
  const current = getCurrentFestival(referenceDate);
  if (!current) return null;
  return {
    ...current,
    nameMarathi: current.marathiName
  };
}

/**
 * Parses raw rule details
 */
export function parseFestivalRule(rule: string) {
  if (!rule) return null;
  const isLunar = rule.includes('पूर्णिमा') || rule.includes('एकादशी') || rule.includes('तिथी') || rule.includes('नक्कडीचा');
  return {
    type: isLunar ? 'lunar' : 'month-day',
    rule
  };
}

export { MARATHI_FESTIVALS };