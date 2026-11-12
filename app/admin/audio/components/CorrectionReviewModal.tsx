import * as React from 'react';
import { FileDiff, X, Loader2, Check } from 'lucide-react';
import type { TranscriptCorrectionItem } from '../types';
import {
  CorrectionStatusBadge,
  ERROR_TYPE_LABELS,
  parseDiffLines,
  LineWords,
} from './StatusBadges';

interface CorrectionReviewModalProps {
  reviewing: TranscriptCorrectionItem;
  verifyBusy: boolean;
  verifyNotes: string;
  onNotesChange: (notes: string) => void;
  onClose: () => void;
  onVerify: (action: 'approve' | 'reject') => Promise<void>;
}

export function CorrectionReviewModal({
  reviewing,
  verifyBusy,
  verifyNotes,
  onNotesChange,
  onClose,
  onVerify,
}: CorrectionReviewModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={() => !verifyBusy && onClose()}
    >
      <div
        className="bg-white dark:bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-border">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-maroon-800 dark:text-saffron flex items-center gap-2">
              <FileDiff className="h-5 w-5" /> ट्रान्सक्रिप्ट सुधारणा पडताळणी
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {reviewing.upload?.originalName || 'रेकॉर्डिंग'} ·{' '}
              {reviewing.upload?.user?.name || reviewing.upload?.user?.email || '—'}
            </p>
          </div>
          <button
            onClick={() => !verifyBusy && onClose()}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            aria-label="बंद करा"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Meta row */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-2">
              स्थिती: <CorrectionStatusBadge status={reviewing.status} />
            </span>
            <span className="text-muted-foreground">
              आत्मविश्वास:{' '}
              <strong className="text-foreground">
                {Math.round((reviewing.confidence ?? 0) * 100)}%
              </strong>
            </span>
            <span className="text-muted-foreground">
              त्रुटी प्रकार:{' '}
              <strong className="text-foreground">
                {ERROR_TYPE_LABELS[reviewing.errorType] ?? reviewing.errorType ?? '—'}
              </strong>
            </span>
            <span className="text-muted-foreground">
              मॉडेल आवृत्ती:{' '}
              <strong className="font-mono text-foreground">{reviewing.modelVersion || '—'}</strong>
            </span>
          </div>

          {/* Canonical reference */}
          {reviewing.canonicalText && (
            <div className="rounded-xl border border-border p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                कॅनॉनिकल संदर्भ (पुष्टी रचना)
              </h4>
              <p className="text-sm leading-relaxed text-muted-foreground max-h-28 overflow-y-auto whitespace-pre-line">
                {reviewing.canonicalText}
              </p>
            </div>
          )}

          {/* Line-by-line diff */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              मूळ ↔ सुधारित (ओळ-स्तर फरक)
            </h4>
            {parseDiffLines(reviewing.diffJson).length === 0 && (
              <p className="text-sm text-muted-foreground">फरक तपशील उपलब्ध नाही.</p>
            )}
            <div className="space-y-3">
              {parseDiffLines(reviewing.diffJson).map((line, i) => {
                const changedOriginals = new Set((line.wordDiffs ?? []).map((d) => d.original));
                const changedCorrecteds = new Set((line.wordDiffs ?? []).map((d) => d.corrected));
                const hasChanges = (line.wordDiffs?.length ?? 0) > 0;
                return (
                  <div key={i} className="rounded-xl border border-border p-3 space-y-1.5">
                    {line.asr ? (
                      <p className="text-sm text-muted-foreground">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 mr-2">
                          मूळ
                        </span>
                        <LineWords line={line.asr} changed={hasChanges ? changedOriginals : new Set()} />
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        (मूळ ASR मध्ये ओळ नाही — कॅनॉनिकलमधून नवीन)
                      </p>
                    )}
                    {line.canonical ? (
                      <p className="text-sm text-emerald-700 dark:text-emerald-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mr-2">
                          सुधारित
                        </span>
                        <LineWords
                          line={line.canonical}
                          changed={hasChanges ? changedCorrecteds : new Set()}
                        />
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        (कॅनॉनिकलमध्ये समतुल्य नाही — सुधारणा झाली नाही)
                      </p>
                    )}
                    {hasChanges && (
                      <p className="text-[11px] text-muted-foreground">
                        समानता: {Math.round((line.similarity ?? 0) * 100)}% · बदललेले शब्द:{' '}
                        {line.wordDiffs!.length}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verifier notes + actions */}
          {reviewing.status === 'pending' ? (
            <div className="rounded-xl border border-border p-4 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                टिप्पणी (ऐच्छिक)
                <textarea
                  value={verifyNotes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  rows={2}
                  disabled={verifyBusy}
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-saffron"
                  placeholder="मंजूर/नाकारण्याचे कारण…"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => onVerify('approve')}
                  disabled={verifyBusy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {verifyBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  मंजूर करा — ट्रेनिंग लूपसाठी
                </button>
                <button
                  onClick={() => onVerify('reject')}
                  disabled={verifyBusy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {verifyBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  नाकारा
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
              <p>
                {reviewing.status === 'approved' ? 'मंजूर केले:' : 'नाकारले:'}{' '}
                <strong className="text-foreground">
                  {reviewing.verifier?.name || reviewing.verifier?.email || '—'}
                </strong>
              </p>
              {reviewing.notes && <p className="mt-1">टिप्पणी: {reviewing.notes}</p>}
              {reviewing.status === 'approved' && (
                <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3 w-3 inline mr-1" />
                  मॉडेल आवृत्ती <strong>{reviewing.modelVersion || '—'}</strong> सह मंजूर —
                  प्रशिक्षण/मूल्यांकन डेटासेटमध्ये पात्र.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
