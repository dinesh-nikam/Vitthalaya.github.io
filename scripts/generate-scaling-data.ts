/**
 * Digital Pandharpur — Enterprise Scale Synthetic Data Generator
 * 
 * Generates and bulk-inserts millions of unique, grammatically coherent Marathi 
 * devotional compositions to test the 10M+ record partitioning and search indexes.
 * 
 * Usage:
 *   bun run scripts/generate-scaling-data.ts --count=10000
 *   bun run scripts/generate-scaling-data.ts --count=1000000
 */

import { parseArgs } from 'util';
import { db } from '../src/db/client';
import { contentHash } from '../src/canonical/normalization';

// ─── Word Lists & Structural Templates ──────────────────────────────────────

const SAINTS = [
  { name: 'तुकाराम महाराज', translit: 'Tukaram Maharaj', slug: 'tukaram-maharaj' },
  { name: 'द्न्यादेश्वर महाराज', translit: 'Dnyaneshwar Maharaj', slug: 'dnyaneshwar-maharaj' },
  { name: 'नामदेव महाराज', translit: 'Namdev Maharaj', slug: 'namdev-maharaj' },
  { name: 'एकनाथ महाराज', translit: 'Eknath Maharaj', slug: 'eknath-maharaj' }
];

const DEITIES = [
  { name: 'विठ्ठल', translit: 'Vitthal' },
  { name: 'शिव', translit: 'Shiva' },
  { name: 'देवी', translit: 'Devi' },
  { name: 'गणपती', translit: 'Ganpati' }
];

const TYPES = ['ABHANG', 'AARTI', 'BHAJAN', 'STOTRA', 'HARIPATH', 'GAULANI'];

const FIRST_LINES = [
  'कर जोडूनी उभा विठ्ठला', 'हरीचे नाम सदा मुखी', 'विठ्ठल विठ्ठल गजर करू', 
  'पांडुरंग रूप साजिरे', 'चरणी तुझ्या आलो माऊली', 'आनंदाचे डोही आनंद तरंग',
  'तुझी सेवा घडो श्रीहरी', 'नामस्मरण हेचि तप थोर', 'विटेवरी उभा पांडुरंग हरी'
];

const BODY_TEMPLATES = [
  [
    'विठ्ठल माऊली विठ्ठल हरी । भक्तांच्या मनोरथा करी ॥१॥',
    'पांडुरंग रूप विटेवरी उभे । पाहुनी मन आनंदे लोभे ॥२॥',
    'संत कृपेने लाधला हा पंथ । विठ्ठल वाहे मार्ग अनंत ॥३॥',
    'तुका म्हणे शरण आलो पाया । हरी चरणी विलीन काया ॥४॥'
  ],
  [
    'ज्ञानेश्वर सांगतसे ज्ञान । नामस्मरणे शुद्ध होई मन ॥१॥',
    'हरीनाम गाता मिळे शांती । संसाराची सुटे भ्रांती ॥२॥',
    'अलकापुरीत शोभते पावन विहीर । दर्शन घेता शांत होय शरीर ॥३॥',
    'ज्ञानदेवा शरण पांडुरंगा । भक्तीचा हा वाहे गंगा ॥४॥'
  ],
  [
    'नामा म्हणे भक्तीचे हे सुख । पाहुनी पळाले सर्व दुःख ॥१॥',
    'विठोबाचे नाम गोड लागे । संतांची सावली मागोमागे ॥२॥',
    'कीर्तनाचा हा रंग आगळा । विठ्ठल चरणी लागला लळा ॥३॥',
    'अनाम नामाचा हा संकीर्तन थोर । नाचे भक्तजन आनंद अपार ॥४॥'
  ],
  [
    'नाथ म्हणे करा शुद्ध आचार । विठ्ठल भक्तीचा हाचि विचार ॥१॥',
    'कथा कीर्तन विठ्ठल गाथा । चरणी विठोबाच्या ठेवा माथा ॥२॥',
    'शांती क्षमा दया ज्याचे अंगी । तोची भक्त खरा जगी ॥३॥',
    'एका जनार्दनी शरण हरी । मोक्ष मिळे त्याच्या दारी ॥४॥'
  ]
];

const MEANINGS = [
  'या अभंगात विठ्ठलाच्या नामस्मरणाचे आणि भक्तीचे महत्त्व स्पष्ट केले आहे.',
  'संसारातील दुःखातून मुक्ती मिळवण्यासाठी पांडुरंगाचे ध्यान करणे हाच खरा मार्ग आहे.',
  'संतांच्या सहवासात राहून विठ्ठलाचे संकीर्तन केल्याने मनात सुख आणि शांती नांदते.',
  'मनाची शुद्धता आणि परोपकार या गुणांशिवाय ईश्वर भक्ती अपूर्ण असल्याचे सांगितले आहे.'
];

// ─── Generator Function ─────────────────────────────────────────────────────

function generateComposition(index: number, saintDbIds: string[], deityDbIds: string[]): any {
  const seed = index;
  const saintIdx = seed % SAINTS.length;
  const deityIdx = seed % DEITIES.length;
  const typeIdx = seed % TYPES.length;
  const firstLineIdx = seed % FIRST_LINES.length;
  const bodyIdx = seed % BODY_TEMPLATES.length;
  const meaningIdx = seed % MEANINGS.length;

  const saintId = saintDbIds[saintIdx] || null;
  const deityId = deityDbIds[deityIdx] || null;
  
  const title = `${FIRST_LINES[firstLineIdx]} (क्रमांक ${index})`;
  const fullText = BODY_TEMPLATES[bodyIdx].join('\n');
  const hash = contentHash(fullText + index);
  const slug = `comp-scale-${index}-${hash.substring(0, 8)}`;

  return {
    titleMarathi: title,
    titleTranslit: `Scale Composition ${index}`,
    slug,
    type: TYPES[typeIdx],
    fullText,
    meaning: MEANINGS[meaningIdx],
    saintId,
    deityId,
    region: 'महाराष्ट्र',
    source: 'Scale Test Data Generator',
    reviewed: true,
    contentHash: hash,
    audioLinks: '[]'
  };
}

// ─── Main Execution ─────────────────────────────────────────────────────────

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      count: { type: 'string', short: 'n', default: '10000' }
    }
  });

  const count = parseInt(values.count || '10000', 10);
  console.log(`\n🚀 DIGITAL PANDHARPUR SCALE TEST GENERATOR`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Target Count:  ${count.toLocaleString()} Compositions`);
  console.log(`DB Mode:       ${db.$queryRawUnsafe ? 'PostgreSQL/SQLite' : 'Compatibility Shim'}`);

  const start = Date.now();

  // 1. Resolve Saints & Deities from DB to establish relational mappings
  const dbSaints = await db.saint.findMany({ select: { id: true } });
  const dbDeities = await db.deity.findMany({ select: { id: true } });

  const saintIds = dbSaints.map((s: any) => s.id);
  const deityIds = dbDeities.map((d: any) => d.id);

  if (saintIds.length === 0 || deityIds.length === 0) {
    console.error('❌ Saints or Deities not found in database. Run "bun run db:seed" first.');
    process.exit(1);
  }

  // 2. Insert in chunks to optimize memory and speed
  const CHUNK_SIZE = 5000;
  let inserted = 0;

  console.log(`\nIngesting in batches of ${CHUNK_SIZE.toLocaleString()}...`);

  for (let i = 0; i < count; i += CHUNK_SIZE) {
    const chunkLimit = Math.min(CHUNK_SIZE, count - i);
    const compositions = [];

    for (let j = 0; j < chunkLimit; j++) {
      compositions.push(generateComposition(i + j + 1, saintIds, deityIds));
    }

    try {
      // Prisma createMany is extremely optimized for PostgreSQL
      await db.composition.createMany({
        data: compositions,
        skipDuplicates: true
      });
      inserted += chunkLimit;
      
      const progress = ((inserted / count) * 100).toFixed(1);
      process.stdout.write(`\r  → Ingested: ${inserted.toLocaleString()} / ${count.toLocaleString()} (${progress}%)`);
    } catch (err: any) {
      // SQLite fallback: Prisma createMany might fail on SQLite setups
      // If failed, insert sequentially for this chunk
      for (const comp of compositions) {
        try {
          await db.composition.create({
            data: comp
          });
          inserted++;
        } catch {
          // Skip duplicates
        }
      }
      process.stdout.write(`\r  → Ingested (fallback): ${inserted.toLocaleString()} / ${count.toLocaleString()}`);
    }
  }

  const durationSec = (Date.now() - start) / 1000;
  console.log(`\n\n🟢 Scale Ingestion Complete!`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Compositions Created:  ${inserted.toLocaleString()}`);
  console.log(`Execution Time:        ${durationSec.toFixed(2)} seconds`);
  console.log(`Ingestion Speed:       ${Math.round(inserted / durationSec).toLocaleString()} compositions/sec`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().catch((err) => {
  console.error('❌ Generator failed:', err);
  process.exit(1);
});
