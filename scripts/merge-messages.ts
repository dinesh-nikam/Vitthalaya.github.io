/**
 * Merge message partials into final locale files.
 *
 * Each translation work unit writes its namespace to:
 *   messages/partials/<locale>/<namespace>.json   e.g. messages/partials/en/header.json
 *
 * Run: bun scripts/merge-messages.ts
 * Output: messages/<locale>.json (deep-merged with the existing base file)
 *
 * Verifies: after merge, every key present in en.json exists in mr.json and hi.json.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const LOCALES = ['mr', 'en', 'hi'];
const ROOT = process.cwd();
const PARTIALS_DIR = join(ROOT, 'messages', 'partials');

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value) && isPlainObject(target[key])) {
      target[key] = deepMerge(target[key] as Record<string, unknown>, value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) {
      keys.push(...collectKeys(value, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

function loadJson(file: string): Record<string, unknown> {
  return JSON.parse(readFileSync(file, 'utf-8'));
}

function mergeLocale(locale: string): void {
  const baseFile = join(ROOT, 'messages', `${locale}.json`);
  const merged: Record<string, unknown> = existsSync(baseFile) ? loadJson(baseFile) : {};
  const localePartials = join(PARTIALS_DIR, locale);

  if (existsSync(localePartials)) {
    const files = readdirSync(localePartials).filter((f) => f.endsWith('.json')).sort();
    for (const file of files) {
      const partial = loadJson(join(localePartials, file));
      deepMerge(merged, partial);
    }
  }

  writeFileSync(baseFile, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
  console.log(`Merged ${locale}: ${collectKeys(merged).length} keys`);
}

function verifyParity(): void {
  const en = loadJson(join(ROOT, 'messages', 'en.json'));
  const enKeys = new Set(collectKeys(en));
  let failures = 0;

  for (const locale of LOCALES.filter((l) => l !== 'en')) {
    const other = loadJson(join(ROOT, 'messages', `${locale}.json`));
    const otherKeys = new Set(collectKeys(other));
    const missing = [...enKeys].filter((k) => !otherKeys.has(k));
    const extra = [...otherKeys].filter((k) => !enKeys.has(k));
    if (missing.length) {
      failures += missing.length;
      console.error(`[${locale}] MISSING ${missing.length} keys vs en:`);
      for (const k of missing.slice(0, 40)) console.error(`   - ${k}`);
    }
    if (extra.length) {
      console.warn(`[${locale}] ${extra.length} extra keys not in en (first 10):`);
      for (const k of extra.slice(0, 10)) console.warn(`   + ${k}`);
    }
  }

  if (failures > 0) {
    console.error(`\n⚠️  ${failures} missing translation keys. Fix before shipping.`);
    process.exitCode = 1;
  } else {
    console.log('\n✅ All locales have parity with en.json');
  }
}

// Ensure partials dir exists so agents can write into it
for (const locale of LOCALES) {
  mkdirSync(join(PARTIALS_DIR, locale), { recursive: true });
}

for (const locale of LOCALES) {
  mergeLocale(locale);
}
verifyParity();
