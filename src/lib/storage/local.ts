/**
 * Digital Pandharpur — Local Filesystem Storage Provider
 *
 * Stores files under the configured base directory (default: public/uploads/).
 * Files are organized by date to prevent directory bloat:
 *   uploads/YYYY-MM/<uuid>-<original-name>
 */

import { writeFile, readFile, unlink, copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { StorageProvider, StorageConfig } from './provider';

const DEFAULT_BASE_PATH = join(process.cwd(), 'public', 'uploads');

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;
  private publicUrlBase: string;

  constructor(config?: Partial<StorageConfig>) {
    this.basePath = config?.basePath ?? DEFAULT_BASE_PATH;
    this.publicUrlBase = config?.publicUrlBase ?? '/uploads';
  }

  private getDatePrefix(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private resolvePath(storagePath: string): string {
    // storagePath is relative to basePath (e.g. "2025-06/uuid-foo.pdf")
    return join(this.basePath, storagePath);
  }

  private async ensureDir(dir: string): Promise<void> {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  async save(filename: string, data: Buffer, _mimeType: string): Promise<string> {
    const datePrefix = this.getDatePrefix();
    const dir = join(this.basePath, datePrefix);
    await this.ensureDir(dir);

    const safeName = filename.replace(/[^a-zA-Z0-9._()-]/g, '_');
    const storagePath = `${datePrefix}/${Date.now()}-${safeName}`;
    const fullPath = this.resolvePath(storagePath);

    await writeFile(fullPath, data);
    return storagePath;
  }

  async read(storagePath: string): Promise<Buffer> {
    return readFile(this.resolvePath(storagePath));
  }

  async delete(storagePath: string): Promise<void> {
    try {
      await unlink(this.resolvePath(storagePath));
    } catch {
      // File already gone — no-op
    }
  }

  async exists(storagePath: string): Promise<boolean> {
    try {
      await readFile(this.resolvePath(storagePath));
      return true;
    } catch {
      return false;
    }
  }

  async copy(fromPath: string, toPath: string): Promise<string> {
    const fullFrom = this.resolvePath(fromPath);
    const fullTo = this.resolvePath(toPath);
    await this.ensureDir(dirname(fullTo));
    await copyFile(fullFrom, fullTo);
    return toPath;
  }

  getUrl(storagePath: string): string {
    return `${this.publicUrlBase}/${storagePath}`;
  }
}
