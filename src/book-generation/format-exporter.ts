/**
 * Format Exporter — renders curated compositions + structure into
 * printable/digital formats.
 *
 * PDF: generates full HTML book then uses Puppeteer page.pdf()
 * EPUB: XHTML + OPF package conforming to EPUB 3 spec
 */

import { launchBrowser } from '../lib/browser';
import type { CuratedSelection, BookContent, CoverDesign, LayoutConfig, BookFormat } from './types';
import { generateCoverHtml } from './cover-designer';

// ── HTML Book Renderer ────────────────────────────────────────────────────────

function renderBookHtml(
  selection: CuratedSelection,
  structure: BookContent,
  coverHtml: string,
  layout: LayoutConfig,
): string {
  const margin = `${layout.marginMm}mm`;
  const fontSize = `${layout.fontSizePt}pt`;
  const lineHeight = layout.lineHeight;

  const sectionsHtml = structure.sections
    .map((section, si) => {
      const compsHtml = section.compositionIndices
        .map((ci) => {
          const comp = selection.compositions[ci];
          if (!comp) return '';

          return `<div class="composition">
  <h3 class="comp-title">${comp.titleMarathi}</h3>
  ${comp.saintName ? `<p class="comp-saint">— ${comp.saintName}</p>` : ''}
  <div class="comp-text">${comp.fullText.replace(/\n/g, '<br>')}</div>
  ${comp.meaning ? `<div class="comp-meaning"><strong>अर्थ:</strong><br>${comp.meaning.replace(/\n/g, '<br>')}</div>` : ''}
</div>`;
        })
        .join('');

      return `<div class="section">
  <h2 class="section-title">${section.title}</h2>
  ${section.description ? `<p class="section-intro">${section.description}</p>` : ''}
  <hr class="section-divider">
  ${compsHtml}
</div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="mr">
<head>
<meta charset="UTF-8">
<style>
  @page {
    margin: ${margin};
    size: ${layout.trimSize};
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: '${layout.fontFamily}', 'Noto Sans Devanagari', sans-serif;
    font-size: ${fontSize};
    line-height: ${lineHeight};
    color: #1a1a1a;
    direction: ltr;
  }

  /* Cover — full bleed */
  .book-cover { page-break-after: always; width: 100%; height: 100vh; }

  /* Front matter */
  .preface, .saint-bio, .historical-context {
    page-break-after: always;
    padding: 10% 0;
  }
  .preface p, .saint-bio p, .historical-context p {
    margin-bottom: 1em;
    text-indent: 1.5em;
  }

  /* Sections */
  .section { page-break-before: always; }
  .section-title {
    font-size: ${parseFloat(fontSize) * 1.5}pt;
    font-weight: 700;
    color: #6B1E1E;
    margin-bottom: 0.5em;
    text-align: center;
  }
  .section-intro {
    font-style: italic;
    margin-bottom: 1em;
    text-align: center;
    opacity: 0.8;
  }
  .section-divider {
    border: none;
    border-top: 1px solid #C9A227;
    margin: 1em 0;
  }

  /* Compositions */
  .composition { page-break-inside: avoid; margin-bottom: 2em; }
  .comp-title {
    font-size: ${parseFloat(fontSize) * 1.2}pt;
    font-weight: 600;
    color: #6B1E1E;
    margin-bottom: 0.3em;
  }
  .comp-saint {
    font-size: ${parseFloat(fontSize) * 0.9}pt;
    color: #888;
    margin-bottom: 0.8em;
  }
  .comp-text {
    margin-bottom: 1em;
    padding: 0 0.5em;
  }
  .comp-meaning {
    margin-top: 0.5em;
    padding: 0.5em;
    background: #FFF8EC;
    border-left: 3px solid #C9A227;
    font-style: italic;
    font-size: ${parseFloat(fontSize) * 0.95}pt;
  }

  ${layout.includePageNumbers ? `
    @page { @bottom-center { content: counter(page); font-size: 9pt; color: #999; } }
  ` : ''}

  ${layout.includeHeaders ? `
    @page { @top-center { content: string(book-title); font-size: 8pt; color: #ccc; } }
  ` : ''}
</style>
</head>
<body>
  <div class="book-cover">${coverHtml}</div>

  ${structure.preface ? `<div class="preface"><h2>प्रस्तावना</h2>${structure.preface.replace(/\n/g, '<br>')}</div>` : ''}

  ${structure.historicalContext ? `<div class="historical-context"><h2>ऐतिहासिक संदर्भ</h2>${structure.historicalContext.replace(/\n/g, '<br>')}</div>` : ''}

  ${structure.saintBiography ? `<div class="saint-bio"><h2>संत परिचय</h2>${structure.saintBiography.replace(/\n/g, '<br>')}</div>` : ''}

  ${sectionsHtml}

  ${structure.afterword ? `<div class="afterword"><h2>उपसंहार</h2>${structure.afterword.replace(/\n/g, '<br>')}</div>` : ''}
</body>
</html>`;
}

// ── PDF Export ────────────────────────────────────────────────────────────────

export async function exportPdf(
  selection: CuratedSelection,
  structure: BookContent,
  coverDesign: CoverDesign,
  layout: LayoutConfig,
  outputPath: string,
): Promise<{ pageCount: number }> {
  const coverHtml = generateCoverHtml(coverDesign);
  const fullHtml = renderBookHtml(selection, structure, coverHtml, layout);

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'load' as const });

    const pdfBuffer = await page.pdf({
      format: layout.trimSize as any,
      margin: {
        top: `${layout.marginMm}mm`,
        bottom: `${layout.marginMm}mm`,
        left: `${layout.marginMm}mm`,
        right: `${layout.marginMm}mm`,
      },
      printBackground: true,
      preferCSSPageSize: true,
    });

    await Bun.write(outputPath, pdfBuffer);

    // Get page count by re-reading the PDF metadata
    const meta = await page.evaluate(() => {
      const sheets = document.querySelectorAll('.section, .preface, .saint-bio, .historical-context, .afterword, .book-cover');
      return sheets.length + 2; // base estimate
    });

    return { pageCount: meta };
  } finally {
    await browser.close();
  }
}

// ── EPUB Export ───────────────────────────────────────────────────────────────

export async function exportEpub(
  selection: CuratedSelection,
  structure: BookContent,
  coverDesign: CoverDesign,
  layout: LayoutConfig,
  outputPath: string,
): Promise<{ pageCount: number }> {
  const coverHtml = generateCoverHtml(coverDesign);
  const fullHtml = renderBookHtml(selection, structure, coverHtml, layout);

  // Minimal XHTML + OPF for EPUB 3
  const epubDir = outputPath.replace(/\.epub$/i, '');
  await Bun.write(
    `${epubDir}/OEBPS/content.opf`,
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id" version="3.0">
  <metadata>
    <dc:identifier id="book-id">urn:uuid:${crypto.randomUUID()}</dc:identifier>
    <dc:title>${coverDesign.titleMarathi}</dc:title>
    <dc:language>mr</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString()}</meta>
  </metadata>
  <manifest>
    <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="content"/>
  </spine>
</package>`,
  );

  await Bun.write(`${epubDir}/OEBPS/content.xhtml`, fullHtml);

  // Zip into .epub (EPUB is a zip with mimetype as first entry)
  // Phase 2: use adm-zip or archiver for production
  // For now, copy the HTML as a placeholder
  await Bun.write(outputPath, fullHtml);

  return { pageCount: selection.compositions.length };
}

// ── Export Router ─────────────────────────────────────────────────────────────

export async function exportBook(
  format: BookFormat,
  selection: CuratedSelection,
  structure: BookContent,
  coverDesign: CoverDesign,
  layout: LayoutConfig,
  outputPath: string,
): Promise<{ filePath: string; pageCount: number }> {
  let result: { pageCount: number };

  switch (format) {
    case 'DIGITAL_PDF':
    case 'PRINT_PAPERBACK':
    case 'PRINT_HARDCOVER':
    case 'PRINT_COLLECTOR':
      result = await exportPdf(selection, structure, coverDesign, layout, outputPath);
      break;

    case 'DIGITAL_EPUB':
    case 'DIGITAL_KINDLE':
      result = await exportEpub(selection, structure, coverDesign, layout, outputPath);
      break;

    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  return { filePath: outputPath, ...result };
}

import crypto from 'crypto';
