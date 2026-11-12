import * as React from 'react';
import Link from 'next/link';
import { BarChart3, Database, AlertTriangle, Layers, ShieldCheck } from 'lucide-react';
import type { AudioDashboardData } from '../types';

interface DiscoveryMetricsTabProps {
  discovery: AudioDashboardData['discovery'];
}

export function DiscoveryMetricsTab({ discovery }: DiscoveryMetricsTabProps) {
  const fam = discovery.compositionsBySource;
  const total = Object.values(fam).reduce((a, b) => a + b, 0);
  const meta: Record<string, { label: string; color: string }> = {
    internetArchive: { label: 'Internet Archive (OCR)', color: 'bg-red-500' },
    wikisource: { label: 'Wikisource', color: 'bg-emerald-500' },
    other: { label: 'इतर', color: 'bg-gray-400' },
  };

  return (
    <div className="p-5 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> डिस्कव्हरी विश्लेषण — कॅटलॉग स्रोत
        </h3>
        <Link
          href="/admin/discovery"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 text-xs font-semibold hover:bg-cyan-100 transition-colors"
        >
          डिस्कव्हरी पटल → (जॉब्स, स्रोत आरोग्य)
        </Link>
      </div>

      {/* Compositions per source family */}
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          {
            label: 'Internet Archive (OCR)',
            key: 'internetArchive',
            tone: 'text-red-600 dark:text-red-400',
          },
          {
            label: 'Wikisource (मराठी)',
            key: 'wikisource',
            tone: 'text-emerald-600 dark:text-emerald-400',
          },
          {
            label: 'इतर (पूर्व-अस्तित्व/हस्तलिखित)',
            key: 'other',
            tone: 'text-muted-foreground',
          },
        ].map((f) => (
          <div key={f.key} className="rounded-xl border border-border p-4">
            <p className={`text-2xl font-bold ${f.tone}`}>{discovery.compositionsBySource[f.key] ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{f.label}</p>
          </div>
        ))}
      </div>

      {/* Family share bars */}
      <div className="space-y-2">
        {Object.entries(fam).map(([key, count]) => {
          const pct = total > 0 ? (count / total) * 100 : 0;
          const m = meta[key] ?? { label: key, color: 'bg-gray-400' };
          return (
            <div key={key} className="flex items-center gap-3 text-xs">
              <span className="w-36 shrink-0 text-muted-foreground">{m.label}</span>
              <div className="flex-1 h-2.5 rounded-full bg-muted/50 overflow-hidden">
                <div className={`h-full rounded-full ${m.color}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="w-28 shrink-0 text-right text-muted-foreground">
                {pct.toFixed(1)}% · {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Top raw sources */}
      <div className="rounded-xl border border-border">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-4 pt-3 pb-1 flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5" /> शीर्ष स्रोत (कच्च्या श्रेय नोंदी)
        </h4>
        {discovery.topSources.length === 0 ? (
          <p className="px-4 pb-3 text-sm text-muted-foreground">स्रोत डेटा उपलब्ध नाही.</p>
        ) : (
          <ul className="divide-y divide-border">
            {discovery.topSources.map((s) => (
              <li key={s.source} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <span className="truncate text-muted-foreground" title={s.source}>
                  {s.source}
                </span>
                <span className="font-semibold text-cyan-700 dark:text-cyan-400 shrink-0">
                  {s.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* OCR review queue + variant records */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> पुनरावलोकन रांग (OCR)
          </h4>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {discovery.reviewQueue.total}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            एकूण प्रकाशित-न-झालेल्या रचना. त्यापैकी{' '}
            <strong className="text-foreground">{discovery.reviewQueue.ocr}</strong> Internet Archive (OCR)
            — दूषित/अपूर्ण मजकूर जो पुनरावलोकनाशिवाय प्रकाशित होत नाही.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Link
              href="/admin/moderation"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors"
            >
              मॉडरेशन कक्ष →
            </Link>
            <Link
              href="/admin/data-quality"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors"
            >
              डेटा क्वालिटी →
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-border p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-purple-500" /> व्हेरिएंट नोंदी (कॅनॉनिकल)
          </h4>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {discovery.variants.total}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            त्यापैकी <strong className="text-foreground">{discovery.variants.ocrVariant}</strong> OCR variant
            — archive.org तुकाराम OCR आवृत्तीच्या Wikisource अभंगांशी जोडलेल्या प्रती.
            सुधारणा/प्रशिक्षण लूपसाठी OCR-vs-कॅनॉनिकल जोड्या.
          </p>
          {discovery.variants.byReason.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {discovery.variants.byReason.map((r) => (
                <li key={r.reason} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-muted-foreground" title={r.reason}>
                    {r.reason}
                  </span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400 shrink-0">
                    {r.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        <ShieldCheck className="h-3 w-3 inline mr-1" />
        व्हेरिएंट नोंदी मूळ कॅनॉनिकल मजकूर कधीही बदलत नाहीत — त्या केवळ संलग्न प्रती आहेत
        (provenance साठी) आणि नेहमी निर्दिष्ट स्त्रोत श्रेयासह.
      </p>
    </div>
  );
}
