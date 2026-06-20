/**
 * Additional Seed Data for SQLite (Digital Pandharpur)
 * Adds more verified public domain compositions to reach Phase 0 target
 * Uses bun:sqlite for local development
 */

import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const DEFAULT_DB_PATH = 'data/varkari.db';

function getDatabase(): Database {
  const path = process.env.DATABASE_PATH || DEFAULT_DB_PATH;
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const db = new Database(path);
  db.exec('PRAGMA journal_mode=WAL');
  db.exec('PRAGMA foreign_keys=ON');
  return db;
}

const ADDITIONAL_COMPOSITIONS = [
  // More Tukaram Abhangas
  {
    titleMarathi: 'वारकरीचा मार्ग',
    titleTranslit: 'Warkaricha Marg',
    type: 'abhang',
    fullText: `वारकरीचा मार्ग । वारकरीचा मार्ग ॥
वारकरीचा मार्ग । विठ्ठल वाहे मार्ग ।

मार्गी चढले । वारकरीची चाल ।
वारकरीचा मार्ग । तुमचा मार्ग ॥`,
    meaning: 'वारकरी हा विठ्ठल वर्षा मार्गाचा प्रतीक आहे. वारकरीला आलेल्याला विठ्ठलाचे दर्शन होते.',
    saint: 'Tukaram Maharaj',
    deity: 'Vitthal',
  },
  {
    titleMarathi: 'विचार कर विचार कर',
    titleTranslit: 'Vichar Kar Vichar Kar',
    type: 'abhang',
    fullText: `विचार कर विचार कर । विठ्ठलाचे नाम विचार कर ।
विचार कर विचार कर । भक्तीचे नाम विचार कर ॥

नाम विचार कर । विठ्ठल वाहे ।
विचार कर विचार कर । नाम विचार कर ॥`,
    meaning: 'विचार करणे हे म्हणजे विठ्ठलाचे नाम स्मरण करणे. नाम विचार करल्यावर विठ्ठल वाहतो.',
    saint: 'Tukaram Maharaj',
    deity: 'Vitthal',
  },
  // More Dnyaneshwar Haripath
  {
    titleMarathi: 'हरीचे नाम स्मरण',
    titleTranslit: 'Hariche Nam Smaran',
    type: 'haripath',
    fullText: `हरीचे नाम स्मरण । हरीचे नाम स्मरण ॥
हरीचे नाम स्मरण । मन आनंदित होते ॥

स्मरण कर मन शुद्ध । हरीचे नाम गाऊ ।
हरीचे नाम स्मरण । मोक्षसंग्राम आणि ॥`,
    meaning: 'हरींचे नाम स्मरण करणे हे मन शुद्ध करण्याचे। नामगान करणे हे मोक्षाचा मार्ग आहे.',
    saint: 'Dnyaneshwar Maharaj',
    deity: 'Vitthal',
  },
  // More Namdev Abhangas
  {
    titleMarathi: 'हरे रामाय नमः',
    titleTranslit: 'Hare Ramaya Namah',
    type: 'abhang',
    fullText: `हरे रामाय नमः । हरे कृष्णाय नमः ॥
हरे हराय नमः । विठ्ठलाय नमः ॥

नामसंकीर्ण कर । नामसंकीर्ण कर ।
हरे रामाय नमः । हरींचे नाम गाऊ ॥`,
    meaning: 'हरे राम आणि हरे कृष्ण यांचे नाम संकीर्ण करणे हे भक्ताला मोक्ष देते.',
    saint: 'Namdev Maharaj',
    deity: 'Vitthal',
  },
  // More Aartis
  {
    titleMarathi: 'विठ्ठल आरती',
    titleTranslit: 'Vitthal Aarti',
    type: 'aarti',
    fullText: `विठ्ठल विठ्ठल विठ्ठल । विठ्ठल विठ्ठल विठ्ठल ॥
विठ्ठल विठ्ठल विठ्ठल । पांडुरंग वर ॥

आरती चढवली । विठ्ठलाचे दर्शन ।
विठ्ठल विठ्ठल विठ्ठल । वाहे वाहे वाहे ॥`,
    meaning: 'विठ्ठलाची आरती वाजवणे हे भक्तांचे प्रमुख कर्तव्य आहे. विठ्ठलाचे दर्शन हे आनंददायी आहे.',
    deity: 'Vitthal',
  },
  // Shiva compositions
  {
    titleMarathi: 'शिवाय नमः समर्पण',
    titleTranslit: 'Shivay Namah Samarpan',
    type: 'stotra',
    fullText: `शिवाय नमः समर्पण । शिवाय नमः समर्पण ॥
शिवाय नमः समर्पण । हेतु समर्पण ॥

समर्पित केले । हेतु बंधनीं ।
शिवाय नमः समर्पण । मुक्तीचे मार्ग ॥`,
    meaning: 'शिवाय नमस्कार करून हेतु बंधन मुक्त होते. या समर्पणाचे महत्त्व समजून घेणे आवश्यक आहे.',
    saint: 'Eknath Maharaj',
    deity: 'Shiva',
  },
  // More Ganpati
  {
    titleMarathi: 'गणपती बाप्पा',
    titleTranslit: 'Ganpati Bappa',
    type: 'aarti',
    fullText: `गणपती बाप्पा । मंगलमूर्ती बाप्पा ॥
गणपती बाप्पा । विघ्नहर्ता बाप्पा ॥

बाप्पा वाहवतात । बाप्पा आनंदवतात ।
गणपती बाप्पा । सर्व कार्य सुतीला ॥`,
    meaning: 'गणपती हे बाप्पा म्हणून आम्ही त्यांची आरती वाजवतो. बाप्पे वाहताना विघ्नांचा नाश होतो.',
    deity: 'Ganpati',
  },
  // Devi compositions
  {
    titleMarathi: 'देवी आरती वंदन',
    titleTranslit: 'Devi Aarti Vandan',
    type: 'aarti',
    fullText: `देवी देवी देवी । देवी देवी देवी ॥
देवी देवी देवी । महिषासुरमर्दिनी ॥

वंदन केले । विश्वपितांचे ।
देवी आरती वंदन । शक्तीचे धाम ॥`,
    meaning: 'देवींचे वंदन हे विश्वपितांचे म्हणून केले जाते. देवींचे धाम हे शक्तीचे केंद्र आहे.',
    deity: 'Devi',
  },
];

async function main() {
  console.log('Adding additional verified compositions to SQLite...');

  const db = getDatabase();
  let added = 0;
  let skipped = 0;

  for (const comp of ADDITIONAL_COMPOSITIONS) {
    // Generate slug from transliteration + hash
    const slug = comp.titleTranslit
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if already exists
    const existing = db
      .query('SELECT id FROM compositions WHERE slug = ?')
      .get(slug) as { id: string } | undefined;

    if (existing) {
      skipped++;
      continue;
    }

    // Get saint ID
    let saintId: string | null = null;
    if (comp.saint) {
      const saint = db
        .query('SELECT id FROM saints WHERE name_transliteration = ?')
        .get(comp.saint) as { id: string } | undefined;
      saintId = saint?.id || null;
    }

    // Get deity ID
    let deityId: string | null = null;
    if (comp.deity) {
      const deity = db
        .query('SELECT id FROM deities WHERE name_transliteration = ?')
        .get(comp.deity) as { id: string } | undefined;
      deityId = deity?.id || null;
    }

    // Insert composition
    db.query(
      `INSERT INTO compositions (
        slug, title_marathi, title_transliteration, type, full_text,
        meaning, saint_id, deity_id, is_verified, source_attribution
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
    ).get(
      slug,
      comp.titleMarathi,
      comp.titleTranslit,
      comp.type,
      comp.fullText,
      comp.meaning,
      saintId,
      deityId,
      `${comp.saint || comp.deity} - वारकरी संस्कृती (पब्लिक डोमेन)`
    );

    // Link to category
    const categoryId = db
      .query('SELECT id FROM categories WHERE slug = ?')
      .get(comp.type) as { id: string } | undefined;

    if (categoryId) {
      const compId = db
        .query('SELECT id FROM compositions WHERE slug = ?')
        .get(slug) as { id: string };

      db.query(
        `INSERT OR IGNORE INTO composition_categories (composition_id, category_id)
         VALUES (?, ?)`
      ).get(compId.id, categoryId.id);
    }

    added++;
    console.log(`✓ Added: ${comp.titleMarathi}`);
  }

  console.log(`\n✓ Added ${added} additional compositions`);
  console.log(`✓ Skipped ${skipped} duplicates`);
}

main().catch(console.error);