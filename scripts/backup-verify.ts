// @ts-nocheck
/**
 * Digital Pandharpur - Backup Verification Script
 * Verifies backup integrity by recomputing SHA-256 checksums.
 *
 * Usage:
 *   bun run scripts/backup-verify.ts --verify-all   # Verify all backups
 *   bun run scripts/backup-verify.ts --file <path>  # Verify single file
 */

import { readFile, readdir } from 'fs/promises';
import { createHash } from 'crypto';
import { join } from 'path';

const BACKUP_DIR = process.env.BACKUP_DIR || join(process.cwd(), 'backups');

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    verifyAll: args.includes('--verify-all'),
    file: args.includes('--file') ? args[args.indexOf('--file') + 1] : null,
  };
}

async function computeChecksum(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

async function verifyFile(backupPath: string): Promise<boolean> {
  const checksumPath = `${backupPath}.sha256`;

  try {
    const content = await readFile(checksumPath, 'utf-8');
    const [expectedHash, filename] = content.trim().split(/\s+/);
    const actualHash = await computeChecksum(backupPath);

    const name = backupPath.split(/[\\/]/).pop();
    if (actualHash === expectedHash) {
      console.log(`✅ ${name} — integrity verified`);
      return true;
    } else {
      console.error(`❌ ${name} — CHECKSUM MISMATCH!`);
      console.error(`   Expected: ${expectedHash}`);
      console.error(`   Actual:   ${actualHash}`);
      return false;
    }
  } catch (err) {
    const name = backupPath.split(/[\\/]/).pop();
    console.error(`❌ ${name} — verification failed: ${err.message}`);
    return false;
  }
}

async function verifyAll(): Promise<void> {
  console.log('🔍 Verifying all backups...\n');
  const files = await readdir(BACKUP_DIR).catch(() => []);
  const checksumFiles = files.filter(f => f.endsWith('.sha256'));

  if (checksumFiles.length === 0) {
    console.log('No checksum files found. Run backup first.');
    return;
  }

  let verified = 0;
  let failed = 0;

  for (const checksumFile of checksumFiles) {
    const content = await readFile(join(BACKUP_DIR, checksumFile), 'utf-8');
    const [, filename] = content.trim().split(/\s+/);
    const backupPath = join(BACKUP_DIR, filename);

    const ok = await verifyFile(backupPath);
    if (ok) verified++;
    else failed++;
  }

  console.log(`\n📋 Result: ${verified} passed, ${failed} failed out of ${checksumFiles.length} backups`);
  if (failed > 0) process.exit(1);
}

async function main() {
  const options = parseArgs();
  console.log('🔒 Digital Pandharpur Backup Verification\n');

  if (options.file) {
    const ok = await verifyFile(options.file);
    if (!ok) process.exit(1);
    return;
  }

  if (options.verifyAll) {
    await verifyAll();
    return;
  }

  console.log('Usage:');
  console.log('  bun run scripts/backup-verify.ts --verify-all');
  console.log('  bun run scripts/backup-verify.ts --file <path>');
}

main().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
