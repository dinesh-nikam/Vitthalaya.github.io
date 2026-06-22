/**
 * Cover Designer — generates HTML/CSS cover layouts for print/digital books.
 * Produces cover HTML that Puppeteer renders to PDF for the cover page.
 */

import type { CoverDesign, CoverPalette } from './types';

// ── Color Palettes ────────────────────────────────────────────────────────────

const PALETTES: Record<CoverPalette, { background: string; text: string; accent: string; decoration: string }> = {
  bhagwa:  { background: '#FF7A1A', text: '#FFFFFF', accent: '#C9A227', decoration: '#6B1E1E' },
  maroon:  { background: '#6B1E1E', text: '#FFF8EC', accent: '#C9A227', decoration: '#FF7A1A' },
  gold:    { background: '#C9A227', text: '#6B1E1E', accent: '#FFF8EC', decoration: '#FF7A1A' },
  cream:   { background: '#FFF8EC', text: '#6B1E1E', accent: '#C9A227', decoration: '#FF7A1A' },
  emerald: { background: '#1B5E20', text: '#FFF8EC', accent: '#C9A227', decoration: '#FF7A1A' },
  indigo:  { background: '#1A237E', text: '#FFF8EC', accent: '#C9A227', decoration: '#FF7A1A' },
};

// ── Cover Preview HTML ────────────────────────────────────────────────────────

export function generateCoverHtml(design: CoverDesign): string {
  const palette = PALETTES[design.palette] ?? PALETTES.bhagwa;

  return `<!DOCTYPE html>
<html lang="mr">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 0; size: cover; }
  * { margin: 0; padding: 0; box-sizing: border-box; }

  .cover {
    width: 100%;
    height: 100vh;
    background: ${palette.background};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    font-family: 'Noto Sans Devanagari', sans-serif;
    color: ${palette.text};
  }

  /* Decorative border */
  .border-top {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 12px;
    background: ${palette.accent};
  }
  .border-bottom {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 12px;
    background: ${palette.accent};
  }
  .ornament-left {
    position: absolute;
    left: 20px; top: 50%;
    transform: translateY(-50%);
    width: 4px; height: 60%;
    background: ${palette.decoration};
    opacity: 0.3;
    border-radius: 2px;
  }
  .ornament-right {
    position: absolute;
    right: 20px; top: 50%;
    transform: translateY(-50%);
    width: 4px; height: 60%;
    background: ${palette.decoration};
    opacity: 0.3;
    border-radius: 2px;
  }

  .content {
    text-align: center;
    z-index: 1;
    padding: 40px;
  }

  .title {
    font-size: ${design.foilEffect ? '42' : '36'}px;
    font-weight: 700;
    line-height: 1.4;
    margin-bottom: 16px;
    text-shadow: ${design.foilEffect ? `0 0 20px ${palette.accent}` : 'none'};
    color: ${palette.text};
  }

  .subtitle {
    font-size: 20px;
    font-weight: 400;
    opacity: 0.85;
    margin-bottom: 30px;
    line-height: 1.5;
  }

  ${design.titleEnglish ? `.title-eng {
    font-family: 'Inter', sans-serif;
    font-size: 18px;
    font-weight: 300;
    letter-spacing: 1px;
    opacity: 0.7;
    text-transform: uppercase;
  }` : ''}

  ${design.authorName ? `.author {
    margin-top: 40px;
    font-size: 16px;
    opacity: 0.6;
    font-weight: 400;
    letter-spacing: 2px;
  }` : ''}

  .decorative-dot {
    margin: 20px auto;
    width: 8px; height: 8px;
    background: ${palette.accent};
    border-radius: 50%;
  }

  ${design.templeArt ? `.art {
    margin-bottom: 20px;
    max-width: 120px;
    opacity: 0.8;
  }` : ''}
</style>
</head>
<body>
<div class="cover">
  <div class="border-top"></div>
  <div class="border-bottom"></div>
  <div class="ornament-left"></div>
  <div class="ornament-right"></div>

  <div class="content">
    <div class="decorative-dot"></div>
    <h1 class="title">${design.titleMarathi}</h1>
    ${design.titleEnglish ? `<p class="title-eng">${design.titleEnglish}</p>` : ''}
    ${design.subtitle ? `<p class="subtitle">${design.subtitle}</p>` : ''}
    ${design.authorName ? `<p class="author">${design.authorName}</p>` : ''}
    <div class="decorative-dot"></div>
  </div>
</div>
</body>
</html>`;
}

/**
 * Returns a minimal cover data URL or base64 if the cover needs to be
 * embedded inline (e.g. EPUB).
 */
export function generateCoverMetadata(design: CoverDesign): {
  html: string;
  previewCss: string;
  palette: ReturnType<typeof getPalette>;
} {
  return {
    html: generateCoverHtml(design),
    previewCss: `
      .cover-preview { border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
    `,
    palette: getPalette(design.palette),
  };
}

function getPalette(name: CoverPalette) {
  return PALETTES[name] ?? PALETTES.bhagwa;
}
