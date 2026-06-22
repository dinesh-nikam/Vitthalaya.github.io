import fs from 'fs';
import path from 'path';

const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
const dbUrl = process.env.DATABASE_URL || '';
const isCockroach = dbUrl.includes('cockroach') || dbUrl.includes('26257');
const targetProvider = isCockroach ? 'cockroachdb' : 'postgresql';

console.log(`[DB Provider Switcher] DATABASE_URL host check: ${isCockroach ? 'CockroachDB' : 'PostgreSQL'}`);
console.log(`[DB Provider Switcher] Target provider: ${targetProvider}`);

if (!fs.existsSync(schemaPath)) {
  console.error(`[DB Provider Switcher] Error: Schema file not found at ${schemaPath}`);
  process.exit(1);
}

const schema = fs.readFileSync(schemaPath, 'utf8');

// Match only the provider definition within the datasource db block
const datasourceRegex = /(datasource\s+db\s*\{[^}]*provider\s*=\s*["'])(postgresql|cockroachdb)(["'])/;

if (!datasourceRegex.test(schema)) {
  console.error('[DB Provider Switcher] Error: Could not locate database provider in schema.prisma');
  process.exit(1);
}

const updatedSchema = schema.replace(datasourceRegex, `$1${targetProvider}$3`);

if (schema !== updatedSchema) {
  fs.writeFileSync(schemaPath, updatedSchema, 'utf8');
  console.log(`[DB Provider Switcher] Successfully updated schema provider to: ${targetProvider}`);
} else {
  console.log(`[DB Provider Switcher] Schema provider is already: ${targetProvider}`);
}
