/**
 * Digital Pandharpur — ZIP extraction utilities
 *
 * Lightweight ZIP text extraction for DOCX and EPUB files.
 * Uses Bun's built-in zip support or Node.js zlib.
 */

/**
 * Extract a specific file from a ZIP archive and return its text content.
 * Falls back gracefully if no ZIP library is available.
 */
export async function extractTextFromZip(
  buffer: Buffer,
  entryPath: string
): Promise<string> {
  // Try Bun's built-in file type detection
  try {
    const entries = await tryUnzipWithBun(buffer, entryPath);
    if (entries) return entries;
  } catch {
    // fall through
  }

  // Try JSZip or adm-zip dynamic import
  try {
    const AdmZip = await import('adm-zip').then(m => m.default || m);
    const zip = new AdmZip(buffer);
    const entry = zip.getEntry(entryPath);
    if (entry) {
      return entry.getData().toString('utf-8');
    }
  } catch {
    // fall through
  }

  try {
    // Try to find content manually — minimal ZIP parser for uncompressed entries
    const result = tryMinimalZipParse(buffer, entryPath);
    if (result) return result;
  } catch {
    // fall through
  }

  return '';
}

/**
 * Try to extract using Bun's FFI or native zip support
 */
async function tryUnzipWithBun(buffer: Buffer, entryPath: string): Promise<string | null> {
  try {
    // Bun has built-in support for reading zip files via file types
    const filePath = `/tmp/zip-extract-${Date.now()}.zip`;
    await Bun.write(filePath, buffer);
    
    // Try reading specific entry if Bun supports it
    const pipe = Bun.spawnSync(['unzip', '-p', filePath, entryPath]);
    if (pipe.exitCode === 0 && pipe.stdout.length > 0) {
      return pipe.stdout.toString('utf-8');
    }
    
    // Cleanup
    try { await Bun.$`rm ${filePath}`; } catch {}
  } catch {
    // fall through
  }
  return null;
}

/**
 * Minimal ZIP local file header parser.
 * Only handles stored (uncompressed) entries.
 */
function tryMinimalZipParse(buffer: Buffer, targetPath: string): string | null {
  const normalizedTarget = targetPath.replace(/\\/g, '/');
  let offset = 0;

  while (offset < buffer.length - 30) {
    // Local file header signature: 0x04034b50
    if (buffer.readUInt32LE(offset) !== 0x04034b50) {
      offset++;
      continue;
    }

    const compressionMethod = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const filenameLength = buffer.readUInt16LE(offset + 26);
    const extraFieldLength = buffer.readUInt16LE(offset + 28);

    const filename = buffer
      .subarray(offset + 30, offset + 30 + filenameLength)
      .toString('utf-8')
      .replace(/\\/g, '/');

    const dataStart = offset + 30 + filenameLength + extraFieldLength;

    if (filename === normalizedTarget) {
      if (compressionMethod === 0) {
        // Stored (uncompressed)
        return buffer.subarray(dataStart, dataStart + uncompressedSize).toString('utf-8');
      }
      // Compressed — try zlib inflate
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const zlib = require('zlib');
        const decompressed = zlib.inflateRawSync(
          buffer.subarray(dataStart, dataStart + compressedSize)
        );
        return decompressed.toString('utf-8');
      } catch {
        return null;
      }
    }

    offset = dataStart + compressedSize;
  }

  return null;
}
