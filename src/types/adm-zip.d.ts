/**
 * Minimal type declarations for adm-zip@0.5.17.
 * Full API: https://github.com/cthackers/adm-zip
 */

declare module 'adm-zip' {
  interface AdmZipOptions {
    password?: string;
  }

  /** A single entry within the ZIP archive */
  interface ZipEntry {
    entryName: string;
    name: string;
    isDirectory: boolean;
    header: any;
    /** Get decompressed data */
    getData(): Buffer;
    /** Get compressed data */
    getCompressedData(): Buffer;
  }

  class AdmZip {
    constructor(input?: string | Buffer | AdmZipOptions);

    addFile(entryName: string, content: string | Buffer, comment?: string, attr?: number): void;
    addLocalFolder(localPath: string, zipPath?: string, regExp?: RegExp): void;
    addLocalFile(localPath: string, zipPath?: string): void;
    addFromBuffer(buffer: Buffer, zipPath: string): void;
    deleteFile(entryName: string): void;
    extractAllTo(targetPath: string, overwrite?: boolean, password?: string): void;
    getEntries(): ZipEntry[];
    getEntry(entryName: string): ZipEntry | null;
    readFile(entryName: string): Buffer | null;
    readAsText(entryName: string, encoding?: string): string;
    writeZip(targetPath?: string): void;
    toBuffer(): Buffer;
    updateFile(entryName: string, content: Buffer, comment?: string): void;
  }

  export = AdmZip;
}
