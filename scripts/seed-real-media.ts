/**
 * One-time backfill: wires up pre-existing real image assets in /public/images
 * to the saints they clearly correspond to, and registers them (plus the
 * general "realistic" heritage photo set) in the Media library so editors
 * can attach them to CMS pages via /admin/pages.
 *
 * Intentionally conservative: only saints with an unambiguous matching
 * filename get an imageUrl. We do not guess a mapping for the "registry"
 * folder's cryptically-named files (f2.jpg, s11.jpg, etc.) since their
 * subject and license provenance cannot be verified from the filename
 * alone — see docs/postgresql-migration.md "Known follow-ups" for saints
 * still needing a real, sourced portrait (Namdev, Eknath, Samarth Ramdas,
 * Janabai).
 *
 * License metadata is intentionally left as "Unverified — confirm source"
 * rather than a fabricated Creative Commons / public-domain claim, because
 * the true provenance of these pre-existing files is unknown to this
 * script. A content editor must confirm real licensing before these assets
 * are used in any context requiring attribution guarantees.
 */
import { db } from '../src/db/client';

const UNVERIFIED_LICENSE = 'Unverified — confirm source before public attribution claims';

const SAINT_IMAGE_MAP: Record<string, string> = {
  'Sant Dnyaneshwar': '/images/saints/dnyaneshwar.jpg',
  'Dnyaneshwar Maharaj': '/images/saints/dnyaneshwar.jpg',
  'Sant Tukaram': '/images/saints/tukaram-birthplace.jpg',
  'Tukaram Maharaj': '/images/saints/tukaram-birthplace.jpg',
};

const HERITAGE_MEDIA = [
  { url: '/images/realistic/pandharpur-temple.jpg', altText: 'पंढरपूर विठ्ठल मंदिर — Pandharpur Vitthal Temple', caption: 'श्री विठ्ठल-रुक्मिणी मंदिर, पंढरपूर' },
  { url: '/images/realistic/chandrabhaga-river.jpg', altText: 'चंद्रभागा नदी, पंढरपूर — Chandrabhaga river, Pandharpur', caption: 'चंद्रभागा नदी तीर' },
  { url: '/images/realistic/ancient-manuscript.jpg', altText: 'प्राचीन हस्तलिखित भक्ती साहित्य — Ancient devotional manuscript', caption: 'ऐतिहासिक हस्तलिखित' },
  { url: '/images/realistic/saint-devotional.jpg', altText: 'भक्तिभावाने वारकरी — Devotee in prayer', caption: 'भक्तिभाव' },
  { url: '/images/realistic/temple-aarti.jpg', altText: 'मंदिरातील आरती — Temple aarti ceremony', caption: 'आरती सोहळा' },
  { url: '/images/realistic/wari-procession.jpg', altText: 'वारी पालखी मिरवणूक — Wari palkhi procession', caption: 'आषाढी वारी' },
  { url: '/images/saints/panduranga-vitthal.jpg', altText: 'पांडुरंग विठ्ठल — Panduranga Vitthal', caption: 'श्री पांडुरंग' },
];

async function main() {
  console.log('=== Seeding real media into Saint.imageUrl and Media library ===\n');

  let saintsUpdated = 0;
  for (const [nameTranslit, imageUrl] of Object.entries(SAINT_IMAGE_MAP)) {
    const saint = await db.saint.findUnique({ where: { nameTranslit } });
    if (!saint) {
      console.warn(`  ⚠ No saint found with nameTranslit "${nameTranslit}" — skipped`);
      continue;
    }
    if (saint.imageUrl) {
      console.log(`  – ${nameTranslit} already has an image, leaving as-is`);
      continue;
    }
    await db.saint.update({ where: { id: saint.id }, data: { imageUrl } });
    console.log(`  ✓ ${nameTranslit} -> ${imageUrl}`);
    saintsUpdated++;
  }

  let mediaCreated = 0;
  for (const item of HERITAGE_MEDIA) {
    const existing = await db.media.findFirst({ where: { url: item.url } });
    if (existing) continue;
    await db.media.create({
      data: {
        url: item.url,
        altText: item.altText,
        caption: item.caption,
        license: UNVERIFIED_LICENSE,
      },
    });
    mediaCreated++;
  }

  console.log(`\nSaints updated: ${saintsUpdated}`);
  console.log(`Media library entries created: ${mediaCreated}`);
  console.log(`\nFollow-up needed: source real, licensed portraits for saints still`);
  console.log(`without an image (Namdev, Eknath, Samarth Ramdas Swami, Janabai), and`);
  console.log(`verify true licensing of the "registry" image set before public use.`);
}

main().catch(console.error).finally(() => process.exit(0));
