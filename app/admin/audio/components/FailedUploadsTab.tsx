import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { FailedUploadItem } from '../types';
import { StatusBadge, fmtDate } from './StatusBadges';

interface FailedUploadsTabProps {
  failedUploads: FailedUploadItem[];
}

export function FailedUploadsTab({ failedUploads }: FailedUploadsTabProps) {
  return (
    <div className="p-5 space-y-5">
      <h3 className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" /> अयशस्वी रेकॉर्डिंग्ज व अपलोड्स
      </h3>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {failedUploads.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3 p-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium truncate">{u.originalName}</p>
              <p className="text-xs text-muted-foreground">
                {u.user?.name || u.user?.email || '—'} · {fmtDate(u.createdAt)} · प्रकार: {u.format}
              </p>
            </div>
            <StatusBadge status={u.processingStatus} />
          </li>
        ))}
        {failedUploads.length === 0 && (
          <li className="p-6 text-center text-muted-foreground text-sm">
            कोणतीही अयशस्वी नोंद नाही.
          </li>
        )}
      </ul>
      <p className="text-xs text-muted-foreground">
        जॉब्स आपोआप ३ प्रयत्नांपर्यंत रीट्राय होतात. कायम अयशस्वी जॉब्स 'प्रोसेसिंग रांग' टॅबमधून
        स्वहस्ते रीट्राय करता येतात.
      </p>
    </div>
  );
}
