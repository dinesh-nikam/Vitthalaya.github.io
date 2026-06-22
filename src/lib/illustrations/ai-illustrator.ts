/**
 * AI Illustration Engine — generates saint portraits, temple silhouettes,
 * decorative borders, and themed artwork using algorithmic canvas/SVG rendering.
 *
 * Phase 5: Algorithmic generation. Future: AI model integration.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type IllustrationStyle = 'sketch' | 'silhouette' | 'ornate' | 'minimal' | 'watercolor';
export type IllustrationSubject = 'saint' | 'temple' | 'diya' | 'lotus' | 'palkhi' | 'tulsi' | 'vitthal' | 'floral';

export interface IllustrationConfig {
  subject: IllustrationSubject;
  style: IllustrationStyle;
  width: number;
  height: number;
  primaryColor: string;
  accentColor?: string;
  backgroundColor?: string;
  saintName?: string;       // For saint portraits
  includeBorder?: boolean;
  borderStyle?: 'temple' | 'floral' | 'geometric' | 'mandala';
}

// ── Main Generator ────────────────────────────────────────────────────────────

export function generateIllustration(config: IllustrationConfig): string {
  const bg = config.backgroundColor ?? 'transparent';

  let svg = `<svg width="${config.width}" height="${config.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg}" />
      <stop offset="100%" stop-color="${adjustColor(bg, -10)}" />
    </linearGradient>
  </defs>
  <rect width="${config.width}" height="${config.height}" fill="url(#bg-grad)"/>`;

  // Add border
  if (config.includeBorder) {
    svg += generateBorder(config);
  }

  // Add subject
  svg += generateSubject(config);

  svg += '</svg>';
  return svg;
}

// ── Border Generator ──────────────────────────────────────────────────────────

function generateBorder(config: IllustrationConfig): string {
  const style = config.borderStyle ?? 'temple';
  const color = config.accentColor ?? config.primaryColor;
  const w = config.width;
  const h = config.height;
  const sw = 2; // stroke width

  switch (style) {
    case 'temple':
      return `<rect x="${sw}" y="${sw}" width="${w - sw * 2}" height="${h - sw * 2}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="0.3" rx="4"/>
        <rect x="${sw * 3}" y="${sw * 3}" width="${w - sw * 6}" height="${h - sw * 6}" fill="none" stroke="${color}" stroke-width="1" opacity="0.15" rx="2"/>`;

    case 'floral':
      return `<rect x="${sw}" y="${sw}" width="${w - sw * 2}" height="${h - sw * 2}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="0.3" rx="${Math.min(w, h) * 0.1}"/>`;

    case 'mandala':
      return generateMandalaBorder(w, h, color);

    default:
      return `<rect x="${sw}" y="${sw}" width="${w - sw * 2}" height="${h - sw * 2}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="0.3"/>`;
  }
}

function generateMandalaBorder(w: number, h: number, color: string): string {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.45;
  let svg = '';

  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 * Math.PI) / 180;
    const x1 = cx + r * 0.7 * Math.cos(angle);
    const y1 = cy + r * 0.7 * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1" opacity="0.2"/>`;
  }

  svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.25"/>`;
  svg += `<circle cx="${cx}" cy="${cy}" r="${r * 0.85}" fill="none" stroke="${color}" stroke-width="1" opacity="0.15"/>`;

  return svg;
}

// ── Subject Generators ────────────────────────────────────────────────────────

function generateSubject(config: IllustrationConfig): string {
  const c = config.primaryColor;
  const w = config.width;
  const h = config.height;

  switch (config.subject) {
    case 'saint':
      return generateSaintPortrait(config);
    case 'temple':
      return generateTempleSilhouette(w, h, c);
    case 'diya':
      return generateDiya(w, h, c);
    case 'lotus':
      return generateLotus(w, h, c);
    case 'palkhi':
      return generatePalkhi(w, h, c);
    case 'tulsi':
      return generateTulsi(w, h, c);
    case 'vitthal':
      return generateVitthalSilhouette(w, h, c);
    case 'floral':
      return generateFloralPattern(w, h, c, config.accentColor);
    default:
      return '';
  }
}

// ── Saint Portrait ────────────────────────────────────────────────────────────

function generateSaintPortrait(config: IllustrationConfig): string {
  const c = config.primaryColor;
  const w = config.width;
  const h = config.height;
  const cx = w / 2;
  const headR = Math.min(w, h) * 0.15;
  const bodyTop = h / 2 + headR + 10;

  return `
    <circle cx="${cx}" cy="${h * 0.32}" r="${headR}" fill="${c}" opacity="0.08" stroke="${c}" stroke-width="1" stroke-opacity="0.2"/>
    <!-- Body outline -->
    <path d="M${cx - headR * 1.2},${bodyTop + headR * 0.5} Q${cx - headR * 1.5},${h * 0.7} ${cx - headR * 1.8},${h * 0.85} L${cx + headR * 1.8},${h * 0.85} Q${cx + headR * 1.5},${h * 0.7} ${cx + headR * 1.2},${bodyTop + headR * 0.5}" fill="${c}" opacity="0.06"/>
    <!-- Halo -->
    <circle cx="${cx}" cy="${h * 0.32}" r="${headR * 1.6}" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.15"/>
    ${config.saintName ? `<text x="${cx}" y="${h * 0.92}" text-anchor="middle" fill="${c}" opacity="0.4" font-size="12" font-family="Noto Sans Devanagari, serif">${config.saintName}</text>` : ''}
  `;
}

// ── Temple Silhouette ─────────────────────────────────────────────────────────

function generateTempleSilhouette(w: number, h: number, c: string): string {
  const cx = w / 2;
  const baseY = h * 0.85;
  const templeW = w * 0.5;
  const halfW = templeW / 2;

  return `<path d="M${cx - halfW},${baseY} L${cx - halfW},${baseY * 0.6}
    L${cx - halfW * 0.7},${baseY * 0.7} L${cx - halfW * 0.7},${baseY * 0.4}
    L${cx},${baseY * 0.15} L${cx + halfW * 0.7},${baseY * 0.4}
    L${cx + halfW * 0.7},${baseY * 0.7} L${cx + halfW},${baseY * 0.6}
    L${cx + halfW},${baseY} Z" fill="${c}" opacity="0.08" stroke="${c}" stroke-width="0.5" stroke-opacity="0.15"/>
    <circle cx="${cx}" cy="${baseY * 0.12}" r="${w * 0.03}" fill="${c}" opacity="0.2"/>`;
}

// ── Diya ──────────────────────────────────────────────────────────────────────

function generateDiya(w: number, h: number, c: string): string {
  const cx = w / 2;
  const by = h * 0.75;

  return `<ellipse cx="${cx}" cy="${by}" rx="${w * 0.2}" ry="${h * 0.08}" fill="${c}" opacity="0.12"/>
    <path d="M${cx - w * 0.08},${by} Q${cx},${by - h * 0.2} ${cx + w * 0.08},${by}" fill="${c}" opacity="0.08"/>
    <!-- Flame -->
    <path d="M${cx},${by - h * 0.05} Q${cx - w * 0.02},${by - h * 0.2} ${cx},${by - h * 0.28} Q${cx + w * 0.02},${by - h * 0.2} ${cx},${by - h * 0.05}" fill="${c}" opacity="0.15"/>`;
}

// ── Lotus ─────────────────────────────────────────────────────────────────────

function generateLotus(w: number, h: number, c: string): string {
  const cx = w / 2;
  const by = h * 0.7;

  return `<path d="M${cx},${by} Q${cx - w * 0.2},${by - h * 0.3} ${cx - w * 0.1},${by} Q${cx - w * 0.15},${by - h * 0.4} ${cx},${by} Q${cx + w * 0.15},${by - h * 0.4} ${cx + w * 0.1},${by} Q${cx + w * 0.2},${by - h * 0.3} ${cx},${by}" fill="${c}" opacity="0.1" stroke="${c}" stroke-width="0.5" stroke-opacity="0.15"/>`;
}

// ── Palkhi ────────────────────────────────────────────────────────────────────

function generatePalkhi(w: number, h: number, c: string): string {
  const cx = w / 2;
  const by = h * 0.7;

  return `<rect x="${cx - w * 0.15}" y="${by - h * 0.3}" width="${w * 0.3}" height="${h * 0.3}" fill="${c}" opacity="0.06" rx="4"/>
    <path d="M${cx - w * 0.12},${by - h * 0.3} L${cx - w * 0.15},${by + h * 0.1} M${cx + w * 0.12},${by - h * 0.3} L${cx + w * 0.15},${by + h * 0.1}" stroke="${c}" stroke-width="1.5" opacity="0.15" fill="none"/>
    <!-- Poles -->
    <line x1="${cx - w * 0.12}" y1="${by - h * 0.3}" x2="${cx - w * 0.15}" y2="${by + h * 0.15}" stroke="${c}" stroke-width="1.5" opacity="0.12"/>
    <line x1="${cx + w * 0.12}" y1="${by - h * 0.3}" x2="${cx + w * 0.15}" y2="${by + h * 0.15}" stroke="${c}" stroke-width="1.5" opacity="0.12"/>`;
}

// ── Tulsi ─────────────────────────────────────────────────────────────────────

function generateTulsi(w: number, h: number, c: string): string {
  const cx = w / 2;
  const by = h * 0.75;

  return `<rect x="${cx - w * 0.08}" y="${by - h * 0.05}" width="${w * 0.16}" height="${h * 0.12}" fill="${c}" opacity="0.08" rx="2"/>
    ${[0, 1, 2, 3].map((i) => {
      const angle = (i * 90 + 45) * Math.PI / 180;
      const len = w * 0.1;
      return `<line x1="${cx}" y1="${by - h * 0.05}" x2="${cx + len * Math.cos(angle)}" y2="${by - h * 0.05 - len * Math.sin(angle)}" stroke="${c}" stroke-width="1" opacity="0.12"/>`;
    }).join('')}`;
}

// ── Vitthal Silhouette ────────────────────────────────────────────────────────

function generateVitthalSilhouette(w: number, h: number, c: string): string {
  const cx = w / 2;

  return `<circle cx="${cx}" cy="${h * 0.25}" r="${w * 0.1}" fill="${c}" opacity="0.08"/>
    <rect x="${cx - w * 0.07}" y="${h * 0.32}" width="${w * 0.14}" height="${h * 0.45}" fill="${c}" opacity="0.06" rx="4"/>
    <!-- Arms -->
    <path d="M${cx - w * 0.07},${h * 0.38} L${cx - w * 0.15},${h * 0.45} L${cx - w * 0.13},${h * 0.5}" stroke="${c}" stroke-width="2" fill="none" opacity="0.1"/>
    <path d="M${cx + w * 0.07},${h * 0.38} L${cx + w * 0.15},${h * 0.45} L${cx + w * 0.13},${h * 0.5}" stroke="${c}" stroke-width="2" fill="none" opacity="0.1"/>
    <!-- Halo -->
    <circle cx="${cx}" cy="${h * 0.25}" r="${w * 0.17}" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.12"/>`;
}

// ── Floral Pattern ────────────────────────────────────────────────────────────

function generateFloralPattern(w: number, h: number, c: string, accent?: string): string {
  const ac = accent ?? adjustColor(c, 30);
  let svg = '';

  for (let x = 0; x < w; x += w * 0.2) {
    for (let y = 0; y < h; y += h * 0.2) {
      svg += `<circle cx="${x + w * 0.1}" cy="${y + h * 0.1}" r="3" fill="${c}" opacity="0.06"/>`;
      svg += `<circle cx="${x + w * 0.1}" cy="${y + h * 0.1}" r="1.5" fill="${ac}" opacity="0.08"/>`;
    }
  }

  return svg;
}

// ── Color Helpers ─────────────────────────────────────────────────────────────

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ── Generate Multiple Illustrations ──────────────────────────────────────────

export function generateBookIllustrations(
  saintNames: string[],
  bookType: string,
): Array<{ section: string; svg: string }> {
  const illustrations: Array<{ section: string; svg: string }> = [];

  // Cover art — temple silhouette
  illustrations.push({
    section: 'cover',
    svg: generateIllustration({
      subject: 'temple',
      style: 'silhouette',
      width: 200,
      height: 150,
      primaryColor: '#C9A227',
      accentColor: '#FF7A1A',
      includeBorder: true,
      borderStyle: 'temple',
    }),
  });

  // Saint portraits for bios
  saintNames.slice(0, 5).forEach((name) => {
    illustrations.push({
      section: `saint-${name}`,
      svg: generateIllustration({
        subject: 'saint',
        style: 'sketch',
        width: 120,
        height: 150,
        primaryColor: '#6B1E1E',
        saintName: name,
        includeBorder: true,
        borderStyle: 'mandala',
      }),
    });
  });

  // Section dividers
  illustrations.push({
    section: 'divider',
    svg: generateIllustration({
      subject: 'lotus',
      style: 'minimal',
      width: 100,
      height: 60,
      primaryColor: '#C9A227',
      accentColor: '#FF7A1A',
      includeBorder: false,
    }),
  });

  return illustrations;
}
