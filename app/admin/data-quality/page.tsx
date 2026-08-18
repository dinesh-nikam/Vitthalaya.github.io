'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  FileWarning,
  ShieldAlert,
  RotateCcw,
  Eye,
} from 'lucide-react';

interface DataQualityItem {
  id: string;
  titleMarathi: string;
  titleTranslit: string;
  type: string;
  source: string | null;
  saintName: string | null;
  qualityClass: 'fragment' | 'noisy';
  qualityScore: number;
  currentText: string;
  originalText: string | null;
  versionReason: string | null;
  versionCreatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DataQualityResponse {
  success: boolean;
  summary: { fragment: number; noisy: number; lyrics: number };
  total: number;
  items: DataQualityItem[];
}

const CLASS_LABELS: Record<string, string> = {
  fragment: 'तुकडा (fragment)',
  noisy: 'गोंगाट (noisy)',
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('mr-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '—';
  }
}

export default function AdminDataQualityPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [data, setData] = React.useState<DataQualityResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<'all' | 'fragment' | 'noisy'>('all');
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/data-quality');
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
        setError(null);
      } else {
        setError(json.error || 'डेटा मिळवता आला नाही.');
      }
    } catch {
      setError('नेटवर्क त्रुटी — पुन्हा प्रयत्न करा.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (sessionStatus === 'authenticated') fetchData();
  }, [sessionStatus, fetchData]);

  /** Unpublish + flag for re-acquisition (never deletes). */
  const handleReacquire = async (item: DataQualityItem) => {
    setBusyId(item.id);
    try {
      const res = await fetch('/api/admin/data-quality/reacquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compositionId: item.id }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setToast(`"${item.titleMarathi.slice(0, 40)}" अप्रकाशित — पुनर्प्राप्तीसाठी चिन्हांकित.`);
        fetchData();
      } else {
        setToast(json.error || 'कृती अयशस्वी.');
      }
    } catch {
      setToast('कृती करताना त्रुटी.');
    } finally {
      setBusyId(null);
      setTimeout(() => setToast(null), 5000);
    }
  };

  // ── Auth gate ──
  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-saffron" />
      </div>
    );
  }
  const role = (session?.user as any)?.role;
  if (sessionStatus === 'unauthenticated' || role !== 'ADMIN') {
    router.replace('/');
    return null;
  }

  const items = data
    ? filter === 'all'
      ? data.items
      : data.items.filter((i) => i.qualityClass === filter)
    : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      <div className="bg-maroon-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">🔍 डेटा गुणवत्ता</h1>
              <p className="text-sand-200 text-sm mt-1">
                Data Quality — कमकुवत लिरिक्स असलेल्या रचना (आधी/नंतर) व पुनर्प्राप्ती
              </p>
            </div>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              रीफ्रेश
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {toast && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
            {toast}
          </div>
        )}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
            <button onClick={fetchData} className="ml-3 underline font-semibold">पुन्हा प्रयत्न करा</button>
          </div>
        )}

        {loading && !data ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-saffron" />
          </div>
        ) : data ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-card rounded-xl shadow-sm p-5">
                <p className="text-2xl font-bold text-maroon-700 dark:text-saffron">{data.total}</p>
                <p className="text-sm text-gray-500 dark:text-muted-foreground mt-1">कमकुवत रचना (एकूण)</p>
              </div>
              <div className="bg-white dark:bg-card rounded-xl shadow-sm p-5">
                <p className="text-2xl font-bold text-orange-600">{data.summary.fragment}</p>
                <p className="text-sm text-gray-500 dark:text-muted-foreground mt-1">तुकडे (fragment)</p>
              </div>
              <div className="bg-white dark:bg-card rounded-xl shadow-sm p-5">
                <p className="text-2xl font-bold text-amber-600">{data.summary.noisy}</p>
                <p className="text-sm text-gray-500 dark:text-muted-foreground mt-1">गोंगाट (noisy)</p>
              </div>
              <div className="bg-white dark:bg-card rounded-xl shadow-sm p-5">
                <p className="text-2xl font-bold text-emerald-600">{data.summary.lyrics}</p>
                <p className="text-sm text-gray-500 dark:text-muted-foreground mt-1">व्यवस्थित (lyrics)</p>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 bg-white dark:bg-card rounded-xl p-1 shadow-sm w-fit">
              {(['all', 'fragment', 'noisy'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    filter === f ? 'bg-saffron text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f === 'all' ? 'सर्व' : CLASS_LABELS[f]}
                </button>
              ))}
            </div>

            {/* Items */}
            {items.length === 0 ? (
              <div className="bg-white dark:bg-card rounded-xl shadow-sm p-10 text-center text-muted-foreground">
                या फिल्टरमध्ये कोणतीही रचना नाही.
              </div>
            ) : (
              <ul className="space-y-4">
                {items.map((item) => (
                  <li key={item.id} className="bg-white dark:bg-card rounded-xl shadow-sm p-5 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-800 dark:text-foreground">{item.titleMarathi}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-muted text-xs font-semibold mr-2">
                            {item.type}
                          </span>
                          {item.saintName && <>{item.saintName} · </>}
                          {item.source || 'स्रोत: —'} · {fmtDate(item.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            item.qualityClass === 'fragment'
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}
                        >
                          {item.qualityClass === 'fragment' ? <FileWarning className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                          {CLASS_LABELS[item.qualityClass]} · {(item.qualityScore * 100).toFixed(0)}%
                        </span>
                        <button
                          onClick={() => handleReacquire(item)}
                          disabled={busyId === item.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {busyId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                          पुन्हा प्राप्त करा
                        </button>
                      </div>
                    </div>

                    <details className="group rounded-xl border border-border">
                      <summary className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold cursor-pointer hover:bg-muted/40 transition-colors">
                        <Eye className="h-4 w-4 text-saffron" />
                        आधी / नंतर लिरिक्स पहा
                        {item.originalText && item.originalText !== item.currentText && (
                          <span className="text-[11px] font-normal text-muted-foreground">
                            · मागील आवृत्ती {fmtDate(item.versionCreatedAt)} ({item.versionReason?.slice(0, 40) ?? 'denoise'})
                          </span>
                        )}
                      </summary>
                      <div className="grid md:grid-cols-2 gap-4 p-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-1.5">आधी (मूळ)</p>
                          <pre className="text-xs whitespace-pre-wrap bg-red-50/50 dark:bg-red-950/20 border border-red-200/40 dark:border-red-900/40 rounded-lg p-3 max-h-64 overflow-y-auto font-marathi leading-relaxed">
                            {item.originalText || item.currentText}
                          </pre>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1.5">नंतर (सध्याचे)</p>
                          <pre className="text-xs whitespace-pre-wrap bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/40 dark:border-emerald-900/40 rounded-lg p-3 max-h-64 overflow-y-auto font-marathi leading-relaxed">
                            {item.currentText}
                          </pre>
                        </div>
                      </div>
                    </details>

                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <ShieldAlert className="h-3 w-3" />
                      'पुन्हा प्राप्त करा' रचना अप्रकाशित करते (सार्वजनिक कॅटलॉगमधून काढते) व ती
                      पुनर्प्राप्तीसाठी चिन्हांकित करते — हटवत नाही. योग्य स्रोतातून पुन्हा आयात करा.
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
