#!/usr/bin/env bun
/**
 * Sync SQLite data to PostgreSQL.
 * One-shot: reads from SQLite, writes to PostgreSQL via Prisma.
 */
import { PrismaClient } from '@prisma/client';
import Database from 'bun:sqlite';

const SQLITE_PATH = 'data/varkari.db';
const prisma = new PrismaClient();
const sqlite = new Database(SQLITE_PATH, { readonly: true });

async function sync() {
  console.log('Syncing SQLite → PostgreSQL...\n');

  // ── Saints ──
  const saints = sqlite.query('SELECT * FROM saints').all() as any[];
  console.log(`Saints: ${saints.length}`);
  for (const s of saints) {
    await prisma.saint.upsert({
      where: { nameTranslit: s.name_transliteration },
      update: { period: s.period, biography: s.biography, region: s.region },
      create: {
        id: s.id,
        nameMarathi: s.name_marathi,
        nameTranslit: s.name_transliteration,
        slug: s.name_transliteration.toLowerCase().replace(/\s+/g, '-'),
        period: s.period,
        biography: s.biography,
        region: s.region,
      },
    });
  }

  // ── Deities ──
  const deities = sqlite.query('SELECT * FROM deities').all() as any[];
  console.log(`Deities: ${deities.length}`);
  for (const d of deities) {
    await prisma.deity.upsert({
      where: { nameTranslit: d.name_transliteration },
      update: { iconName: d.icon_name },
      create: {
        id: d.id,
        nameMarathi: d.name_marathi,
        nameTranslit: d.name_transliteration,
        iconName: d.icon_name,
      },
    });
  }

  // ── Festivals ──
  const festivals = sqlite.query('SELECT * FROM festivals').all() as any[];
  console.log(`Festivals: ${festivals.length}`);
  for (const f of festivals) {
    await prisma.festival.upsert({
      where: { nameTranslit: f.name_transliteration },
      update: { dateRule: f.date_rule, monthDayRule: f.month_day_rule },
      create: {
        id: f.id,
        nameMarathi: f.name_marathi,
        nameTranslit: f.name_transliteration,
        dateRule: f.date_rule,
        monthDayRule: f.month_day_rule,
      },
    });
  }

  // ── Categories ──
  const categories = sqlite.query('SELECT * FROM categories').all() as any[];
  console.log(`Categories: ${categories.length}`);
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { description: c.description },
      create: {
        id: c.id,
        nameMarathi: c.name_marathi,
        nameTranslit: c.name_transliteration,
        slug: c.slug,
        description: c.description,
      },
    });
  }

  // ── Compositions ──
  const comps = sqlite.query('SELECT * FROM compositions').all() as any[];
  console.log(`Compositions: ${comps.length}`);
  let count = 0;
  for (const c of comps) {
    try {
      await prisma.composition.upsert({
        where: { slug: c.slug },
        update: {
          fullText: c.full_text,
          meaning: c.meaning,
          region: c.region,
          source: c.source_attribution,
          reviewed: c.is_verified === 1,
        },
        create: {
          id: c.id,
          titleMarathi: c.title_marathi,
          titleTranslit: c.title_transliteration,
          slug: c.slug,
          type: c.type,
          fullText: c.full_text,
          meaning: c.meaning,
          saintId: c.saint_id,
          deityId: c.deity_id,
          region: c.region,
          source: c.source_attribution,
          audioLinks: c.audio_links,
          reviewed: c.is_verified === 1,
        },
      });
      count++;
    } catch (err) {
      console.error(`  ✗ Error inserting ${c.title_marathi}:`, (err as Error).message.slice(0, 80));
    }
  }

  console.log(`\n✓ Synced ${count}/${comps.length} compositions`);
  await prisma.$disconnect();
}

sync().catch((err) => { console.error(err); process.exit(1); });
