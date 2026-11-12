import * as React from 'react';
import { Activity } from 'lucide-react';
import type { LowConfidenceItem } from '../types';
import { fmtDate } from './StatusBadges';

interface LowConfidenceTabProps {
  lowConfidence: LowConfidenceItem[];
  lowConfidenceThreshold: number;
}

export function LowConfidenceTab({
  lowConfidence,
  lowConfidenceThreshold,
}: LowConfidenceTabProps) {
  return (
    <div className="p-5 space-y-5">
      <h3 className="text-sm font-bold text-orange-600 dark:text-orange-400 flex items-center gap-2">
        <Activity className="h-4 w-4" /> आत्मविश्वास &lt; {Math.round(lowConfidenceThreshold * 100)}% —
        पुनरावलोकनासाठी
      </h3>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {lowConfidence.map((item) => (
          <li key={item.id} className="p-3 text-sm space-y-1">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium truncate">{item.originalName}</p>
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400 flex-shrink-0">
                {((item.extractionConfidence ?? 0) * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {item.extractedText?.slice(0, 200) ?? '(मजकूर नाही)'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {item.user?.name || item.user?.email || '—'} · {fmtDate(item.createdAt)}
            </p>
          </li>
        ))}
        {lowConfidence.length === 0 && (
          <li className="p-6 text-center text-muted-foreground text-sm">
            कमी-आत्मविश्वासाचे कोणतेही ट्रान्सक्रिप्ट नाहीत.
          </li>
        )}
      </ul>
    </div>
  );
}
