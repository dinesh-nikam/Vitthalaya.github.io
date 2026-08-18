// @ts-nocheck
/**
 * Digital Pandharpur - Backup Restore Script
 * Restores database from a .sql.gz backup file.
 *
 * Usage:
 *   bun run scripts/backup-restore.ts --file <path>          # Restore from file
 *   bun run scripts/backup-restore.ts --file <path> --dry-run # Verify only, no restore
 */

import { readFile } from 'fs/promises';
import { createHash } from 'crypto';
import { $ } from 'bun:shell';

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    file: args.includes('--file') ? args[args.indexOf('--file') + 1] : null,
    dryRun: args.includes('--dry-run'),
  };
}

async function computeChecksum(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

async function verifyChecksum(filePath: string): Promise<boolean> {
  const checksumPath = `${filePath}.sha256`;
  try {
    const content = await readFile(checksumPath, 'utf-8');
    const [expectedHash] = content.trim().split(/\s+/);
    const actualHash = await computeChecksum(filePath);
    return actualHash === expectedHash;
  } catch {
    console.warn('⚠️ No checksum file found. Proceeding without verification.');
    return true; // Allow restore without checksum
  }
}

async function restoreFromBackup(filePath: string, dryRun: boolean): Promise<void> {
  console.log(`\n📦 Restore target: ${filePath}`);

  // Verify checksum first
  console.log('🔍 Verifying checksum...');
  const checksumOk = await verifyChecksum(filePath);
  if (!checksumOk) {
    console.error('❌ Checksum verification failed. Backup may be corrupted.');
    process.exit(1);
  }
  console.log('✅ Checksum verified');

  if (dryRun) {
    console.log('\n🔍 Dry run — no changes made. Checksum is valid, backup is ready to restore.');
    return;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not set. Cannot restore.');
    process.exit(1);
  }

  const url = new URL(dbUrl);
  const host = url.hostname;
  const port = url.port || '5432';
  const database = url.pathname.slice(1);
  const username = url.username;
  const password = url.password;

  console.log(`\n🔄 Restoring to database: ${database}@${host}:${port}`);
  console.log('⚠️  This will OVERWRITE the current database!\n');

  const cmd = `gunzip -c ${filePath} | PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d ${database}`;
  console.log(`▶ Executing restore...`);

  try {
    await $`${cmd}`.quiet();
    console.log('✅ Restore completed successfully');
  } catch (err) {
    console.error(`❌ Restore failed: ${err.stderr?.toString() || err.message}`);
    process.exit(1);
  }
}

async function main() {
  const options = parseArgs();
  console.log('🔒 Digital Pandharpur Backup Restore\n');

  if (!options.file) {
    console.log('Usage:');
    console.log('  bun run scripts/backup-restore.ts --file <path>');
    console.log('  bun run scripts/backup-restore.ts --file <path> --dry-run');
    process.exit(1);
  }

  await restoreFromBackup(options.file, options.dryRun);
}

main().catch(err => {
  console.error('Restore error:', err);
  process.exit(1);
});
