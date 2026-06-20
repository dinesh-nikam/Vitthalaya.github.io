/**
 * Test setup and global configuration for Digital Pandharpur test suite
 */

// Test database setup
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'file:./varkari-test.db';

// Mock environment variables
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.LLM_PROVIDER = 'ollama';
process.env.LLM_MODEL = 'gemma2:9b';

// Global timeout for tests (30s)
export const TEST_TIMEOUT = 30000;

// ISO strings for date testing
export const DATE_FIXTURES = {
  today: new Date().toISOString(),
  ashadhiEkadashi: '2026-06-25T00:00:00.000Z', // Approximate
  kartikiEkadashi: '2026-11-09T00:00:00.000Z', // Approximate
};

// Unicode test strings
export const UNICODE_FIXTURES = {
  devanagari: 'विठ्ठल',
  marathiWithChandrabindu: 'उं आदि',
  mixedScript: 'Tukaram विठ्ठल',
  ocrVariant: 'विठठल', // Missing dot
  combiningMarks: 'उँ', // U + anusvara
  rtlOverride: '‮श्लोक', // Right-to-left override
  zeroWidth: 'श​लोक', // Zero-width space
};

// Test slugs
export const SLUG_FIXTURES = {
  saint: 'tukaram-maharaj',
  composition: 'tuj-rup-chiti-raho',
  deity: 'vitthal',
  festival: 'ashadhi-ekadashi',
};