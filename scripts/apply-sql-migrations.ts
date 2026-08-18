/**
 * Digital Pandharpur — Apply flat SQL migrations.
 *
 * `prisma db push` provisions tables declared in the Prisma schema, but the
 * project also carries flat `.sql` migrations (prisma/migrations/*.sql) for
 * tables and indexes that are NOT Prisma models (e.g. composition_embeddings,
 * graph edges). Those files are all idempotent (IF NOT EXISTS guards), so this
 * script applies every one of them in order and can safely run on every
 * `db push` — a fresh clone and an already-pushed dev DB both end up correct.
 *
 * Hooked into `db:seed` so build + CI + local dev all run it.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const MIGRATIONS_DIR = path.join(process.cwd(), 'prisma', 'migrations');

function main(): void {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('[sql:migrate] No migrations directory — nothing to apply.');
    return;
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('[sql:migrate] No flat SQL migrations found.');
    return;
  }

  for (const file of files) {
    const fullPath = path.join(MIGRATIONS_DIR, file);
    console.log(`[sql:migrate] Applying ${file} ...`);
    try {
      execSync(`bunx prisma db execute --file "${fullPath}" --schema prisma/schema.prisma`, {
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8',
        env: process.env,
      });
      console.log(`[sql:migrate]   ✓ ${file}`);
    } catch (err) {
      const raw = err as { stderr?: Buffer | string; message?: string };
      const stderr = raw.stderr ? raw.stderr.toString() : '';
      const message = stderr || raw.message || String(err);
      // A missing Postgres extension (e.g. pgvector) is an environment
      // dependency, not a schema defect. The runtime already degrades those
      // features (semantic search falls back to lexical), so warn and move on
      // rather than bricking `db:seed` on machines without the extension.
      if (/extension ['"][a-z_]+['"] is not available/i.test(message)) {
        console.warn(`[sql:migrate]   ⚠ ${file} skipped: Postgres extension not available in this environment.`);
        console.warn(`[sql:migrate]     ${message.split('\n')[0]}`);
        continue;
      }
      // Fail loudly: any other SQL failure means the DB is missing required
      // infrastructure.
      console.error(`[sql:migrate] ✗ ${file} FAILED:`, message);
      process.exit(1);
    }
  }
  console.log('[sql:migrate] Done.');
}

main();
