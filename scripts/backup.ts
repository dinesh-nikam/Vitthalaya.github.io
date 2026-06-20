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
import { mkdir } from 'fs/promises';
import { join } from 'path';

const BACKUP_DIR = process.env.BACKUP_DIR || join(process.cwd(), 'backups');

interface BackupOptions {
  full: boolean;
  database: boolean;
  uploads: boolean;
  list: boolean;
}

function parseArgs(): BackupOptions {
  const args = process.argv.slice(2);
  return {
    full: args.includes('--full') || args.length === 0,
    database: args.includes('--database'),
    uploads: args.includes('--uploads'),
    list: args.includes('--list'),
  };
}

function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
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
    console.log(`✅ Database backup created: ${filepath}`);
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
    console.log(`✅ Uploads backup created: ${filepath}`);
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