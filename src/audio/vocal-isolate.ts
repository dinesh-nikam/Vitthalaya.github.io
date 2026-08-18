/**
 * Digital Pandharpur — Vocal Isolation (demucs)
 *
 * Uses the demucs CLI (python, `--two-stems=vocals`) when installed to
 * produce a vocals-only WAV. demucs is an optional, heavy dependency — when
 * it is not present the pipeline says so honestly and the player simply
 * shows Original + Enhanced (no vocal-focused asset).
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync, type Dirent } from 'node:fs';
import { join } from 'node:path';
import { detectCapabilities } from './tooling';

export interface VocalIsolationResult {
  ok: boolean;
  vocalPath?: string;
  sizeBytes?: number;
  error?: string;
}

const DEMUCS_TIMEOUT_MS = 600_000; // 10 min — demucs runs on CPU by default

/**
 * Isolate vocals from `inputPath`, writing stems under `outputDir`.
 * Returns the path of the generated vocals.wav.
 */
export function isolateVocals(inputPath: string, outputDir: string): VocalIsolationResult {
  const caps = detectCapabilities();
  if (!caps.demucs) {
    return { ok: false, error: 'demucs not available — vocal isolation skipped.' };
  }

  try {
    execFileSync(
      'demucs',
      ['--two-stems=vocals', '-o', outputDir, inputPath],
      { stdio: 'pipe', timeout: DEMUCS_TIMEOUT_MS }
    );
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `demucs failed: ${msg.slice(0, 300)}` };
  }

  // demucs writes <outputDir>/htdemucs/<input-basename>/vocals.wav
  const inputBase = inputPath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') ?? 'input';
  const candidates = [
    join(outputDir, 'htdemucs', inputBase, 'vocals.wav'),
    join(outputDir, 'htdemucs', `${inputBase}.wav`, 'vocals.wav'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return { ok: true, vocalPath: candidate, sizeBytes: statSync(candidate).size };
    }
  }

  // Fall back to scanning the output tree for any vocals.wav.
  try {
    const found = findVocalsWav(outputDir);
    if (found) {
      return { ok: true, vocalPath: found, sizeBytes: statSync(found).size };
    }
  } catch {
    // fall through
  }

  return { ok: false, error: 'demucs ran but no vocals.wav was produced.' };
}

function findVocalsWav(dir: string, depth = 0): string | null {
  if (depth > 4) return null;
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findVocalsWav(full, depth + 1);
      if (found) return found;
    } else if (entry.name === 'vocals.wav') {
      return full;
    }
  }
  return null;
}
