import * as React from 'react';
import type { LineAlignment } from '../types';

export const PROCESS_STATUS_LABELS: Record<string, string> = {
  completed: 'पूर्ण',
  transcribing: 'ट्रान्सक्राइब होत आहे',
  pending: 'प्रतीक्षेत',
  extracting: 'काढत आहे',
  failed: 'अयशस्वी',
  transcription_failed: 'ट्रान्सक्रिप्शन अयशस्वी',
  needs_audio_processing: 'ऑडिओ प्रक्रिया आवश्यक',
};

export const CORRECTION_STATUS_LABELS: Record<string, string> = {
  pending: 'प्रलंबित',
  approved: 'मंजूर',
  rejected: 'नाकारले',
};

export const RIGHTS_STATUS_LABELS: Record<string, string> = {
  USER_OWNED: 'मालकीची',
  PUBLIC_DOMAIN_COMPOSITION: 'पब्लिक डोमेन',
  USER_PERFORMANCE: 'स्वतःचे सादरीकरण',
  THIRD_PARTY: 'तृतीय-पक्ष',
  UNKNOWN: 'अज्ञात',
};

export const ERROR_TYPE_LABELS: Record<string, string> = {
  vocabulary: 'शब्दसंग्रह',
  homophone: 'होमोफोन',
  transliteration: 'लिप्यंतरण',
  segmentation: 'विभाजन',
  none: '—',
};

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    transcribing: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    pending: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
    processing: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
    transcription_failed: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
    needs_audio_processing: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
  };
  return (
    <span
      className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${
        styles[status] ?? 'bg-muted text-muted-foreground'
      }`}
    >
      {PROCESS_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function CorrectionStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  };
  return (
    <span
      className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${
        styles[status] ?? 'bg-muted text-muted-foreground'
      }`}
    >
      {CORRECTION_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function fmtDate(iso: string | Date | undefined | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('mr-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '—';
  }
}

/** Parse the persisted diffJson into structured aligned lines for the review panel. */
export function parseDiffLines(diffJson: string | null | undefined): LineAlignment[] {
  if (!diffJson) return [];
  try {
    const parsed = JSON.parse(diffJson);
    if (!Array.isArray(parsed?.alignedLines)) return [];
    return parsed.alignedLines as LineAlignment[];
  } catch {
    return [];
  }
}

/** Parse the persisted diffJson stats (linesCorrected/wordsChanged). */
export function diffStats(
  diffJson: string | null | undefined
): { linesCorrected: number; wordsChanged: number } | null {
  if (!diffJson) return null;
  try {
    const parsed = JSON.parse(diffJson);
    const stats = parsed?.stats;
    if (!stats || typeof stats !== 'object') return null;
    return {
      linesCorrected: typeof stats.linesCorrected === 'number' ? stats.linesCorrected : 0,
      wordsChanged: typeof stats.wordsChanged === 'number' ? stats.wordsChanged : 0,
    };
  } catch {
    return null;
  }
}

/** Split a line into words, highlighting the ones that were changed (for review). */
export function LineWords({ line, changed }: { line: string; changed: Set<string> }) {
  const words = line.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((word, i) =>
        changed.has(word) ? (
          <span
            key={i}
            className="bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 rounded px-1 line-through"
          >
            {word}
          </span>
        ) : (
          <span key={i}>{word} </span>
        )
      )}
    </>
  );
}
