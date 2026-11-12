import * as React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { RightsRecordItem } from '../types';
import { RIGHTS_STATUS_LABELS, fmtDate } from './StatusBadges';

interface RightsRecordsTabProps {
  rightsRecords: RightsRecordItem[];
}

export function RightsRecordsTab({ rightsRecords }: RightsRecordsTabProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 dark:bg-muted/20 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">अपलोड</th>
            <th className="px-4 py-3">वापरकर्ता</th>
            <th className="px-4 py-3">राइट्स</th>
            <th className="px-4 py-3">संमती</th>
            <th className="px-4 py-3">प्रकाशन</th>
            <th className="px-4 py-3">श्रेय</th>
            <th className="px-4 py-3">तारीख</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rightsRecords.map((r) => (
            <tr key={r.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 max-w-[220px] truncate font-medium">
                {r.upload?.originalName || '—'}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {r.user?.name || r.user?.email || '—'}
              </td>
              <td className="px-4 py-3">
                <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
                  {RIGHTS_STATUS_LABELS[r.rightsStatus] ?? r.rightsStatus}
                </span>
              </td>
              <td className="px-4 py-3">{r.consentGranted ? 'होय' : 'नाही'}</td>
              <td className="px-4 py-3">
                {r.publicationPermission ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> होय
                  </span>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" /> नाही
                  </span>
                )}
              </td>
              <td className="px-4 py-3 max-w-[180px] truncate text-muted-foreground">
                {r.attribution || '—'}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.createdAt)}</td>
            </tr>
          ))}
          {rightsRecords.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                अद्याप कोणत्याही राइट्स नोंदी नाहीत.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
