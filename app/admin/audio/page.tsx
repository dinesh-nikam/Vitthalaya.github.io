'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  RefreshCw,
  Mic,
  AudioLines,
  AlertTriangle,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Activity,
  FileDiff,
  Eye,
  Check,
  X,
  BarChart3,
  Database,
  Layers,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AudioDashboardData {
  success: boolean;
  stats: {
    recordings: { total: number; completed: number; transcribing: number; failed: number; needsReview: number };
    jobs: { pending: number; processing: number; completed: number; failed: number };
    lowConfidence: number;
    rights: { total: number; withConsent: number; withPublicationPermission: number; byStatus: Record<string, number> };
    matches: Record<string, number>;
    modelVersions: number;
    corrections: { total: number; pending: number; approved: number; rejected: number };
  };
  recordings: any[];
  processingQueue: any[];
  failedUploads: any[];
  lowConfidence: any[];
  rightsRecords: any[];
  modelVersions: any[];
  corrections: any[];
  pipelineVersions: string[];
  audioQuality: { analyzedCount: number; avgLoudnessMeanDb: number } | null;
  discovery: {
    compositionsBySource: Record<string, number>;
    topSources: { source: string; count: number }[];
    reviewQueue: { total: number; ocr: number };
    variants: { total: number; ocrVariant: number; byReason: { reason: string; count: number }[] };
  };
  lowConfidenceThreshold: number;
}

type Tab = 'recordings' | 'processing' | 'failed' | 'lowconfidence' | 'rights' | 'models' | 'corrections' | 'discovery';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'recordings', label: 'रेकॉर्डिंग रांग', icon: <Mic className="h-4 w-4" /> },
  { id: 'processing', label: 'प्रोसेसिंग रांग', icon: <AudioLines className="h-4 w-4" /> },
  { id: 'failed', label: 'अयशस्वी', icon: <AlertTriangle className="h-4 w-4" /> },
  { id: 'lowconfidence', label: 'कमी आत्मविश्वास', icon: <Activity className="h-4 w-4" /> },
  { id: 'rights', label: 'राइट्स स्थिती', icon: <ShieldCheck className="h-4 w-4" /> },
  { id: 'models', label: 'मॉडेल आवृत्त्या', icon: <Cpu className="h-4 w-4" /> },
  { id: 'corrections', label: 'सुधारणा', icon: <FileDiff className="h-4 w-4" /> },
  { id: 'discovery', label: 'डिस्कव्हरी', icon: <BarChart3 className="h-4 w-4" /> },
];

const PROCESS_STATUS_LABELS: Record<string, string> = {
  completed: 'पूर्ण',
  transcribing: 'ट्रान्सक्राइब होत आहे',
  pending: 'प्रतीक्षेत',
  extracting: 'काढत आहे',
  failed: 'अयशस्वी',
  transcription_failed: 'ट्रान्सक्रिप्शन अयशस्वी',
  needs_audio_processing: 'ऑडिओ प्रक्रिया आवश्यक',
};

const CORRECTION_STATUS_LABELS: Record<string, string> = {
  pending: 'प्रलंबित',
  approved: 'मंजूर',
  rejected: 'नाकारले',
};

const ERROR_TYPE_LABELS: Record<string, string> = {
  vocabulary: 'शब्दसंग्रह',
  homophone: 'होमोफोन',
  transliteration: 'लिप्यंतरण',
  segmentation: 'विभाजन',
  none: '—',
};

function CorrectionStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  };
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${styles[status] ?? 'bg-muted text-muted-foreground'}`}>
      {CORRECTION_STATUS_LABELS[status] ?? status}
    </span>
  );
}

interface WordDiff {
  original: string;
  corrected: string;
}

interface LineAlignment {
  asr: string;
  canonical?: string;
  similarity?: number;
  corrected?: boolean;
  wordDiffs?: WordDiff[];
}

/** Parse the persisted diffJson into structured aligned lines for the review panel. */
function parseDiffLines(diffJson: string | null | undefined): LineAlignment[] {
  if (!diffJson) return [];
  try {
    const parsed = JSON.parse(diffJson);
    if (!Array.isArray(parsed?.alignedLines)) return [];
    return parsed.alignedLines as LineAlignment[];
  } catch {
    return [];
  }
}

/** Split a line into words, highlighting the ones that were changed (for review). */
function LineWords({ line, changed }: { line: string; changed: Set<string> }) {
  const words = line.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((word, i) =>
        changed.has(word) ? (
          <span key={i} className="bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 rounded px-1 line-through">
            {word}
          </span>
        ) : (
          <span key={i}>{word} </span>
        )
      )}
    </>
  );
}

/** Parse the persisted diffJson stats (linesTotal/linesCorrected/wordsChanged). */
function diffStats(diffJson: string | null | undefined): { linesCorrected: number; wordsChanged: number } | null {
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

const RIGHTS_STATUS_LABELS: Record<string, string> = {
  USER_OWNED: 'मालकीची',
  PUBLIC_DOMAIN_COMPOSITION: 'पब्लिक डोमेन',
  USER_PERFORMANCE: 'स्वतःचे सादरीकरण',
  THIRD_PARTY: 'तृतीय-पक्ष',
  UNKNOWN: 'अज्ञात',
};

function StatusBadge({ status }: { status: string }) {
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
    <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${styles[status] ?? 'bg-muted text-muted-foreground'}`}>
      {PROCESS_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function fmtDate(iso: string | Date | undefined | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('mr-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '—';
  }
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminAudioDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [data, setData] = React.useState<AudioDashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<Tab>('recordings');
  const [retrying, setRetrying] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const [corrFilter, setCorrFilter] = React.useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [reviewing, setReviewing] = React.useState<any | null>(null);
  const [verifyBusy, setVerifyBusy] = React.useState(false);
  const [verifyNotes, setVerifyNotes] = React.useState('');
  const [modelsData, setModelsData] = React.useState<any | null>(null);
  const [modelsLoading, setModelsLoading] = React.useState(false);
  const [modelsAction, setModelsAction] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/audio');
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

  const fetchModels = React.useCallback(async () => {
    try {
      setModelsLoading(true);
      const res = await fetch('/api/admin/models');
      const json = await res.json();
      if (res.ok && json.success) {
        setModelsData(json);
      } else {
        setToast(json.error || 'मॉडेल डेटा मिळवता आला नाही.');
      }
    } catch {
      setToast('मॉडेल डेटा मिळवताना नेटवर्क त्रुटी.');
    } finally {
      setModelsLoading(false);
      setTimeout(() => setToast(null), 4000);
    }
  }, []);

  React.useEffect(() => {
    if (sessionStatus === 'authenticated' && activeTab === 'models') fetchModels();
  }, [sessionStatus, activeTab, fetchModels]);

  /** Explicit admin lifecycle action — never automatic. */
  const handleModelLifecycle = async (action: string, modelVersionId?: string) => {
    const key = `${action}:${modelVersionId ?? ''}`;
    setModelsAction(key);
    try {
      const res = await fetch('/api/admin/models/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          modelVersionId,
          modelName: 'candidate-asr',
          modelType: 'asr',
          version: '0',
          provider: 'custom',
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        if (action === 'activate') {
          setToast('मॉडेल सक्रिय — मूल्यांकन गेट उत्तीर्ण झाल्यानंतरच (कधीही आपोआप नाही).');
        } else if (action === 'rollback') {
          setToast('रोलबॅक झाला — मागील सक्रिय मॉडेल पुनर्स्थापित.');
        } else if (action === 'seed') {
          const g = json.golden?.created ?? [];
          const r = json.regression?.created ?? [];
          const gs = json.golden?.skipped ?? [];
          const rs = json.regression?.skipped ?? [];
          setToast(`डेटासेट: ${[...g, ...r].join(', ') || 'कोणतेही नवीन नाही'}${[...gs, ...rs].length ? ' · ' + [...gs, ...rs].join('; ') : ''}`);
        } else {
          setToast('मॉडेल ऑपरेशन पूर्ण.');
        }
        fetchModels();
      } else {
        setToast(json.error || 'ऑपरेशन अयशस्वी.');
      }
    } catch {
      setToast('ऑपरेशन करताना त्रुटी.');
    } finally {
      setModelsAction(null);
      setTimeout(() => setToast(null), 6000);
    }
  };

  /** Run the offline evaluation harness (regression mode = approved corrections). */
  const handleEvaluate = async (modelVersionId: string) => {
    const key = `evaluate:${modelVersionId}`;
    setModelsAction(key);
    try {
      const res = await fetch('/api/admin/models/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelVersionId, mode: 'regression' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const ab = json.ab
          ? ` · A/B vs बेसलाइन: WER ${(json.ab.baselineWer * 100).toFixed(1)}% → ${(json.ab.candidateWer * 100).toFixed(1)}% (${json.ab.werDelta >= 0 ? '+' : ''}${(json.ab.werDelta * 100).toFixed(1)}%)`
          : '';
        setToast(
          `मूल्यांकन: ${json.status} — ${json.aggregate.samplesEvaluated} नमुने, WER ${(json.aggregate.wer * 100).toFixed(1)}%, CER ${(json.aggregate.cer * 100).toFixed(1)}%${ab}`
        );
        fetchModels();
      } else {
        setToast(json.error || 'मूल्यांकन अयशस्वी.');
      }
    } catch {
      setToast('मूल्यांकन करताना त्रुटी.');
    } finally {
      setModelsAction(null);
      setTimeout(() => setToast(null), 6000);
    }
  };

  const handleRetry = async (jobId: string) => {
    setRetrying(jobId);
    try {
      const res = await fetch('/api/admin/audio/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setToast('जॉब पुन्हा रांगेत टाकला — प्रोसेसर लवकरच उचलेल.');
        fetchData();
      } else {
        setToast(json.error || 'रीट्राय अयशस्वी.');
      }
    } catch {
      setToast('रीट्राय करताना त्रुटी.');
    } finally {
      setRetrying(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  /** Approve/reject the correction currently open in the review modal. */
  const handleVerify = async (action: 'approve' | 'reject') => {
    if (!reviewing) return;
    setVerifyBusy(true);
    try {
      const res = await fetch(`/api/admin/audio/corrections/${reviewing.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: verifyNotes.trim() || null }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setToast(
          action === 'approve'
            ? 'सुधारणा मंजूर — आता प्रशिक्षण/मूल्यांकन लूपसाठी पात्र.'
            : 'सुधारणा नाकारली.'
        );
        setReviewing(null);
        setVerifyNotes('');
        fetchData();
      } else {
        setToast(json.error || 'पडताळणी अयशस्वी.');
      }
    } catch {
      setToast('पडताळणी करताना त्रुटी.');
    } finally {
      setVerifyBusy(false);
      setTimeout(() => setToast(null), 4000);
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

  const stats = data?.stats;

  const filteredCorrections = data
    ? corrFilter === 'all'
      ? data.corrections
      : data.corrections.filter((c) => c.status === corrFilter)
    : [];

  const statCards = stats
    ? [
        { label: 'एकूण रेकॉर्डिंग्ज', value: stats.recordings.total, tone: 'text-maroon-700 dark:text-saffron' },
        { label: 'ट्रान्सक्राइब झाले', value: stats.recordings.completed, tone: 'text-emerald-600' },
        { label: 'प्रक्रिया सुरू', value: stats.recordings.transcribing, tone: 'text-amber-600' },
        { label: 'अयशस्वी रेकॉर्डिंग्ज', value: stats.recordings.failed, tone: 'text-red-600' },
        { label: 'पुनरावलोकन प्रतीक्षेत', value: stats.recordings.needsReview, tone: 'text-sky-600' },
        { label: 'जॉब्स प्रलंबित', value: stats.jobs.pending, tone: 'text-sky-600' },
        { label: 'जॉब्स सुरू', value: stats.jobs.processing, tone: 'text-amber-600' },
        { label: 'जॉब्स अयशस्वी', value: stats.jobs.failed, tone: 'text-red-600' },
        { label: 'कमी-आत्मविश्वास ट्रान्सक्रिप्ट', value: stats.lowConfidence, tone: 'text-orange-600' },
        { label: 'राइट्स नोंदी', value: stats.rights.total, tone: 'text-indigo-600' },
        { label: 'प्रकाशन-पात्र', value: stats.rights.withPublicationPermission, tone: 'text-emerald-600' },
        { label: 'मॉडेल आवृत्त्या', value: stats.modelVersions, tone: 'text-purple-600' },
        { label: 'सुधारणा प्रलंबित', value: stats.corrections.pending, tone: 'text-amber-600' },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      <div className="bg-maroon-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">🎙️ ऑडिओ पटल</h1>
              <p className="text-sand-200 text-sm mt-1">Audio Dashboard — रेकॉर्डिंग्ज, प्रोसेसिंग, राइट्स व मॉडेल्स</p>
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
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {statCards.map((card) => (
                <div key={card.label} className="bg-white dark:bg-card rounded-xl shadow-sm p-5">
                  <p className={`text-2xl font-bold ${card.tone}`}>{card.value}</p>
                  <p className="text-sm text-gray-500 dark:text-muted-foreground mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Rights by status strip */}
            <div className="bg-white dark:bg-card rounded-xl shadow-sm p-5">
              <h2 className="font-bold text-maroon-800 dark:text-saffron mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> राइट्स स्थितीचे विभाजन
              </h2>
              <div className="flex flex-wrap gap-3">
                {Object.entries(stats!.rights.byStatus).map(([status, count]) => (
                  <span key={status} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-sm">
                    <span className="font-semibold text-indigo-700 dark:text-indigo-300">{count}</span>
                    <span className="text-indigo-600/80 dark:text-indigo-300/70">
                      {RIGHTS_STATUS_LABELS[status] ?? status}
                    </span>
                  </span>
                ))}
                {Object.keys(stats!.rights.byStatus).length === 0 && (
                  <p className="text-sm text-muted-foreground">अद्याप कोणत्याही राइट्स नोंदी नाहीत.</p>
                )}
              </div>
              {stats!.matches.candidate !== undefined && (
                <p className="text-xs text-muted-foreground mt-3">
                  रचना जुळणी: {stats!.matches.candidate ?? 0} प्रलंबित · {stats!.matches.confirmed ?? 0} पुष्टीकृत ·{' '}
                  {stats!.matches.rejected ?? 0} नाकारलेल्या
                </p>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white dark:bg-card rounded-xl p-1 shadow-sm overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-saffron text-white shadow-md'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Tab content ── */}
            <div className="bg-white dark:bg-card rounded-xl shadow-sm overflow-hidden">
              {activeTab === 'recordings' && (
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
                      {data.recordings.map((rec) => (
                        <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 max-w-[220px] truncate font-medium">{rec.originalName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{rec.user?.name || rec.user?.email || '—'}</td>
                          <td className="px-4 py-3"><StatusBadge status={rec.processingStatus} /></td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {rec.extractionConfidence != null ? `${(rec.extractionConfidence * 100).toFixed(0)}%` : '—'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {rec.rightsRecord ? RIGHTS_STATUS_LABELS[rec.rightsRecord.rightsStatus] ?? rec.rightsRecord.rightsStatus : '—'}
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
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {rec.moderationQueue?.[0] ? (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                rec.moderationQueue[0].status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : rec.moderationQueue[0].status === 'rejected'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                              }`}>
                                {rec.moderationQueue[0].status === 'approved' ? 'मंजूर' : rec.moderationQueue[0].status === 'rejected' ? 'नाकारले' : 'प्रलंबित'}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{fmtDate(rec.createdAt)}</td>
                        </tr>
                      ))}
                      {data.recordings.length === 0 && (
                        <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">अद्याप कोणतीही रेकॉर्डिंग्ज नाहीत.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'processing' && (
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
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.processingQueue.map((job) => (
                        <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              job.kind === 'youtube' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400'
                            }`}>
                              {job.kind === 'youtube' ? 'YouTube' : 'रेकॉर्डिंग'}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[200px] truncate">{job.upload?.originalName || '—'}</td>
                          <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {job.attempts}/{job.maxAttempts}
                          </td>
                          <td className="px-4 py-3 max-w-[260px] truncate text-red-600 dark:text-red-400" title={job.errorMessage ?? ''}>
                            {job.errorMessage || '—'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{fmtDate(job.createdAt)}</td>
                          <td className="px-4 py-3">
                            {job.status === 'failed' && (
                              <button
                                onClick={() => handleRetry(job.id)}
                                disabled={retrying === job.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-saffron hover:bg-saffron/90 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                              >
                                {retrying === job.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                                रीट्राय
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {data.processingQueue.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">प्रोसेसिंग रांग रिकामी आहे.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'failed' && (
                <div className="p-5 space-y-5">
                  <h3 className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> अयशस्वी रेकॉर्डिंग्ज व अपलोड्स
                  </h3>
                  <ul className="divide-y divide-border rounded-xl border border-border">
                    {data.failedUploads.map((u) => (
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
                    {data.failedUploads.length === 0 && (
                      <li className="p-6 text-center text-muted-foreground text-sm">कोणतीही अयशस्वी नोंद नाही.</li>
                    )}
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    जॉब्स आपोआप ३ प्रयत्नांपर्यंत रीट्राय होतात. कायम अयशस्वी जॉब्स 'प्रोसेसिंग रांग' टॅबमधून स्वहस्ते रीट्राय करता येतात.
                  </p>
                </div>
              )}

              {activeTab === 'lowconfidence' && (
                <div className="p-5 space-y-5">
                  <h3 className="text-sm font-bold text-orange-600 dark:text-orange-400 flex items-center gap-2">
                    <Activity className="h-4 w-4" /> आत्मविश्वास &lt; {Math.round(data.lowConfidenceThreshold * 100)}% — पुनरावलोकनासाठी
                  </h3>
                  <ul className="divide-y divide-border rounded-xl border border-border">
                    {data.lowConfidence.map((item) => (
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
                    {data.lowConfidence.length === 0 && (
                      <li className="p-6 text-center text-muted-foreground text-sm">कमी-आत्मविश्वासाचे कोणतेही ट्रान्सक्रिप्ट नाहीत.</li>
                    )}
                  </ul>
                </div>
              )}

              {activeTab === 'rights' && (
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
                      {data.rightsRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 max-w-[220px] truncate font-medium">{r.upload?.originalName || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.user?.name || r.user?.email || '—'}</td>
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
                          <td className="px-4 py-3 max-w-[180px] truncate text-muted-foreground">{r.attribution || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.createdAt)}</td>
                        </tr>
                      ))}
                      {data.rightsRecords.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">अद्याप कोणत्याही राइट्स नोंदी नाहीत.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'models' && (
                <div className="p-5 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-purple-600 dark:text-purple-400 flex items-center gap-2">
                      <Cpu className="h-4 w-4" /> मॉडेल आवृत्ती नोंदणी व मूल्यांकन (Model Registry + Eval)
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                        सक्रिय ASR:{' '}
                        <strong>{modelsData?.activeAsr ? `${modelsData.activeAsr.modelName}@${modelsData.activeAsr.version}` : 'कोणीही नाही'}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400">
                        गेट: WER ≤ {(modelsData?.gateThresholds?.wer ?? 0.3) * 100}% · CER ≤ {(modelsData?.gateThresholds?.cer ?? 0.15) * 100}%
                      </span>
                      <button
                        onClick={fetchModels}
                        disabled={modelsLoading}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground font-semibold transition-colors disabled:opacity-50"
                      >
                        {modelsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        रीफ्रेश
                      </button>
                    </div>
                  </div>

                  {/* Discovery stat cards — always visible on the models tab */}
                  <div className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Database className="h-3.5 w-3.5 text-cyan-500" /> कॅटलॉग डिस्कव्हरी — द्रुत आकडे
                      </h4>
                      <button
                        onClick={() => setActiveTab('discovery')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 text-xs font-semibold hover:bg-cyan-100 transition-colors"
                      >
                        <BarChart3 className="h-3 w-3" /> डिस्कव्हरी टॅब →
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-xl border border-border p-4">
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {data.discovery.compositionsBySource.internetArchive ?? 0}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Internet Archive (OCR) रचना</p>
                      </div>
                      <div className="rounded-xl border border-border p-4">
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {data.discovery.compositionsBySource.wikisource ?? 0}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Wikisource (मराठी) रचना</p>
                      </div>
                      <div className="rounded-xl border border-border p-4">
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                          {data.discovery.reviewQueue.total}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          पुनरावलोकन रांग <span className="text-foreground font-semibold">(OCR {data.discovery.reviewQueue.ocr})</span>
                        </p>
                      </div>
                      <div className="rounded-xl border border-border p-4">
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {data.discovery.variants.total}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          व्हेरिएंट नोंदी <span className="text-foreground font-semibold">(OCR {data.discovery.variants.ocrVariant})</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Registry */}
                  {modelsData && modelsData.models.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      नोंदणी रिकामी आहे — 'गोल्डन डेटासेट बियाणे' आणि 'मॉडेल नोंदणी' वापरून सुरुवात करा.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border rounded-xl border border-border">
                      {(modelsData?.models ?? []).map((m: any) => {
                        const latest = m.latestRun;
                        const canActivate = (m.status === 'candidate' || m.status === 'rolled_back' || m.status === 'retired') && latest?.status === 'passed';
                        const busy = modelsAction === `activate:${m.id}` || modelsAction === `rollback:${m.id}` || modelsAction === `retire:${m.id}` || modelsAction === `evaluate:${m.id}`;
                        return (
                          <li key={m.id} className="p-3 text-sm space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-medium">
                                  {m.modelName} <span className="text-muted-foreground">v{m.version}</span>
                                  <span className="ml-2 font-mono text-[11px] text-muted-foreground">key: {m.versionKey}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {m.modelType} · {m.provider}
                                  {m.notes ? ` · ${m.notes}` : ''}
                                </p>
                                {latest && (
                                  <p className="text-xs mt-1 space-x-2">
                                    <span className={`inline-flex items-center gap-1 font-semibold ${
                                      latest.status === 'passed' ? 'text-emerald-600 dark:text-emerald-400' : latest.status === 'failed' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                                    }`}>
                                      {latest.status === 'passed' ? '✓' : latest.status === 'failed' ? '✗' : '~'} शेवटचे मूल्यांकन: {latest.status}
                                    </span>
                                    <span className="text-muted-foreground">
                                      WER {latest.wer != null ? `${(latest.wer * 100).toFixed(1)}%` : '—'} · CER {latest.cer != null ? `${(latest.cer * 100).toFixed(1)}%` : '—'} · {latest.samplesEvaluated} नमुने
                                    </span>
                                    {latest.datasetName && <span className="text-muted-foreground">· {latest.datasetName}</span>}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                  m.status === 'active'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                    : m.status === 'candidate'
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                      : m.status === 'rolled_back'
                                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
                                        : 'bg-muted text-muted-foreground'
                                }`}>
                                  {m.status === 'active' ? 'सक्रिय' : m.status === 'candidate' ? 'उमेदवार' : m.status === 'rolled_back' ? 'रोलबॅक' : 'निवृत्त'}
                                </span>
                                {m.status !== 'active' && (
                                  <button
                                    onClick={() => handleEvaluate(m.id)}
                                    disabled={busy}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                                  >
                                    {modelsAction === `evaluate:${m.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
                                    मूल्यांकन
                                  </button>
                                )}
                                {canActivate && (
                                  <button
                                    onClick={() => handleModelLifecycle('activate', m.id)}
                                    disabled={busy}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                                  >
                                    {modelsAction === `activate:${m.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                    सक्रिय करा
                                  </button>
                                )}
                                {!canActivate && m.status !== 'active' && latest && latest.status !== 'passed' && (
                                  <span className="text-[11px] text-muted-foreground" title="सक्रियतेसाठी उत्तीर्ण मूल्यांकन आवश्यक">
                                    (गेट उत्तीर्ण नाही)
                                  </span>
                                )}
                                {m.status === 'active' && (
                                  <button
                                    onClick={() => handleModelLifecycle('rollback', m.id)}
                                    disabled={busy}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                                  >
                                    {modelsAction === `rollback:${m.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                                    रोलबॅक
                                  </button>
                                )}
                                {m.status !== 'active' && m.status !== 'retired' && (
                                  <button
                                    onClick={() => handleModelLifecycle('retire', m.id)}
                                    disabled={busy}
                                    className="px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors disabled:opacity-50"
                                  >
                                    निवृत्त
                                  </button>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {/* Golden datasets */}
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        गोल्डन डेटासेट (गोठवलेले — rights-cleared)
                      </h4>
                      <button
                        onClick={() => handleModelLifecycle('seed')}
                        disabled={modelsAction === 'seed:'}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {modelsAction === 'seed:' ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        गोल्डन डेटासेट बियाणे
                      </button>
                    </div>
                    {(modelsData?.datasets ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        अद्याप कोणतेही डेटासेट नाहीत. 'गोल्डन डेटासेट बियाणे' दाबून कॅटलॉगमधून गोठवलेला सेट तयार करा.
                      </p>
                    ) : (
                      <ul className="divide-y divide-border rounded-xl border border-border">
                        {(modelsData?.datasets ?? []).map((d: any) => (
                          <li key={d.id} className="p-3 text-sm space-y-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium">{d.name} <span className="text-muted-foreground">v{d.version}</span></p>
                              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                d.status === 'frozen'
                                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                              }`}>
                                {d.status === 'frozen' ? 'गोठवलेला' : d.status}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {d.datasetType} · {d.sampleCount} नमुने · {d.createdAt ? fmtDate(d.createdAt) : '—'}
                            </p>
                            {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Recent runs */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      अलीकडील मूल्यांकन धावा
                    </h4>
                    {(modelsData?.recentRuns ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">अद्याप कोणतीही मूल्यांकन धाव नाही.</p>
                    ) : (
                      <ul className="divide-y divide-border rounded-xl border border-border">
                        {(modelsData?.recentRuns ?? []).slice(0, 10).map((r: any) => (
                          <li key={r.id} className="p-3 text-sm flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-medium">
                                {r.modelName} <span className="text-muted-foreground">v{r.version}</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {r.datasetName ?? 'regression (approved corrections)'} · {fmtDate(r.createdAt)}
                              </p>
                            </div>
                            <div className="text-xs text-right">
                              <span className={`inline-flex items-center gap-1 font-semibold ${
                                r.status === 'passed' ? 'text-emerald-600 dark:text-emerald-400' : r.status === 'failed' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                              }`}>
                                {r.status}
                              </span>
                              <p className="text-muted-foreground mt-0.5">
                                WER {r.wer != null ? `${(r.wer * 100).toFixed(1)}%` : '—'} · CER {r.cer != null ? `${(r.cer * 100).toFixed(1)}%` : '—'} · {r.samplesEvaluated} नमुने
                                {r.baseline?.wer != null && (
                                  <span className="block text-[11px]">
                                    A/B बेसलाइन: {((r.baseline.wer - r.wer) * 100).toFixed(1)}pp WER
                                  </span>
                                )}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-border p-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        पाइपलाइन आवृत्त्या वापरात
                      </h4>
                      {data.pipelineVersions.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {data.pipelineVersions.map((v) => (
                            <span key={v} className="text-xs font-mono px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400">
                              {v}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          अद्याप कोणतेही एन्हान्स्ड आवृत्ती-अॅसेट नाहीत (ffmpeg उपलब्ध झाल्यावर निर्माण होतील).
                        </p>
                      )}
                    </div>
                    <div className="rounded-xl border border-border p-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        ऑडिओ गुणवत्ता स्नॅपशॉट
                      </h4>
                      {data.audioQuality ? (
                        <div className="space-y-1 text-sm">
                          <p>विश्लेषित अॅसेट्स: <strong>{data.audioQuality.analyzedCount}</strong></p>
                          <p>
                            सरासरी लाऊडनेस: <strong>{data.audioQuality.avgLoudnessMeanDb.toFixed(1)} dB</strong>
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Enhanced-version metadata वरून (ffprobe volumedetect).
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          ऑडिओ विश्लेषण डेटा उपलब्ध नाही (ffprobe अनुपलब्ध किंवा अद्याप एन्हान्समेंट झाले नाही).
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    <ShieldCheck className="h-3 w-3 inline mr-1" />
                    नवीन ASR मॉडेल कधीही आपोआप डिप्लॉय होत नाही. मूल्यांकन गोठवलेल्या गोल्डन डेटासेटवर WER/CER गेट
                    उत्तीर्ण झाल्यानंतरच सक्रियता शक्य — आणि ती देखील केवळ स्पष्ट प्रशासक कृतीने.
                  </p>
                </div>
              )}

              {activeTab === 'corrections' && (
                <div className="p-5 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-violet-600 dark:text-violet-400 flex items-center gap-2">
                      <FileDiff className="h-4 w-4" /> ट्रान्सक्रिप्ट सुधारणा
                    </h3>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                        प्रलंबित: <strong>{stats!.corrections.pending}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                        मंजूर: <strong>{stats!.corrections.approved}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400">
                        नाकारले: <strong>{stats!.corrections.rejected}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 text-white">
                        <Check className="h-3 w-3" /> प्रशिक्षण/मूल्यांकन-पात्र: <strong>{stats!.corrections.approved}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setCorrFilter(f)}
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
                                    href={`/admin/moderation?sourceType=${encodeURIComponent(modEntry.sourceType || 'recording')}`}
                                    className="font-medium text-saffron hover:underline truncate block"
                                    title="मॉडरेशन कक्षात उघडा"
                                  >
                                    {c.upload?.originalName || '—'}
                                  </Link>
                                ) : (
                                  <span className="font-medium truncate block">{c.upload?.originalName || '—'}</span>
                                )}
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  मूळ ASR: {c.originalAsr?.slice(0, 60) ?? ''}{c.originalAsr && c.originalAsr.length > 60 ? '…' : ''}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  सुधारित: {c.correctedText?.slice(0, 60) ?? ''}{c.correctedText && c.correctedText.length > 60 ? '…' : ''}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {c.upload?.user?.name || c.upload?.user?.email || '—'}
                              </td>
                              <td className="px-4 py-3">
                                <CorrectionStatusBadge status={c.status} />
                                {c.verifier && (
                                  <p className="text-[11px] text-muted-foreground mt-1">
                                    {c.status === 'approved' ? 'मंजूर केले:' : 'नाकारले:'} {c.verifier.name || c.verifier.email}
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {c.confidence != null ? (
                                  <span className={`font-semibold ${c.confidence >= 0.8 ? 'text-emerald-600 dark:text-emerald-400' : c.confidence >= 0.5 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {(c.confidence * 100).toFixed(0)}%
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {ERROR_TYPE_LABELS[c.errorType] ?? c.errorType ?? '—'}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {diff ? (
                                  <>
                                    <span className="font-semibold text-violet-600 dark:text-violet-400">{diff.wordsChanged} शब्द</span>
                                    <span className="block text-[11px]">{diff.linesCorrected} ओळी</span>
                                  </>
                                ) : '—'}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {c.modelVersion ? (
                                  <span className="font-mono text-xs px-2 py-0.5 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400">
                                    {c.modelVersion}
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                {fmtDate(c.createdAt)}
                              </td>
                              <td className="px-4 py-3">
                                {c.status === 'pending' ? (
                                  <button
                                    onClick={() => {
                                      setReviewing(c);
                                      setVerifyNotes('');
                                    }}
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
                          <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                            {data.corrections.length === 0
                              ? 'अद्याप कोणत्याही ट्रान्सक्रिप्ट सुधारणा नाहीत — रेकॉर्डिंगवर रचना पुष्टी झाल्यावर तयार होतील.'
                              : 'या फिल्टरमध्ये कोणत्याही सुधारणा नाहीत.'}
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    <ShieldCheck className="h-3 w-3 inline mr-1" />
                    मंजूर सुधारणाच (approved) प्रशिक्षण/मूल्यांकन डेटासेटमध्ये जातात — मूळ ASR कधीही बदलला जात नाही.
                  </p>
                </div>
              )}

              {activeTab === 'discovery' && (
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
                      { label: 'Internet Archive (OCR)', key: 'internetArchive', tone: 'text-red-600 dark:text-red-400' },
                      { label: 'Wikisource (मराठी)', key: 'wikisource', tone: 'text-emerald-600 dark:text-emerald-400' },
                      { label: 'इतर (पूर्व-अस्तित्व/हस्तलिखित)', key: 'other', tone: 'text-muted-foreground' },
                    ].map((f) => (
                      <div key={f.key} className="rounded-xl border border-border p-4">
                        <p className={`text-2xl font-bold ${f.tone}`}>
                          {data.discovery.compositionsBySource[f.key] ?? 0}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{f.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Family share bars */}
                  <div className="space-y-2">
                    {(() => {
                      const fam = data.discovery.compositionsBySource;
                      const total = Object.values(fam).reduce((a, b) => a + b, 0);
                      const meta: Record<string, { label: string; color: string }> = {
                        internetArchive: { label: 'Internet Archive (OCR)', color: 'bg-red-500' },
                        wikisource: { label: 'Wikisource', color: 'bg-emerald-500' },
                        other: { label: 'इतर', color: 'bg-gray-400' },
                      };
                      return Object.entries(fam).map(([key, count]) => {
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
                      });
                    })()}
                  </div>

                  {/* Top raw sources */}
                  <div className="rounded-xl border border-border">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-4 pt-3 pb-1 flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5" /> शीर्ष स्रोत (कच्च्या श्रेय नोंदी)
                    </h4>
                    {data.discovery.topSources.length === 0 ? (
                      <p className="px-4 pb-3 text-sm text-muted-foreground">स्रोत डेटा उपलब्ध नाही.</p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {data.discovery.topSources.map((s) => (
                          <li key={s.source} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                            <span className="truncate text-muted-foreground" title={s.source}>{s.source}</span>
                            <span className="font-semibold text-cyan-700 dark:text-cyan-400 shrink-0">{s.count}</span>
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
                        {data.discovery.reviewQueue.total}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        एकूण प्रकाशित-न-झालेल्या रचना. त्यापैकी{' '}
                        <strong className="text-foreground">{data.discovery.reviewQueue.ocr}</strong> Internet Archive (OCR)
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
                        {data.discovery.variants.total}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        त्यापैकी <strong className="text-foreground">{data.discovery.variants.ocrVariant}</strong> OCR variant
                        — archive.org तुकाराम OCR आवृत्तीच्या Wikisource अभंगांशी जोडलेल्या प्रती.
                        सुधारणा/प्रशिक्षण लूपसाठी OCR-vs-कॅनॉनिकल जोड्या.
                      </p>
                      {data.discovery.variants.byReason.length > 0 && (
                        <ul className="mt-3 space-y-1.5">
                          {data.discovery.variants.byReason.map((r) => (
                            <li key={r.reason} className="flex items-center justify-between gap-3 text-xs">
                              <span className="truncate text-muted-foreground" title={r.reason}>{r.reason}</span>
                              <span className="font-semibold text-purple-600 dark:text-purple-400 shrink-0">{r.count}</span>
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
              )}
            </div>

            <div className="flex justify-end">
              <Link
                href="/admin/moderation"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-saffron hover:underline"
              >
                मॉडरेशन कक्षाकडे → (रेकॉर्डिंग ड्राफ्ट्स पुनरावलोकन)
              </Link>
            </div>
          </>
        ) : null}
      </div>

      {/* ── Correction review modal ── */}
      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !verifyBusy && setReviewing(null)}>
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
                  {reviewing.upload?.originalName || 'रेकॉर्डिंग'} · {reviewing.upload?.user?.name || reviewing.upload?.user?.email || '—'}
                </p>
              </div>
              <button
                onClick={() => !verifyBusy && setReviewing(null)}
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
                  आत्मविश्वास: <strong className="text-foreground">{(reviewing.confidence ?? 0) * 100}%</strong>
                </span>
                <span className="text-muted-foreground">
                  त्रुटी प्रकार: <strong className="text-foreground">{ERROR_TYPE_LABELS[reviewing.errorType] ?? reviewing.errorType ?? '—'}</strong>
                </span>
                <span className="text-muted-foreground">
                  मॉडेल आवृत्ती: <strong className="font-mono text-foreground">{reviewing.modelVersion || '—'}</strong>
                </span>
              </div>

              {/* Canonical reference */}
              {reviewing.canonicalText && (
                <div className="rounded-xl border border-border p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">कॅनॉनिकल संदर्भ (पुष्टी रचना)</h4>
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
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 mr-2">मूळ</span>
                            <LineWords line={line.asr} changed={hasChanges ? changedOriginals : new Set()} />
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">(मूळ ASR मध्ये ओळ नाही — कॅनॉनिकलमधून नवीन)</p>
                        )}
                        {line.canonical ? (
                          <p className="text-sm text-emerald-700 dark:text-emerald-400">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mr-2">सुधारित</span>
                            <LineWords line={line.canonical} changed={hasChanges ? changedCorrecteds : new Set()} />
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">(कॅनॉनिकलमध्ये समतुल्य नाही — सुधारणा झाली नाही)</p>
                        )}
                        {hasChanges && (
                          <p className="text-[11px] text-muted-foreground">
                            समानता: {((line.similarity ?? 0) * 100).toFixed(0)}% · बदललेले शब्द: {line.wordDiffs!.length}
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
                      onChange={(e) => setVerifyNotes(e.target.value)}
                      rows={2}
                      disabled={verifyBusy}
                      className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-saffron"
                      placeholder="मंजूर/नाकारण्याचे कारण…"
                    />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleVerify('approve')}
                      disabled={verifyBusy}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {verifyBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      मंजूर करा — ट्रेनिंग लूपसाठी
                    </button>
                    <button
                      onClick={() => handleVerify('reject')}
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
                    <strong className="text-foreground">{reviewing.verifier?.name || reviewing.verifier?.email || '—'}</strong>
                  </p>
                  {reviewing.notes && <p className="mt-1">टिप्पणी: {reviewing.notes}</p>}
                  {reviewing.status === 'approved' && (
                    <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                      <Check className="h-3 w-3 inline mr-1" />
                      मॉडेल आवृत्ती <strong>{reviewing.modelVersion || '—'}</strong> सह मंजूर — प्रशिक्षण/मूल्यांकन डेटासेटमध्ये पात्र.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
