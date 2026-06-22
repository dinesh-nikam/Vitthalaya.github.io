/**
 * Production EPUB 3 Exporter — generates standards-compliant
 * EPUB 3 files with proper ZIP structure, OPF manifest, and NCX navigation.
 *
 * EPUB 3 structure:
 *   mimetype                    (application/epub+zip, no compression)
 *   META-INF/
 *     container.xml
 *   OEBPS/
 *     content.opf               (package manifest)
 *     content.xhtml             (book content)
 *     stylesheet.css            (CSS)
 *     nav.xhtml                 (table of contents)
 */

import AdmZip from 'adm-zip';
import crypto from 'crypto';
import type { CuratedSelection, BookContent, CoverDesign, LayoutConfig } from './types';
import { generateCoverHtml } from './cover-designer';

// ── Configuration ─────────────────────────────────────────────────────────────

interface EpubConfig {
  identifier: string;
  title: string;
  titleEnglish?: string;
  language: string;
  creator: string;
  modified: string;
}

// ── Main EPUB Export ──────────────────────────────────────────────────────────

export async function exportEpub3(
  selection: CuratedSelection,
  structure: BookContent,
  coverDesign: CoverDesign,
  layout: LayoutConfig,
  outputPath: string,
): Promise<{ filePath: string; pageCount: number }> {
  const zip = new AdmZip();

  const config: EpubConfig = {
    identifier: `urn:uuid:${crypto.randomUUID()}`,
    title: coverDesign.titleMarathi,
    titleEnglish: coverDesign.titleEnglish,
    language: 'mr',
    creator: coverDesign.authorName ?? 'Digital Pandharpur',
    modified: new Date().toISOString().replace(/\.\d+/, ''),
  };

  // 1. mimetype (must be first entry, STORED not compressed)
  zip.addFile('mimetype', Buffer.from('application/epub+zip', 'utf-8'), '', 0);

  // 2. META-INF/container.xml
  zip.addFile(
    'META-INF/container.xml',
    Buffer.from(generateContainerXml(), 'utf-8'),
  );

  // 3. Generate content HTML
  const contentHtml = generateContentHtml(selection, structure, coverDesign, layout);

  // 4. OEBPS/content.xhtml
  zip.addFile('OEBPS/content.xhtml', Buffer.from(contentHtml, 'utf-8'));

  // 5. OEBPS/stylesheet.css
  zip.addFile('OEBPS/stylesheet.css', Buffer.from(generateCss(layout), 'utf-8'));

  // 6. OEBPS/nav.xhtml (table of contents)
  zip.addFile('OEBPS/nav.xhtml', Buffer.from(generateNavXhtml(structure, selection), 'utf-8'));

  // 7. OEBPS/content.opf
  zip.addFile('OEBPS/content.opf', Buffer.from(generateOpf(config, structure, selection), 'utf-8'));

  // Write to file
  zip.writeZip(outputPath);

  return {
    filePath: outputPath,
    pageCount: selection.compositions.length,
  };
}

// ── Generate container.xml ────────────────────────────────────────────────────

function generateContainerXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
}

// ── Generate content.opf ──────────────────────────────────────────────────────

function generateOpf(
  config: EpubConfig,
  structure: BookContent,
  _selection: CuratedSelection,
): string {
  const manifestItems = [
    { id: 'content', href: 'content.xhtml', type: 'application/xhtml+xml' },
    { id: 'nav', href: 'nav.xhtml', type: 'application/xhtml+xml', properties: 'nav' },
    { id: 'css', href: 'stylesheet.css', type: 'text/css' },
  ];

  const spineItems = ['content'];

  const itemsXml = manifestItems
    .map(
      (item) =>
        `    <item id="${item.id}" href="${item.href}" media-type="${item.type}"${
          item.properties ? ` properties="${item.properties}"` : ''
        }/>`,
    )
    .join('\n');

  const spineXml = spineItems
    .map((id) => `    <itemref idref="${id}"/>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id" version="3.0">
  <metadata>
    <dc:identifier id="book-id">${config.identifier}</dc:identifier>
    <dc:title>${escapeXml(config.title)}</dc:title>
    ${config.titleEnglish ? `<dc:title xml:lang="en">${escapeXml(config.titleEnglish)}</dc:title>` : ''}
    <dc:language>${config.language}</dc:language>
    <dc:creator>${escapeXml(config.creator)}</dc:creator>
    <dc:publisher>Digital Pandharpur</dc:publisher>
    <meta property="dcterms:modified">${config.modified}</meta>
    <meta property="schema:accessMode">textual</meta>
  </metadata>
  <manifest>
${itemsXml}
  </manifest>
  <spine>
${spineXml}
  </spine>
</package>`;
}

// ── Generate nav.xhtml ────────────────────────────────────────────────────────

function generateNavXhtml(structure: BookContent, _selection: CuratedSelection): string {
  const items = structure.sections
    .map(
      (s, i) =>
        `        <li><a href="content.xhtml#section-${i}">${escapeXml(s.title)}</a></li>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Table of Contents</title>
</head>
<body>
  <nav epub:type="toc">
    <h1>अनुक्रमणिका</h1>
    <ol>
${items}
    </ol>
  </nav>
</body>
</html>`;
}

// ── Generate Content HTML ─────────────────────────────────────────────────────

function generateContentHtml(
  selection: CuratedSelection,
  structure: BookContent,
  coverDesign: CoverDesign,
  layout: LayoutConfig,
): string {
  const sectionsHtml = structure.sections
    .map((section, si) => {
      const compsHtml = section.compositionIndices
        .map((ci) => {
          const comp = selection.compositions[ci];
          if (!comp) return '';
          return `<section class="composition">
  <h2 class="comp-title">${escapeXml(comp.titleMarathi)}</h2>
  ${comp.saintName ? `<p class="comp-saint">— ${escapeXml(comp.saintName)}</p>` : ''}
  <div class="comp-text">${escapeXml(comp.fullText).replace(/\n/g, '<br/>')}</div>
  ${comp.meaning ? `<div class="comp-meaning"><strong>अर्थ:</strong><br/>${escapeXml(comp.meaning).replace(/\n/g, '<br/>')}</div>` : ''}
</section>`;
        })
        .join('\n');

      return `<section id="section-${si}" class="chapter">
  <h1 class="section-title">${escapeXml(section.title)}</h1>
  ${section.description ? `<p class="section-intro">${escapeXml(section.description)}</p>` : ''}
  ${compsHtml}
</section>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(coverDesign.titleMarathi)}</title>
  <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
  <!-- Cover -->
  <section class="cover-page">
    ${generateCoverHtml(coverDesign).replace(/<!DOCTYPE html>.*<body>/s, '').replace(/<\/body>.*/s, '')}
  </section>

  <!-- Preface -->
  ${structure.preface ? `<section class="front-matter">
    <h1>प्रस्तावना</h1>
    ${escapeXml(structure.preface).replace(/\n/g, '<br/>')}
  </section>` : ''}

  <!-- Historical Context -->
  ${structure.historicalContext ? `<section class="front-matter">
    <h1>ऐतिहासिक संदर्भ</h1>
    ${escapeXml(structure.historicalContext).replace(/\n/g, '<br/>')}
  </section>` : ''}

  <!-- Saint Bios -->
  ${structure.saintBiography ? `<section class="front-matter">
    <h1>संत परिचय</h1>
    ${escapeXml(structure.saintBiography).replace(/\n/g, '<br/>')}
  </section>` : ''}

  <!-- Composition Sections -->
  ${sectionsHtml}

  <!-- Afterword -->
  ${structure.afterword ? `<section class="back-matter">
    <h1>उपसंहार</h1>
    ${escapeXml(structure.afterword).replace(/\n/g, '<br/>')}
  </section>` : ''}
</body>
</html>`;
}

// ── Generate CSS ──────────────────────────────────────────────────────────────

function generateCss(layout: LayoutConfig): string {
  return `@page {
  margin: ${layout.marginMm}mm;
}

body {
  font-family: '${layout.fontFamily}', 'Noto Sans Devanagari', serif;
  font-size: ${layout.fontSizePt}pt;
  line-height: ${layout.lineHeight};
  color: #1a1a1a;
  direction: ltr;
}

.cover-page {
  page-break-after: always;
  text-align: center;
  padding: 20% 10%;
}

.front-matter, .back-matter {
  page-break-after: always;
  padding: 10% 5%;
}

.chapter {
  page-break-before: always;
  page-break-after: always;
}

.section-title {
  font-size: ${layout.fontSizePt * 1.5}pt;
  font-weight: bold;
  color: #6B1E1E;
  text-align: center;
  margin-bottom: 1em;
}

.section-intro {
  font-style: italic;
  text-align: center;
  margin-bottom: 1.5em;
  color: #666;
}

.composition {
  page-break-inside: avoid;
  margin-bottom: 1.5em;
  padding: 0.5em 0;
}

.comp-title {
  font-size: ${layout.fontSizePt * 1.15}pt;
  font-weight: bold;
  color: #6B1E1E;
  margin-bottom: 0.3em;
}

.comp-saint {
  font-size: ${layout.fontSizePt * 0.9}pt;
  color: #888;
  margin-bottom: 0.5em;
}

.comp-text {
  line-height: 2;
  margin-bottom: 1em;
}

.comp-meaning {
  margin-top: 0.5em;
  padding: 0.5em;
  background: #FFF8EC;
  border-left: 3px solid #C9A227;
  font-style: italic;
  font-size: ${layout.fontSizePt * 0.95}pt;
}

h1, h2, h3 {
  line-height: 1.3;
}
`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
