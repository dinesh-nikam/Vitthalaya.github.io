import { describe, expect, it } from 'bun:test';
import { NextRequest } from 'next/server';
import {
  getCurrentISTHour,
  resolveProharIdByHour,
  PROHAR_DEFINITIONS,
  VARKARI_TAALS,
  getNityanemData,
} from '@/src/services/nityanem-service';
import { GET as handleNityanemGet } from '@/app/api/nityanem/route';

describe('Varkari Nityanem Service — Domain Logic', () => {
  it('TC-NITYA-001: calculates Indian Standard Time (UTC+5.5) accurately', () => {
    // 00:00 UTC corresponds to 05:30 IST
    const dateUtcMidnight = new Date(Date.UTC(2026, 5, 15, 0, 0, 0));
    const istHour = getCurrentISTHour(dateUtcMidnight);
    expect(istHour).toBe(5);

    // 12:00 UTC corresponds to 17:30 IST
    const dateUtcNoon = new Date(Date.UTC(2026, 5, 15, 12, 0, 0));
    expect(getCurrentISTHour(dateUtcNoon)).toBe(17);
  });

  it('TC-NITYA-002: maps 24-hour cycles faithfully to the 5 traditional Varkari watches', () => {
    // 04:00 to 06:59 -> Kakad Aarti
    expect(resolveProharIdByHour(4)).toBe('KAKAD_AARTI');
    expect(resolveProharIdByHour(5)).toBe('KAKAD_AARTI');
    expect(resolveProharIdByHour(6)).toBe('KAKAD_AARTI');

    // 07:00 to 11:59 -> Haripath
    expect(resolveProharIdByHour(7)).toBe('HARIPATH');
    expect(resolveProharIdByHour(10)).toBe('HARIPATH');
    expect(resolveProharIdByHour(11)).toBe('HARIPATH');

    // 12:00 to 15:59 -> Gaulani
    expect(resolveProharIdByHour(12)).toBe('GAULANI');
    expect(resolveProharIdByHour(14)).toBe('GAULANI');
    expect(resolveProharIdByHour(15)).toBe('GAULANI');

    // 16:00 to 19:59 -> Dhuparti
    expect(resolveProharIdByHour(16)).toBe('DHUPARTI');
    expect(resolveProharIdByHour(18)).toBe('DHUPARTI');
    expect(resolveProharIdByHour(19)).toBe('DHUPARTI');

    // 20:00 to 03:59 -> Shejarti
    expect(resolveProharIdByHour(20)).toBe('SHEJARTI');
    expect(resolveProharIdByHour(23)).toBe('SHEJARTI');
    expect(resolveProharIdByHour(0)).toBe('SHEJARTI');
    expect(resolveProharIdByHour(3)).toBe('SHEJARTI');
  });

  it('TC-NITYA-003: ensures all Prohars carry liturgical metadata and search criteria', () => {
    const keys = Object.keys(PROHAR_DEFINITIONS);
    expect(keys.length).toBe(5);

    for (const key of keys) {
      const def = (PROHAR_DEFINITIONS as any)[key];
      expect(def.titleMarathi.length).toBeGreaterThan(0);
      expect(def.subtitleMarathi.length).toBeGreaterThan(0);
      expect(def.recommendedTypes.length).toBeGreaterThan(0);
      expect(def.searchKeywords.length).toBeGreaterThan(0);
      expect(def.suggestedBpm).toBeGreaterThan(50);
      expect(def.suggestedBpm).toBeLessThan(160);
    }
  });

  it('TC-NITYA-004: validates Varkari Taal rhythmic structures and syllable alignments', () => {
    expect(VARKARI_TAALS.length).toBeGreaterThanOrEqual(4);

    for (const taal of VARKARI_TAALS) {
      expect(taal.bol.length).toBe(taal.beatsCount);
      expect(taal.mridangaPattern.length).toBe(taal.beatsCount);
      expect(taal.cymbalsPattern.length).toBe(taal.beatsCount);
      expect(taal.defaultBpm).toBeGreaterThan(50);
    }

    const bhajani = VARKARI_TAALS.find((t) => t.id === 'bhajani')!;
    expect(bhajani.beatsCount).toBe(8);
    expect(bhajani.bol[0]).toBe('धा');

    const roopak = VARKARI_TAALS.find((t) => t.id === 'roopak')!;
    expect(roopak.beatsCount).toBe(7);

    const dadra = VARKARI_TAALS.find((t) => t.id === 'dadra')!;
    expect(dadra.beatsCount).toBe(6);
  });

  it('TC-NITYA-005: retrieves real data payload linking compositions, taals, and wari stops', async () => {
    const payload = await getNityanemData('HARIPATH', 5);
    expect(payload.activeProhar.id).toBe('HARIPATH');
    expect(Array.isArray(payload.compositions)).toBe(true);
    expect(Array.isArray(payload.taals)).toBe(true);
    expect(Array.isArray(payload.wariStops)).toBe(true);
    expect(payload.allProhars.length).toBe(5);
  });
});

describe('Varkari Nityanem API — Handler & Validation', () => {
  it('TC-NITYA-API-001: returns 200 and structured Nityanem payload on GET', async () => {
    const req = new NextRequest('http://localhost:3000/api/nityanem');
    const res = await handleNityanemGet(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.activeProhar).toBeDefined();
    expect(body.allProhars.length).toBe(5);
    expect(Array.isArray(body.compositions)).toBe(true);
    expect(Array.isArray(body.taals)).toBe(true);
    expect(Array.isArray(body.wariStops)).toBe(true);
  });

  it('TC-NITYA-API-002: filters by valid prohar parameter', async () => {
    const req = new NextRequest('http://localhost:3000/api/nityanem?prohar=KAKAD_AARTI&limit=3');
    const res = await handleNityanemGet(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.activeProhar.id).toBe('KAKAD_AARTI');
    expect(body.compositions.length).toBeLessThanOrEqual(3);
  });

  it('TC-NITYA-API-003: rejects invalid prohar parameter with 400 INVALID_PROHAR', async () => {
    const req = new NextRequest('http://localhost:3000/api/nityanem?prohar=INVALID_WATCH');
    const res = await handleNityanemGet(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.code).toBe('INVALID_PROHAR');
    expect(body.error).toContain('Invalid prohar parameter');
  });
});
