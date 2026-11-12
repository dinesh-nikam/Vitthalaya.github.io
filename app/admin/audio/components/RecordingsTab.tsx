import * as React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { AudioRecordingItem } from '../types';
import { StatusBadge, RIGHTS_STATUS_LABELS, fmtDate } from './StatusBadges';

interface RecordingsTabProps {
  recordings: AudioRecordingItem[];
}

export function RecordingsTab({ recordings }: RecordingsTabProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 dark:bg-muted/20 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">रेकॉर्डिंग</th>
            <th className="px-4 py-3">वापरकर्ता</th>
            <th className="px-4 py-3">स्थिती</th>
            <th className="px-4 py-3">आत्मविश्वास</th>
            <th className="px-4 py-3">राइट्स</th>
            <th className="px-4 py-3">प्रकाशन</th>
            <th className="px-4 py-3">मॉडरेशन</th>
            <th className="px-4 py-3">तारीख</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {recordings.map((rec) => (
            <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 max-w-[220px] truncate font-medium">{rec.originalName}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {rec.user?.name || rec.user?.email || '—'}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={rec.processingStatus} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {rec.extractionConfidence != null ? `${(rec.extractionConfidence * 100).toFixed(0)}%` : '—'}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {rec.rightsRecord
                  ? RIGHTS_STATUS_LABELS[rec.rightsRecord.rightsStatus] ?? rec.rightsRecord.rightsStatus
                  : '—'}
              </td>
              <td className="px-4 py-3">
                {rec.rightsRecord ? (
                  rec.rightsRecord.publicationPermission ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> होय
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5" /> नाही
                    </span>
                  )
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-3">
                {rec.moderationQueue?.[0] ? (
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      rec.moderationQueue[0].status === 'approved'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : rec.moderationQueue[0].status === 'rejected'
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    }`}
                  >
                    {rec.moderationQueue[0].status === 'approved'
                      ? 'मंजूर'
                      : rec.moderationQueue[0].status === 'rejected'
                        ? 'नाकारले'
                        : 'प्रलंबित'}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{fmtDate(rec.createdAt)}</td>
            </tr>
          ))}
          {recordings.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                अद्याप कोणतीही रेकॉर्डिंग्ज नाहीत.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
