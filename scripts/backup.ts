// @ts-nocheck
/**
 * Digital Pandharpur - Database Backup Script
 * Creates automated backups for PostgreSQL database and manuscript uploads
 *
 * Usage:
 *   bun run scripts/backup.ts --full        # Full backup (database + uploads)
 *   bun run scripts/backup.ts --database   # Database only
 *   bun run scripts/backup.ts --uploads    # Uploads only
 *   bun run scripts/backup.ts --list       # List existing backups
 */

import { $ } from 'bun:shell';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';

const BACKUP_DIR = process.env.BACKUP_DIR || join(process.cwd(), 'backups');

interface BackupOptions {
  full: boolean;
  database: boolean;
  uploads: boolean;
  list: boolean;
  verify: boolean;
}

function parseArgs(): BackupOptions {
  const args = process.argv.slice(2);
  return {
    full: args.includes('--full') || args.length === 0,
    database: args.includes('--database'),
    uploads: args.includes('--uploads'),
    list: args.includes('--list'),
    verify: args.includes('--verify'),
  };
}

function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function computeChecksum(filePath: string): Promise<string> {
  const fileBuffer = await readFile(filePath);
  return createHash('sha256').update(fileBuffer).digest('hex');
}

async function writeChecksum(filePath: string): Promise<string> {
  const hash = await computeChecksum(filePath);
  const checksumPath = `${filePath}.sha256`;
  const content = `${hash}  ${filePath.split('/').pop()}\n`;
  await writeFile(checksumPath, content);
  return hash;
}

async function runCommand(cmd: string, description: string): Promise<{ success: boolean; output: string }> {
  console.log(`▶ ${description}...`);
  try {
    const proc = await $`${cmd}`.quiet();
    return { success: true, output: proc.stdout.toString() };
  } catch (err: any) {
    return { success: false, output: err.stderr?.toString() || err.message };
  }
}

async function backupDatabase(): Promise<string | null> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not set. Cannot perform database backup.');
    return null;
  }

  const timestamp = getTimestamp();
  const filename = `pandharpur-db-${timestamp}.sql.gz`;
  const filepath = join(BACKUP_DIR, filename);

  // Ensure backup directory exists
  await mkdir(BACKUP_DIR, { recursive: true });

  // Parse database URL for pg_dump
  const url = new URL(dbUrl);
  const host = url.hostname;
  const port = url.port || '5432';
  const database = url.pathname.slice(1);
  const username = url.username;
  const password = url.password;

  const cmd = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -F p | gzip > ${filepath}`;

  const result = await runCommand(cmd, 'Creating database backup');

  if (result.success) {
    const hash = await writeChecksum(filepath);
    console.log(`✅ Database backup created: ${filepath}`);
    console.log(`   SHA-256: ${hash}`);
    return filepath;
  } else {
    console.error(`❌ Database backup failed: ${result.output}`);
    return null;
  }
}

async function backupUploads(): Promise<string | null> {
  const timestamp = getTimestamp();
  const filename = `pandharpur-uploads-${timestamp}.tar.gz`;
  const filepath = join(BACKUP_DIR, filename);

  const uploadDir = join(process.cwd(), 'public', 'uploads');

  // Check if uploads directory exists
  const checkResult = await runCommand(`test -d "${uploadDir}" && echo "exists"`, 'Checking uploads directory');
  if (checkResult.output.trim() !== 'exists') {
    console.warn('⚠️ Uploads directory not found. Skipping uploads backup.');
    return null;
  }

  const cmd = `tar -czf ${filepath} -C ${uploadDir} .`;
  const result = await runCommand(cmd, 'Creating uploads backup');

  if (result.success) {
    const hash = await writeChecksum(filepath);
    console.log(`✅ Uploads backup created: ${filepath}`);
    console.log(`   SHA-256: ${hash}`);
    return filepath;
  } else {
    console.error(`❌ Uploads backup failed: ${result.output}`);
    return null;
  }
}

async function listBackups(): Promise<void> {
  const result = await runCommand(`ls -la ${BACKUP_DIR} 2>/dev/null || echo "No backups found"`, 'Listing backups');
  console.log(result.output);
}

async function verifyAllBackups(): Promise<void> {
  console.log('🔍 Verifying backup integrity...\n');
  const { readdir } = await import('fs/promises');
  const files = await readdir(BACKUP_DIR).catch(() => []);
  const checksumFiles = files.filter(f => f.endsWith('.sha256'));

  if (checksumFiles.length === 0) {
    console.log('No checksum files found. Run backup first.');
    return;
  }

  let verified = 0;
  let failed = 0;

  for (const checksumFile of checksumFiles) {
    const checksumPath = join(BACKUP_DIR, checksumFile);
    const content = await readFile(checksumPath, 'utf-8');
    const [expectedHash, filename] = content.trim().split(/\s+/);
    const backupPath = join(BACKUP_DIR, filename);

    try {
      const actualHash = await computeChecksum(backupPath);
      if (actualHash === expectedHash) {
        console.log(`✅ ${filename} — integrity verified`);
        verified++;
      } else {
        console.error(`❌ ${filename} — CHECKSUM MISMATCH!`);
        failed++;
      }
    } catch {
      console.error(`❌ ${filename} — file not found or unreadable`);
      failed++;
    }
  }

  console.log(`\n📋 Verification: ${verified} passed, ${failed} failed`);
}

async function cleanupOldBackups(maxAgeDays = 30): Promise<void> {
  console.log(`▶ Cleaning up backups older than ${maxAgeDays} days...`);
  const cmd = `find ${BACKUP_DIR} -name "*.sql.gz" -o -name "*.tar.gz" | xargs -r stat -c %Y,%n 2>/dev/null | awk -F, -v cutoff=$(date -d "-${maxAgeDays} days" +%s) '$1 < cutoff {print $2}' | xargs -r rm -f 2>/dev/null || true`;

  await $`rm -f ${BACKUP_DIR}/*.sql.gz ${BACKUP_DIR}/*.tar.gz 2>/dev/null || true`.quiet();
  console.log('✅ Cleanup complete');
}

async function main(): Promise<void> {
  const options = parseArgs();

  console.log('🔒 Digital Pandharpur Backup System');
  console.log('===================================\n');

  if (options.list) {
    await listBackups();
    return;
  }

  if (options.verify) {
    await verifyAllBackups();
    return;
  }

  const promises: Promise<string | null>[] = [];

  if (options.full || options.database) {
    promises.push(backupDatabase());
  }

  if (options.full || options.uploads) {
    promises.push(backupUploads());
  }

  const results = await Promise.all(promises);

  // Cleanup old backups after successful backup
  if (results.some(r => r !== null)) {
    await cleanupOldBackups();
  }

  console.log('\n📋 Backup Summary:');
  console.log(`   Database: ${options.database || options.full ? (results[0] ? '✅ Success' : '❌ Failed') : '⏭️ Skipped'}`);
  console.log(`   Uploads:  ${options.uploads || options.full ? (results[1] ? '✅ Success' : '❌ Failed') : '⏭️ Skipped'}`);
}

main().catch((err) => {
  console.error('Backup script fatal error:', err);
  process.exit(1);
});