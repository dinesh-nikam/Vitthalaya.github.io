/**
 * Input Sanitization Utilities for Digital Pandharpur
 *
 * Sanitizes user-generated content against XSS and injection attacks.
 * Used for corrections, notes, user profiles, and any user-submitted text.
 */

/**
 * Strip HTML tags and dangerous characters from user input.
 * Allows basic text only — no markup.
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')           // Remove all HTML tags
    .replace(/&[a-zA-Z]+;/g, '')       // Remove HTML entities
    .replace(/&#\d+;/g, '')            // Remove numeric entities
    .replace(/javascript:/gi, '')      // Remove javascript: protocol
    .replace(/data:/gi, '')            // Remove data: protocol
    .replace(/vbscript:/gi, '')        // Remove vbscript: protocol
    .trim();
}

/**
 * Sanitize text for safe display in HTML context.
 * Escapes special characters to prevent XSS.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize user-generated text content.
 * Strips HTML, trims whitespace, and enforces max length.
 */
export function sanitizeText(
  input: string,
  options: { maxLength?: number; allowNewlines?: boolean } = {}
): string {
  const { maxLength = 5000, allowNewlines = true } = options;

  let sanitized = stripHtml(input);

  if (!allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]+/g, ' ');
  }

  // Collapse multiple spaces
  sanitized = sanitized.replace(/\s{2,}/g, ' ').trim();

  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength).trim();
  }

  return sanitized;
}

/**
 * Validate that a string contains only safe characters.
 * Blocks control characters (except newline/tab) and common injection patterns.
 */
export function isSafeString(input: string): boolean {
  // Block null bytes
  if (input.includes('\0')) return false;

  // Block control characters except \n \r \t
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(input)) return false;

  // Block common SQL injection patterns (defense in depth — Prisma handles parameterization)
  if (/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b.*\b(FROM|INTO|TABLE|WHERE)\b)/i.test(input)) {
    return false;
  }

  return true;
}
