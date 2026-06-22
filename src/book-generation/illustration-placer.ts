/**
 * Illustration Placer — generates decorative elements for book covers,
 * section headers, and page ornaments using canvas-based rendering.
 *
 * Produces SVG strings and canvas buffers that can be embedded in
 * HTML/PDF output or used as Three.js textures.
 */

// ── Decorative Border Generators ──────────────────────────────────────────────

export type BorderStyle = 'temple' | 'floral' | 'geometric' | 'minimal' | 'mandala';

const BORDER_PATTERNS: Record<BorderStyle, string> = {
  temple: 'M10,10 L90,10 L90,90 L10,90 Z',
  floral: 'M50,5 A45,45 0 1,1 5,50 A45,45 0 1,1 50,5',
  geometric: 'M10,10 L90,10 L50,50 L90,90 L10,90 L50,50 Z',
  minimal: 'M15,15 L85,15 L85,85 L15,85 Z',
  mandala: 'M50,2 A48,48 0 1,1 2,50 A48,48 0 1,1 50,2',
};

export function generateBorderSvg(
  style: BorderStyle,
  width: number,
  height: number,
  color: string,
): string {
  const path = BORDER_PATTERNS[style] ?? BORDER_PATTERNS.temple;

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="none" stroke="${color}" stroke-width="2"/>
    <path d="${path}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.3"
      transform="translate(${width * 0.05},${height * 0.05}) scale(${width * 0.0009})"/>
  </svg>`;
}

// ── Section Divider SVG ───────────────────────────────────────────────────────

export function generateSectionDividerSvg(
  width: number,
  color: string,
): string {
  return `<svg width="${width}" height="20" xmlns="http://www.w3.org/2000/svg">
    <line x1="0" y1="10" x2="${width * 0.35}" y2="10" stroke="${color}" stroke-width="1" opacity="0.5"/>
    <circle cx="${width / 2}" cy="10" r="3" fill="${color}" opacity="0.7"/>
    <line x1="${width * 0.65}" y1="10" x2="${width}" y2="10" stroke="${color}" stroke-width="1" opacity="0.5"/>
  </svg>`;
}

// ── Cover Illustration ────────────────────────────────────────────────────────

export interface CoverIllustration {
  type: 'temple_silhouette' | 'diya' | 'lotus' | 'palkhi' | 'tulsi' | 'om';
  svg: string;
  width: number;
  height: number;
}

export function generateCoverIllustration(
  type: CoverIllustration['type'],
  width: number,
  height: number,
  color: string,
): CoverIllustration {
  const svg = getIllustrationSvg(type, width, height, color);

  return { type, svg, width, height };
}

function getIllustrationSvg(
  type: string,
  width: number,
  height: number,
  color: string,
): string {
  switch (type) {
    case 'diya':
      return `<svg width="${width}" height="${height}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="50" cy="70" rx="30" ry="20" fill="${color}" opacity="0.15"/>
        <path d="M50,30 Q60,50 55,65 Q50,70 45,65 Q40,50 50,30" fill="${color}" opacity="0.5"/>
        <ellipse cx="50" cy="68" rx="25" ry="15" fill="${color}" opacity="0.2"/>
      </svg>`;

    case 'om':
      return `<svg width="${width}" height="${height}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <text x="50" y="75" text-anchor="middle" font-size="70" fill="${color}" opacity="0.3"
          font-family="Noto Sans Devanagari, serif">ॐ</text>
      </svg>`;

    case 'lotus':
      return `<svg width="${width}" height="${height}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M50,80 Q40,60 20,50 Q35,55 50,60 Q40,45 25,35 Q40,40 50,50 Q45,30 35,20
                 Q47,28 50,40 Q53,28 65,20 Q55,30 50,50 Q60,40 75,35 Q60,45 50,60
                 Q65,55 80,50 Q60,60 50,80" fill="${color}" opacity="0.15"/>
      </svg>`;

    case 'temple_silhouette':
      return `<svg width="${width}" height="${height}" viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M40,90 L40,40 L60,20 L80,40 L80,90 Z" fill="${color}" opacity="0.1"/>
        <path d="M45,90 L45,45 L60,28 L75,45 L75,90 Z" fill="${color}" opacity="0.08"/>
        <circle cx="60" cy="18" r="4" fill="${color}" opacity="0.2"/>
      </svg>`;

    default:
      return '';
  }
}

// ── Canvas-based ornament for PDF embedding ───────────────────────────────────

export function drawOrnament(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  color: string,
): void {
  const half = width / 2;
  const mid = y;

  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.4;

  // Left line
  ctx.beginPath();
  ctx.moveTo(x, mid);
  ctx.lineTo(x + half - 15, mid);
  ctx.stroke();

  // Right line
  ctx.beginPath();
  ctx.moveTo(x + width, mid);
  ctx.lineTo(x + half + 15, mid);
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(x + half, mid, 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.6;
  ctx.fill();

  ctx.globalAlpha = 1.0;
}

// ── Saint Portrait Placeholder ────────────────────────────────────────────────

export function generateSaintPortraitCanvas(
  saintName: string,
  size: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Circular background
  ctx.fillStyle = '#FFF8EC';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fill();

  // Border
  ctx.strokeStyle = '#C9A227';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.stroke();

  // Initial
  const initial = saintName.charAt(0);
  ctx.fillStyle = '#6B1E1E';
  ctx.font = `bold ${size * 0.4}px "Noto Sans Devanagari", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, size / 2, size / 2);

  return canvas;
}
