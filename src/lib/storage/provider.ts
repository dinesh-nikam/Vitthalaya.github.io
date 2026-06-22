/**
 * Digital Pandharpur — Storage Provider Interface
 *
 * Abstract storage layer supporting local filesystem and S3-compatible backends.
 * All uploaded file operations go through this interface.
 *
 * Provider selection via STORAGE_PROVIDER env var: "local" | "s3"
 */

export interface StorageProvider {
  /** Save a file buffer to storage. Returns the storage path. */
  save(filename: string, data: Buffer, mimeType: string): Promise<string>;

  /** Read a file from storage by its path. */
  read(storagePath: string): Promise<Buffer>;

  /** Delete a file from storage. */
  delete(storagePath: string): Promise<void>;

  /** Get a public URL for the file (local paths need /uploads/ prefix). */
  getUrl(storagePath: string): string;

  /** Check if a file exists. */
  exists(storagePath: string): Promise<boolean>;

  /** Copy a file within storage. */
  copy(fromPath: string, toPath: string): Promise<string>;
}

export interface StorageConfig {
  provider: 'local' | 's3';
  /** For local: upload directory path. For S3: bucket name. */
  basePath: string;
  /** Public URL base for serving files */
  publicUrlBase: string;
}
