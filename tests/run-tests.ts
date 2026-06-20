// @ts-nocheck
#!/usr/bin/env bun
/**
 * Test runner script for Digital Pandharpur
 * Runs all test suites with appropriate timeouts and reporters
 */

import { spawn } from 'bun';

const TEST_SUITES = [
  { name: 'Unit - Canonical', path: 'tests/unit/canonical-canonicaller.test.ts', timeout: 30000 },
  { name: 'Unit - Search', path: 'tests/unit/search-client.test.ts', timeout: 30000 },
  { name: 'Unit - Knowledge Graph', path: 'tests/unit/knowledge-graph.test.ts', timeout: 30000 },
  { name: 'Unit - API Search', path: 'tests/unit/api-search.test.ts', timeout: 30000 },
  { name: 'Unit - Security', path: 'tests/unit/security-sanitize.test.ts', timeout: 30000 },
  { name: 'Unit - Scraper', path: 'tests/unit/scraper-extractor.test.ts', timeout: 30000 },
  { name: 'Unit - Festival', path: 'tests/unit/festival-calculator.test.ts', timeout: 30000 },
];

let passed = 0;
let failed = 0;

console.log('🧪 Digital Pandharpur Test Suite\n');

for (const suite of TEST_SUITES) {
  console.log(`\n📋 Running: ${suite.name}`);
  const proc = spawn({
    cmd: ['bun', 'test', suite.path, '--timeout', String(suite.timeout)],
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const exitCode = await proc.exited;

  if (exitCode === 0) {
    console.log(`✅ ${suite.name} passed`);
    passed++;
  } else {
    console.log(`❌ ${suite.name} failed`);
    failed++;
  }
}

console.log(`\n📊 Summary: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);