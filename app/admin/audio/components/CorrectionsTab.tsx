import * as React from 'react';
import Link from 'next/link';
import { FileDiff, Check, Eye, ShieldCheck } from 'lucide-react';
import type { AudioDashboardStats, TranscriptCorrectionItem } from '../types';
import {
  CorrectionStatusBadge,
  ERROR_TYPE_LABELS,
  CORRECTION_STATUS_LABELS,
  diffStats,
  fmtDate,
} from './StatusBadges';

interface CorrectionsTabProps {
  stats: AudioDashboardStats;
  corrections: TranscriptCorrectionItem[];
  corrFilter: 'all' | 'pending' | 'approved' | 'rejected';
  onFilterChange: (filter: 'all' | 'pending' | 'approved' | 'rejected') => void;
  onSelectCorrection: (correction: TranscriptCorrectionItem) => void;
}

export function CorrectionsTab({
  stats,
  corrections,
  corrFilter,
  onFilterChange,
  onSelectCorrection,
}: CorrectionsTabProps) {
  const filteredCorrections =
    corrFilter === 'all'
      ? corrections
      : corrections.filter((c) => c.status === corrFilter);

  return (
    <div className="p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-violet-600 dark:text-violet-400 flex items-center gap-2">
          <FileDiff className="h-4 w-4" /> ट्रान्सक्रिप्ट सुधारणा
        </h3>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
            प्रलंबित: <strong>{stats.corrections.pending}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
            मंजूर: <strong>{stats.corrections.approved}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400">
            नाकारले: <strong>{stats.corrections.rejected}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 text-white">
            <Check className="h-3 w-3" /> प्रशिक्षण/मूल्यांकन-पात्र: <strong>{stats.corrections.approved}</strong>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              corrFilter === f
                ? 'bg-violet-600 text-white shadow-md'
                : 'bg-muted/60 dark:bg-muted/20 text-muted-foreground hover:text-foreground'
            }`}
          >
            {f === 'all' ? 'सर्व' : CORRECTION_STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 dark:bg-muted/20 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">अपलोड</th>
              <th className="px-4 py-3">वापरकर्ता</th>
              <th className="px-4 py-3">स्थिती</th>
              <th className="px-4 py-3">आत्मविश्वास</th>
              <th className="px-4 py-3">त्रुटी प्रकार</th>
              <th className="px-4 py-3">बदल</th>
              <th className="px-4 py-3">मॉडेल आवृत्ती</th>
              <th className="px-4 py-3">तारीख</th>
              <th className="px-4 py-3">कृती</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredCorrections.map((c) => {
              const diff = diffStats(c.diffJson);
              const modEntry = c.upload?.moderationQueue?.[0];
              return (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors align-top">
                  <td className="px-4 py-3 max-w-[220px]">
                    {modEntry ? (
                      <Link
                        href={`/admin/moderation?sourceType=${encodeURIComponent(
                          modEntry.sourceType || 'recording'
                        )}`}
                        className="font-medium text-saffron hover:underline truncate block"
                        title="मॉडरेशन कक्षात उघडा"
                      >
                        {c.upload?.originalName || '—'}
                      </Link>
                    ) : (
                      <span className="font-medium truncate block">{c.upload?.originalName || '—'}</span>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      मूळ ASR: {c.originalAsr?.slice(0, 60) ?? ''}
                      {c.originalAsr && c.originalAsr.length > 60 ? '…' : ''}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      सुधारित: {c.correctedText?.slice(0, 60) ?? ''}
                      {c.correctedText && c.correctedText.length > 60 ? '…' : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.upload?.user?.name || c.upload?.user?.email || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <CorrectionStatusBadge status={c.status} />
                    {c.verifier && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {c.status === 'approved' ? 'मंजूर केले:' : 'नाकारले:'}{' '}
                        {c.verifier.name || c.verifier.email}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.confidence != null ? (
                      <span
                        className={`font-semibold ${
                          c.confidence >= 0.8
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : c.confidence >= 0.5
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {(c.confidence * 100).toFixed(0)}%
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {ERROR_TYPE_LABELS[c.errorType] ?? c.errorType ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {diff ? (
                      <>
                        <span className="font-semibold text-violet-600 dark:text-violet-400">
                          {diff.wordsChanged} शब्द
                        </span>
                        <span className="block text-[11px]">{diff.linesCorrected} ओळी</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.modelVersion ? (
                      <span className="font-mono text-xs px-2 py-0.5 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400">
                        {c.modelVersion}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {fmtDate(c.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {c.status === 'pending' ? (
                      <button
                        onClick={() => onSelectCorrection(c)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors"
                      >
                        <Eye className="h-3 w-3" /> पडताळणी
                      </button>
                    ) : c.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3 w-3" /> ट्रेनिंग-पात्र
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredCorrections.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                  {corrections.length === 0
                    ? 'अद्याप कोणत्याही ट्रान्सक्रिप्ट सुधारणा नाहीत — रेकॉर्डिंगवर रचना पुष्टी झाल्यावर तयार होतील.'
                    : 'या फिल्टरमध्ये कोणत्याही सुधारणा नाहीत.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        <ShieldCheck className="h-3 w-3 inline mr-1" />
        मंजूर सुधारणाच (approved) प्रशिक्षण/मूल्यांकन डेटासेटमध्ये जातात — मूळ ASR कधीही बदलला जात नाही.
      </p>
    </div>
  );
}
