#!/usr/bin/env bun
/**
 * Index compositions for search
 * Run after database seed: bun run scripts/index-search.ts
 */

import { initializeSearchIndex, indexAllCompositions, testTransliterationSearch } from '../src/lib/search-client';

async function main() {
  try {
    console.log('Starting search index...');
    await initializeSearchIndex();
    await indexAllCompositions();

    // Test transliteration
    const pass = await testTransliterationSearch();

    if (pass) {
      console.log('\n✓ Search indexing complete with transliteration verification');
      process.exit(0);
    } else {
      console.error('\n✗ Transliteration test failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('Search indexing failed:', error);
    process.exit(1);
  }
}

main();