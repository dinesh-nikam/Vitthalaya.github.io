/**
 * Vitthalaya — HTML → Text helpers for content importers
 *
 * WordPress REST API / RSS content arrives as HTML with entities
 * (&#8211;, &nbsp;, &amp;, …). These helpers convert it to clean
 * Marathi text without destroying Devanagari content (the generic
 * sanitize.stripHtml drops entities, which corrupts lyrics).
 */

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  rsquo: '\u2019',
  lsquo: '\u2018',
  rdquo: '\u201D',
  ldquo: '\u201C',
  ndash: '\u2013',
  mdash: '\u2014',
  hellip: '\u2026',
  middot: '\u00B7',
  bull: '\u2022',
  '#39': "'",
};

/**
 * Decode common HTML entities (named + numeric) in a string.
 * Numeric entities are decoded with the correct code point, so
 * Devanagari ranges (&#2360; etc.) survive intact.
 */
export function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (full, body: string) => {
    if (body[0] === '#') {
      const hex = body[1]?.toLowerCase() === 'x';
      const code = parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
      if (Number.isFinite(code) && code >= 0 && code <= 0x10ffff) {
        try {
          return String.fromCodePoint(code);
        } catch {
          return '';
        }
      }
      return '';
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? full;
  });
}

/**
 * Convert WordPress HTML content to plain text.
 *
 * - Block elements (p, h2, h3, div, li) become newline-separated lines
 * - <br> becomes a line break
 * - Scripts/styles, images, links (kept as their text), and iframes removed
 * - Entities decoded (see decodeHtmlEntities)
 */
export function htmlToText(html: string): string {
  let s = html;

  // Drop whole elements we never want
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  s = s.replace(/<iframe[\s\S]*?<\/iframe>/gi, ' ');
  s = s.replace(/<svg[\s\S]*?<\/svg>/gi, ' ');

  // Block boundaries → newline
  s = s.replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|blockquote|pre|hr)>/gi, '\n');
  s = s.replace(/<(p|div|h1|h2|h3|h4|h5|h6|li|blockquote|pre|hr)[^>]*>/gi, '\n');
  // Line breaks
  s = s.replace(/<br\s*\/?>/gi, '\n');

  // Replace images/links with alt/text content
  s = s.replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, ' $1 ');
  s = s.replace(/<img[^>]*>/gi, ' ');
  s = s.replace(/<a\s[^>]*>([\s\S]*?)<\/a>/gi, '$1');

  // Strip remaining tags
  s = s.replace(/<[^>]*>/g, ' ');

  // Decode entities
  s = decodeHtmlEntities(s);

  // Cleanup: normalize whitespace, blank lines
  return s
    .replace(/[\u00A0\u2007\u202F]/g, ' ')   // non-breaking spaces
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
