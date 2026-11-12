import * as React from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import type { ProcessingJobItem } from '../types';
import { StatusBadge, fmtDate } from './StatusBadges';

interface ProcessingQueueTabProps {
  processingQueue: ProcessingJobItem[];
  retrying: string | null;
  onRetry: (jobId: string) => Promise<void>;
}

export function ProcessingQueueTab({
  processingQueue,
  retrying,
  onRetry,
}: ProcessingQueueTabProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 dark:bg-muted/20 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">प्रकार</th>
            <th className="px-4 py-3">अपलोड</th>
            <th className="px-4 py-3">स्थिती</th>
            <th className="px-4 py-3">प्रयत्न</th>
            <th className="px-4 py-3">त्रुटी</th>
            <th className="px-4 py-3">तारीख</th>
            <th className="px-4 py-3">कृती</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {processingQueue.map((job) => (
            <tr key={job.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    job.kind === 'youtube'
                      ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400'
                  }`}
                >
                  {job.kind === 'youtube' ? 'YouTube' : 'रेकॉर्डिंग'}
                </span>
              </td>
              <td className="px-4 py-3 max-w-[200px] truncate">{job.upload?.originalName || '—'}</td>
              <td className="px-4 py-3">
                <StatusBadge status={job.status} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {job.attempts}/{job.maxAttempts}
              </td>
              <td
                className="px-4 py-3 max-w-[260px] truncate text-red-600 dark:text-red-400"
                title={job.errorMessage ?? ''}
              >
                {job.errorMessage || '—'}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{fmtDate(job.createdAt)}</td>
              <td className="px-4 py-3">
                {job.status === 'failed' && (
                  <button
                    onClick={() => onRetry(job.id)}
                    disabled={retrying === job.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-saffron hover:bg-saffron/90 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {retrying === job.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3 w-3" />
                    )}
                    रीट्राय
                  </button>
                )}
              </td>
            </tr>
          ))}
          {processingQueue.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                प्रोसेसिंग रांग रिकामी आहे.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
