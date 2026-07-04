// @ts-nocheck
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = `C:\\Users\\Dinesh Nikam\\.gemini\\antigravity-ide\\brain\\2753a087-cf8b-4c23-b992-9829e3b2b283`;
const PUBLIC_DIR = path.resolve('./public');

// 1. Mappings of generated PNG images in Artifact Directory to their final JPEG destinations
const GENERATED_IMAGES = [
  { src: 'aarti_1783142355512.png', dest: 'images/categories/aarti.jpg' },
  { src: 'abhang_1783142367455.png', dest: 'images/categories/abhang.jpg' },
  { src: 'bhajan_1783142381232.png', dest: 'images/categories/bhajan.jpg' },
  { src: 'haripath_1783142393950.png', dest: 'images/categories/haripath.jpg' },
  { src: 'stotra_1783142405985.png', dest: 'images/categories/stotra.jpg' },
  { src: 'temple_aarti_1783142417379.png', dest: 'images/realistic/temple-aarti.jpg' },
  { src: 'ancient_manuscript_1783142428345.png', dest: 'images/realistic/ancient-manuscript.jpg' },
  { src: 'chandrabhaga_river_1783142439403.png', dest: 'images/realistic/chandrabhaga-river.jpg' },
  { src: 'pandharpur_temple_1783142452406.png', dest: 'images/realistic/pandharpur-temple.jpg' },
  { src: 'saint_devotional_1783142464509.png', dest: 'images/realistic/saint-devotional.jpg' },
  { src: 'wari_procession_1783142476984.png', dest: 'images/realistic/wari-procession.jpg' },
  { src: 'dnyaneshwar_1783142490728.png', dest: 'images/saints/dnyaneshwar.jpg' },
  { src: 'panduranga_vitthal_1783142506560.png', dest: 'images/saints/panduranga-vitthal.jpg' },
  { src: 'tukaram_birthplace_1783142519048.png', dest: 'images/saints/tukaram-birthplace.jpg' },
  { src: 'ashadi_ekadashi_1783142532091.png', dest: 'images/festivals/ashadi-ekadashi.jpg' },
  { src: 'gudi_padwa_1783142545848.png', dest: 'images/festivals/gudi-padwa.jpg' },
  { src: 'kartiki_purnima_1783142557520.png', dest: 'images/festivals/kartiki-purnima.jpg' }
];

// 2. Unsplash URLs for the 24 registry images in assets-registry
const REGISTRY_IMAGES = {
  s11: 'photo-1542224566-6e85f2e6772f', // Bhandara Dongar (River/Temple view)
  s12: 'photo-1507525428034-b723cf961d3e', // Chandrabhaga Shore (Sunset beach)
  s13: 'photo-1604871000636-074fa5117945', // Tulsi Mala
  s14: 'photo-1518005020951-eccb494ad742', // Temple entrance
  s16: 'photo-1502082553048-f009c37129b9', // Ajan Vriksha
  s17: 'photo-1544644181-1484b3fdfc62', // Manuscripts
  s18: 'photo-1582510003544-4d00b7f74220', // Bhajan Cymbals
  p1: 'photo-1590076211831-299f24ba8382', // Golden Shikhara
  p3: 'photo-1562016600-ece13e8ba570', // Devotees queue
  p5: 'photo-1605276374104-dee2a0ed3cd6', // Lamps of the Sanctum
  p12: 'photo-1447752875215-b2761acb3c5d', // Namdev Payari
  p17: 'photo-1604871000636-074fa5117945', // Lord Vitthal representation
  p19: 'photo-1502082553048-f009c37129b9', // Gopalpur Temple Area
  w1: 'photo-1473163928189-364b2c4e1135', // Wari Pilgrimage
  w5: 'photo-1590076211831-299f24ba8382', // Palkhi Start
  w6: 'photo-1545128485-c400e7702796', // Elderly Warkari
  w7: 'photo-1506126613408-eca07ce68773', // Ringan Ceremony
  w12: 'photo-1518241353330-0f7941c2d9b5', // Veena carrying
  w13: 'photo-1604871000636-074fa5117945', // Sandalwood mark
  w16: 'photo-1519817650390-64a93db51149', // Women carrying Tulsi
  f2: 'photo-1532186212198-d8f8b8cf8d2e', // Gudi Padwa
  f18: 'photo-1544644181-1484b3fdfc62', // Bhandara Festival
  h1: 'photo-1589308078059-be1415eab4c3', // Raigad Fort
  h13: 'photo-1604871000636-074fa5117945' // Paithani weaving
};

async function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function downloadImage(id: string, destPath: string) {
  const url = `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;
  console.log(`Downloading ${url} to ${destPath}...`);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await sharp(buffer)
      .jpeg({ quality: 85 })
      .toFile(destPath);
    console.log(`Successfully saved ${destPath}`);
  } catch (err) {
    console.error(`Failed to download ${id}:`, err);
  }
}

async function drawPwaIcon(size: number, destPath: string) {
  console.log(`Drawing programmatically PWA icon (${size}x${size}) to ${destPath}...`);
  const svgMarkup = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg-grad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
          <stop offset="0%" stop-color="#FF9933" />
          <stop offset="100%" stop-color="#CC5500" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg-grad)" rx="${size * 0.2}" />
      <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.38}" fill="none" stroke="#FFD700" stroke-width="${size * 0.04}" stroke-dasharray="${size * 0.03} ${size * 0.02}" />
      
      <!-- Saffron flag (Bhagwa) silhouette -->
      <path d="M ${size * 0.35} ${size * 0.2} 
               L ${size * 0.7} ${size * 0.35} 
               L ${size * 0.55} ${size * 0.45} 
               L ${size * 0.7} ${size * 0.55} 
               L ${size * 0.35} ${size * 0.7} Z" 
            fill="#FF4500" stroke="#FFD700" stroke-width="${size * 0.02}" stroke-linejoin="round" />
      
      <!-- Flagpole -->
      <line x1="${size * 0.35}" y1="${size * 0.18}" x2="${size * 0.35}" y2="${size * 0.82}" stroke="#FFD700" stroke-width="${size * 0.03}" stroke-linecap="round" />
      <!-- Finial -->
      <circle cx="${size * 0.35}" cy="${size * 0.18}" r="${size * 0.035}" fill="#FFD700" />
    </svg>
  `;

  await sharp(Buffer.from(svgMarkup))
    .png()
    .toFile(destPath);
  console.log(`Saved PWA icon to ${destPath}`);
}

async function run() {
  console.log('Starting image asset processing & update...');

  // 1. Process generated category, realistic, saint, festival images
  for (const item of GENERATED_IMAGES) {
    const srcPath = path.join(ARTIFACT_DIR, item.src);
    const destPath = path.join(PUBLIC_DIR, item.dest);
    
    if (!fs.existsSync(srcPath)) {
      console.warn(`Source generated file not found: ${srcPath}`);
      continue;
    }

    await ensureDir(path.dirname(destPath));
    console.log(`Processing & converting ${srcPath} -> ${destPath}...`);
    await sharp(srcPath)
      .jpeg({ quality: 85 })
      .toFile(destPath);
    console.log(`Processed successfully.`);
  }

  // 2. Programmatically generate PWA icons (replacing blank/pixel ones)
  const iconSizes = [192, 384, 512];
  const iconsDir = path.join(PUBLIC_DIR, 'icons');
  await ensureDir(iconsDir);
  for (const size of iconSizes) {
    const actualDest = path.join(iconsDir, `icon-${size}x${size}.png`);
    await drawPwaIcon(size, actualDest);
  }

  // 3. Download the 24 registry images
  const registryDir = path.join(PUBLIC_DIR, 'images/registry');
  await ensureDir(registryDir);
  for (const [key, id] of Object.entries(REGISTRY_IMAGES)) {
    const destPath = path.join(registryDir, `${key}.jpg`);
    await downloadImage(id, destPath);
  }

  // 4. Overwrite/fallback registry images with our high-quality generated local assets
  console.log('Writing local authentic copies to registry folder...');
  const registryOverrides = [
    { src: 'images/saints/tukaram-birthplace.jpg', dest: 'images/registry/s11.jpg' }, // Dehu Woods / Indrayani
    { src: 'images/realistic/chandrabhaga-river.jpg', dest: 'images/registry/s12.jpg' }, // Chandrabhaga shore
    { src: 'images/realistic/ancient-manuscript.jpg', dest: 'images/registry/s17.jpg' }, // Devotional manuscripts
    { src: 'images/categories/bhajan.jpg', dest: 'images/registry/s18.jpg' }, // Bhajan cymbals
    { src: 'images/realistic/pandharpur-temple.jpg', dest: 'images/registry/p1.jpg' }, // Golden Shikhara
    { src: 'images/saints/panduranga-vitthal.jpg', dest: 'images/registry/p17.jpg' }, // Lord Vitthal Statue
    { src: 'images/realistic/wari-procession.jpg', dest: 'images/registry/w1.jpg' }, // Wari Foot Pilgrimage
    { src: 'images/realistic/wari-procession.jpg', dest: 'images/registry/w5.jpg' }, // Palkhi start
    { src: 'images/realistic/saint-devotional.jpg', dest: 'images/registry/w6.jpg' }, // Elderly Warkari
    { src: 'images/categories/abhang.jpg', dest: 'images/registry/w12.jpg' }, // Veena player
    { src: 'images/festivals/gudi-padwa.jpg', dest: 'images/registry/f2.jpg' } // Gudi Padwa
  ];

  for (const item of registryOverrides) {
    const srcPath = path.join(PUBLIC_DIR, item.src);
    const destPath = path.join(PUBLIC_DIR, item.dest);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied ${item.src} -> ${item.dest}`);
    }
  }

  // 5. Convert and copy local high-quality png files to registry folder
  const pngOverrides = [
    { src: 'images/tulsi-mala.png', dest: 'images/registry/s13.jpg' },
    { src: 'images/jejuri-bhandara.png', dest: 'images/registry/f18.jpg' }
  ];

  for (const item of pngOverrides) {
    const srcPath = path.join(PUBLIC_DIR, item.src);
    const destPath = path.join(PUBLIC_DIR, item.dest);
    if (fs.existsSync(srcPath)) {
      console.log(`Converting PNG ${item.src} to JPG ${item.dest}...`);
      await sharp(srcPath)
        .jpeg({ quality: 85 })
        .toFile(destPath);
    }
  }

  console.log('All image processing complete!');
}

run().catch(console.error);

