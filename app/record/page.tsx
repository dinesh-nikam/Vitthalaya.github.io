'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { AudioRecorder } from '@/components/audio-recorder';
import {
  RIGHTS_STATUSES,
  RIGHTS_STATUS_LABELS,
  type RightsStatus,
} from '@/src/lib/rights';
import {
  Mic,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Clock,
  ListMusic,
  Upload,
  Save,
  PenLine,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'uploading' | 'transcribing' | 'completed' | 'failed';

interface UploadResponse {
  success: boolean;
  uploadId: string;
  needsTranscription?: boolean;
  message?: string;
  rights?: { rightsStatus: string; canPublish: boolean; reasons?: string[] } | null;
}

interface WordDiffDto {
  original: string;
  corrected: string;
}

interface LineAlignmentDto {
  asr: string;
  canonical: string;
  similarity: number;
  corrected: boolean;
  wordDiffs: WordDiffDto[];
}

interface DiffJsonDto {
  version: number;
  alignedLines: LineAlignmentDto[];
  stats: { linesTotal: number; linesCorrected: number; wordsChanged: number };
}

interface CorrectionDto {
  id: string;
  originalAsr: string;
  correctedText: string;
  canonicalText: string | null;
  confidence: number | null;
  errorType: string | null;
  status: string;
  createdAt: string;
  diffJson: DiffJsonDto | null;
}

interface StatusResponse {
  uploadId: string;
  originalName: string;
  processingStatus: string;
  extractedText: string | null;
  extractionConfidence: number | null;
  audioUrl: string | null;
  job: { status: string; attempts: number; maxAttempts: number; errorMessage: string | null } | null;
  moderation: { queueId: string; status: string; draftTitle: string } | null;
  rights: { rightsStatus: string; canPublish: boolean } | null;
  enhancement: {
    pipelineVersion: string;
    profileId: string;
    applied: boolean;
    skipped: string[];
  } | null;
  matches: MatchItem[];
  correction: CorrectionDto | null;
}

interface RecordingListItem {
  id: string;
  originalName: string;
  format: string;
  processingStatus: string;
  transcriptPreview: string | null;
  extractionConfidence: number | null;
  createdAt: string;
}

interface MatchItem {
  compositionId: string;
  title: string;
  titleMarathi: string;
  slug: string;
  type: string;
  saintName: string | null;
  saintTranslit: string | null;
  score: number;
  method: string;
  status: 'candidate' | 'confirmed' | 'rejected';
  userConfirmed: boolean;
  matchedText: string | null;
  meetsThreshold: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  transcribing: 'ट्रान्सक्रिप्शन सुरू आहे...',
  completed: 'ट्रान्सक्रिप्शन पूर्ण',
  transcription_failed: 'ट्रान्सक्रिप्शन अयशस्वी',
  failed: 'प्रक्रिया अयशस्वी',
  pending: 'प्रतीक्षेत',
};

/** Render a line with word-level change highlighting (red strike = removed, green = added). */
function LineWords({
  line,
  changed,
  tone,
}: {
  line: string;
  changed: Set<string>;
  tone: 'asr' | 'corrected';
}) {
  const words = line.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((word, i) =>
        changed.has(word) ? (
          <span
            key={i}
            className={
              tone === 'asr'
                ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 rounded px-1 line-through'
                : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 rounded px-1'
            }
          >
            {word}
          </span>
        ) : (
          <span key={i}>{word} </span>
        )
      )}
    </>
  );
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('mr-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RecordPage() {
  const { data: session, status: authStatus } = useSession();

  // Recorder state
  const [recordedBlob, setRecordedBlob] = React.useState<Blob | null>(null);

  // Form state
  const [title, setTitle] = React.useState('');
  const [rightsStatus, setRightsStatus] = React.useState<RightsStatus>('PUBLIC_DOMAIN_COMPOSITION');
  const [attribution, setAttribution] = React.useState('');
  const [consentGranted, setConsentGranted] = React.useState(false);
  const [publicationPermission, setPublicationPermission] = React.useState(false);

  // Processing state (honest — driven by the real API, never simulated)
  const [phase, setPhase] = React.useState<Phase>('idle');
  const [uploadId, setUploadId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<StatusResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [rightsDecision, setRightsDecision] = React.useState<UploadResponse['rights']>(null);
  const [matchBusy, setMatchBusy] = React.useState<string | null>(null);

  // Manual transcript correction
  const [manualText, setManualText] = React.useState('');
  const [savingCorrection, setSavingCorrection] = React.useState(false);
  const [correctionMsg, setCorrectionMsg] = React.useState<string | null>(null);

  // My Recordings
  const [recordings, setRecordings] = React.useState<RecordingListItem[]>([]);
  const [recordingsLoading, setRecordingsLoading] = React.useState(false);

  const canSubmit =
    !!recordedBlob && consentGranted;

  // ── My Recordings ──
  const loadRecordings = React.useCallback(async () => {
    setRecordingsLoading(true);
    try {
      const res = await fetch('/api/acquire/uploads');
      if (res.ok) {
        const data = await res.json();
        setRecordings(data.uploads ?? []);
      }
    } catch {
      // Non-fatal — the list is supplementary
    } finally {
      setRecordingsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (authStatus === 'authenticated') {
      loadRecordings();
    }
  }, [authStatus, loadRecordings]);

  // ── Honest status polling while transcribing ──
  React.useEffect(() => {
    if (phase !== 'transcribing' || !uploadId) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/acquire/upload/${uploadId}`);
        if (!res.ok) throw new Error('स्थिती मिळवता आली नाही.');
        const data: StatusResponse = await res.json();
        if (cancelled) return;
        setStatus(data);

        if (data.processingStatus === 'completed') {
          setPhase('completed');
          loadRecordings();
        } else if (
          data.processingStatus === 'transcription_failed' ||
          data.processingStatus === 'failed'
        ) {
          setPhase('failed');
          setError(
            data.job?.errorMessage ??
              'रेकॉर्डिंगमधून भाषण ट्रान्सक्राइब करता आले नाही. कृपया पुन्हा रेकॉर्ड करा किंवा दुसरी आवृत्ती अपलोड करा.'
          );
        }
      } catch {
        // Transient network error — keep polling
      }
    };

    tick();
    const interval = setInterval(tick, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [phase, uploadId, loadRecordings]);

  // ── Submit ──
  const handleSubmit = async () => {
    if (!recordedBlob) return;

    setPhase('uploading');
    setError(null);
    setStatus(null);
    setRightsDecision(null);

    try {
      const formData = new FormData();
      formData.append('file', recordedBlob, `recording-${Date.now()}.webm`);
      formData.append('isRecording', 'true');
      if (title.trim()) formData.append('title', title.trim());
      formData.append('rightsStatus', rightsStatus);
      formData.append('consentGranted', String(consentGranted));
      formData.append('publicationPermission', String(publicationPermission));
      if (attribution.trim()) formData.append('attribution', attribution.trim());

      const res = await fetch('/api/acquire/upload', { method: 'POST', body: formData });
      const data: UploadResponse = await res.json();

      if (!res.ok || !data.uploadId) {
        throw new Error((data as any).error || 'रेकॉर्डिंग अपलोड करताना त्रुटी आली.');
      }

      setUploadId(data.uploadId);
      setRightsDecision(data.rights ?? null);

      if (data.needsTranscription) {
        setPhase('transcribing');
      } else {
        setPhase('completed');
        loadRecordings();
      }
    } catch (err: any) {
      setPhase('failed');
      setError(err?.message || 'रेकॉर्डिंग अपलोड करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
    }
  };

  const handleMatchAction = async (compositionId: string, action: 'confirm' | 'reject') => {
    if (!uploadId) return;
    setMatchBusy(compositionId);
    try {
      const res = await fetch('/api/acquire/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, compositionId, action }),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                matches: data.matches,
              }
            : prev
        );
        // A confirm generates a fresh correction with a full diff — re-fetch
        // the status so the corrected-transcript panel shows the real diffJson.
        if (action === 'confirm') {
          const statusRes = await fetch(`/api/acquire/upload/${uploadId}`);
          if (statusRes.ok) {
            const statusData: StatusResponse = await statusRes.json();
            setStatus(statusData);
          }
        }
      }
    } catch {
      // Keep the UI stable on transient failures
    } finally {
      setMatchBusy(null);
    }
  };

  // Seed the manual editor whenever a correction arrives or changes
  React.useEffect(() => {
    if (status?.correction) {
      setManualText(status.correction.correctedText);
      setCorrectionMsg(null);
    }
  }, [status?.correction?.id, status?.correction?.correctedText]);

  // ── Manual correction resubmit ──
  const handleResubmitCorrection = async () => {
    if (!uploadId) return;
    if (manualText.trim().length === 0) {
      setCorrectionMsg('दुरुस्त केलेला मजकूर रिकामा असू शकत नाही.');
      return;
    }
    setSavingCorrection(true);
    setCorrectionMsg(null);
    try {
      const res = await fetch(`/api/acquire/upload/${uploadId}/correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correctedText: manualText }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'दुरुस्ती जतन करता आली नाही.');
      }
      if (data.correction) {
        setStatus((prev) => (prev ? { ...prev, correction: data.correction } : prev));
      }
      setCorrectionMsg(
        data.changed
          ? `दुरुस्ती जतन झाली — ${data.wordsChanged} शब्द बदलले, आत्मविश्वास ${((data.confidence ?? 0) * 100).toFixed(0)}%. पडताळणी प्रतीक्षेत आहे.`
          : 'दुरुस्ती जतन झाली — मजकूर अपरिवर्तित आहे. पडताळणी प्रतीक्षेत आहे.'
      );
    } catch (err: any) {
      setCorrectionMsg(err?.message || 'दुरुस्ती जतन करताना त्रुटी आली.');
    } finally {
      setSavingCorrection(false);
    }
  };

  const handleReset = () => {
    setRecordedBlob(null);
    setUploadId(null);
    setStatus(null);
    setError(null);
    setPhase('idle');
    setRightsDecision(null);
    setTitle('');
    setAttribution('');
    setConsentGranted(false);
    setPublicationPermission(false);
  };

  // ── Auth states ──
  if (authStatus === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-saffron" />
      </div>
    );
  }

  if (authStatus === 'unauthenticated' || !session) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
        <div className="bg-card border-2 border-saffron/20 p-10 rounded-2xl shadow-xl space-y-6">
          <div className="w-20 h-20 bg-saffron/10 text-saffron rounded-full flex items-center justify-center mx-auto">
            <Mic className="w-10 h-10" />
          </div>
          <h1 className="font-marathiHeading text-2xl sm:text-3xl font-bold text-maroon dark:text-saffron">
            रेकॉर्ड करा आणि शोधा — लॉगिन आवश्यक
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            अभंग, भजन किंवा आरती रेकॉर्ड करून विठ्ठलयाच्या सांस्कृतिक संग्रहात योगदान द्या.
            रेकॉर्डिंग खाजगी असते — प्रकाशनासाठी तुमची स्पष्ट परवानगी आवश्यक असते.
          </p>
          <div className="pt-4">
            <Link
              href={`/auth/signin?callbackUrl=${encodeURIComponent('/record')}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-saffron hover:bg-saffron/90 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              <span>लॉगिन करा आणि रेकॉर्ड करा</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Main UI ──
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <nav className="mb-6" aria-label="ब्रेडक्रंब">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li><Link href="/" className="hover:text-saffron">मुख्यपृष्ठ</Link></li>
          <li aria-hidden="true">›</li>
          <li className="text-foreground">रेकॉर्ड करा आणि शोधा</li>
        </ol>
      </nav>

      <header className="mb-8 space-y-2">
        <h1 className="text-3xl sm:text-4xl font-marathiHeading text-maroon dark:text-saffron font-bold">
          रेकॉर्ड करा आणि शोधा
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
          अभंग, भजन, आरती किंवा कीर्तन रेकॉर्ड करा. आमची प्रणाली आवाज स्वच्छ करते, लिरिक्स
          ट्रान्सक्राइब करते आणि ज्ञात रचनेशी जुळवण्याचा प्रयत्न करते — प्रत्येक टप्प्यावर
          आत्मविश्वास मोजला जातो आणि काहीही पुनरावलोकनाशिवाय प्रकाशित होत नाही.
        </p>
      </header>

      {/* ── Active recording workflow ── */}
      <div className="space-y-6">
        <div className="bg-card border border-saffron/10 rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-saffron" />
            <h2 className="font-marathiHeading text-lg font-bold text-maroon dark:text-saffron">
              रचना रेकॉर्ड करा
            </h2>
          </div>

          <AudioRecorder
            disabled={phase === 'uploading' || phase === 'transcribing'}
            onRecordingComplete={(blob) => setRecordedBlob(blob)}
            onDiscard={() => setRecordedBlob(null)}
          />

          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="record-title" className="text-sm font-semibold text-maroon dark:text-saffron">
              शीर्षक (Title) — ऐच्छिक
            </label>
            <input
              id="record-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="उदा. ज्ञानदेवांचा अभंग — कृपया शीर्षक माहीत असल्यास लिहा"
              className="w-full px-4 py-2 border border-saffron/20 focus:border-saffron focus:ring-2 focus:ring-saffron/20 bg-background rounded-lg text-sm outline-none transition-all"
            />
          </div>

          {/* Rights declaration */}
          <div className="border-t border-saffron/10 pt-5 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-saffron" />
              <h3 className="font-semibold text-foreground text-sm">
                राइट्स व संमती (आवश्यक)
              </h3>
            </div>

            <div className="space-y-2">
              <label htmlFor="record-rights" className="text-sm font-medium text-muted-foreground block">
                या रेकॉर्डिंगची राइट्स स्थिती
              </label>
              <select
                id="record-rights"
                value={rightsStatus}
                onChange={(e) => setRightsStatus(e.target.value as RightsStatus)}
                className="w-full px-4 py-2 border border-saffron/20 focus:border-saffron focus:ring-2 focus:ring-saffron/20 bg-background rounded-lg text-sm outline-none transition-all"
              >
                {RIGHTS_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {RIGHTS_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="record-attribution" className="text-sm font-medium text-muted-foreground block">
                श्रेय / माहिती (Attribution) — ऐच्छिक
              </label>
              <input
                id="record-attribution"
                type="text"
                value={attribution}
                onChange={(e) => setAttribution(e.target.value)}
                placeholder="उदा. संतांचे नाव, स्थान, गायनाची तारीख"
                className="w-full px-4 py-2 border border-saffron/20 focus:border-saffron focus:ring-2 focus:ring-saffron/20 bg-background rounded-lg text-sm outline-none transition-all"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-saffron/15 p-3 hover:border-saffron/30 transition-colors">
              <input
                type="checkbox"
                checked={consentGranted}
                onChange={(e) => setConsentGranted(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-saffron"
              />
              <span className="text-sm text-muted-foreground leading-relaxed">
                मी या रेकॉर्डिंगवर प्रक्रिया करण्यास (आवाज विश्लेषण, ट्रान्सक्रिप्शन) स्पष्ट संमती देतो/देते.
                रेकॉर्डिंग खाजगी राहते आणि प्रशिक्षणासाठी वापरली जाणार नाही.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-saffron/15 p-3 hover:border-saffron/30 transition-colors">
              <input
                type="checkbox"
                checked={publicationPermission}
                onChange={(e) => setPublicationPermission(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-saffron"
              />
              <span className="text-sm text-muted-foreground leading-relaxed">
                मला ही रेकॉर्डिंग पुनरावलोकनासाठी पाठवायची आहे (ऐच्छिक). परवानगी न दिल्यास
                रेकॉर्डिंग फक्त माझ्या लायब्ररीत खाजगी राहील.
              </span>
            </label>

            {recordedBlob && consentGranted && !publicationPermission && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                प्रकाशन परवानगीशिवाय रेकॉर्डिंग खाजगी राहील — फक्त तुम्हीच ती पाहू शकाल.
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3 flex gap-2 items-start text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Submit / retry */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {phase === 'failed' || phase === 'completed' ? (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-saffron hover:bg-saffron/90 text-white font-semibold rounded-lg text-sm transition-colors shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <span>नवीन रेकॉर्डिंग करा</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || phase === 'uploading' || phase === 'transcribing'}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-saffron hover:bg-saffron/90 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {phase === 'uploading' || phase === 'transcribing' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{phase === 'uploading' ? 'अपलोड होत आहे...' : 'ट्रान्सक्रिप्शन सुरू आहे...'}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>रेकॉर्डिंग अपलोड करा</span>
                  </>
                )}
              </button>
            )}

            {recordedBlob && !consentGranted && (
              <p className="text-xs text-muted-foreground">
                अपलोड करण्यासाठी संमती चेकबॉक्स निवडा.
              </p>
            )}
          </div>

          {/* Honest status timeline */}
          {(phase === 'transcribing' || phase === 'completed' || phase === 'failed') && (
            <div className="bg-saffron/5 border border-saffron/20 rounded-xl p-5 space-y-3">
              <p className="text-sm font-bold text-maroon dark:text-saffron flex items-center gap-2">
                <Loader2 className={`w-4 h-4 ${phase === 'transcribing' ? 'animate-spin' : ''}`} />
                प्रक्रिया स्थिती
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>रेकॉर्डिंग जतन केली (मूळ आवाज कधीही बदलला जात नाही)</span>
                </li>
                <li className="flex items-center gap-2">
                  {phase === 'transcribing' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-saffron" />
                      <span className="text-saffron font-medium">ट्रान्सक्रिप्शन सुरू आहे — हे काही मिनिटे घेऊ शकते...</span>
                    </>
                  ) : phase === 'completed' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>ट्रान्सक्रिप्शन पूर्ण</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-red-500 font-medium">ट्रान्सक्रिप्शन अयशस्वी</span>
                    </>
                  )}
                </li>
                {phase === 'completed' && (
                  <>
                    <li className="flex items-center gap-2">
                      {status?.enhancement?.applied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>
                            ऑडिओ सुधारणा लागू ({status.enhancement.profileId}) — मूळ रेकॉर्डिंग
                            अपरिवर्तित जतन आहे
                          </span>
                        </>
                      ) : status?.enhancement ? (
                        <>
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                          <span className="text-amber-600 dark:text-amber-400">
                            ऑडिओ सुधारणा उपलब्ध नाही (
                            {status.enhancement.skipped?.[0]?.replace(/\..*$/, '') ?? 'टूलिंग अनुपलब्ध'}
                            ) — मूळ आवाजावरच ट्रान्सक्रिप्शन केले
                          </span>
                        </>
                      ) : (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-saffron" />
                          <span>ऑडिओ प्रक्रिया...</span>
                        </>
                      )}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>
                        {status?.moderation
                          ? 'पुनरावलोकनासाठी पाठवले (ड्राफ्ट म्हणून — मंजुरीशिवाय प्रकाशित होत नाही)'
                          : 'ट्रान्सक्रिप्शन तयार — मंजुरीसाठी प्रतीक्षेत'}
                      </span>
                    </li>
                    {rightsDecision && (
                      <li className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-saffron" />
                        <span>
                          राइट्स: {rightsDecision.rightsStatus}
                          {rightsDecision.canPublish ? ' — प्रकाशनास परवानगी' : ' — खाजगी'}
                        </span>
                      </li>
                    )}
                  </>
                )}
              </ul>
            </div>
          )}

          {/* Composition identification — never silent: the matcher only
              suggests, and confirmation is an explicit user action. */}
          {phase === 'completed' && status && status.matches && (
            <div className="border-t border-saffron/10 pt-5 space-y-3">
              <h3 className="font-semibold text-foreground text-sm">संभाव्य रचना जुळणी</h3>

              {status.matches.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  सध्याच्या संग्रहात उच्च-आत्मविश्वासाची जुळणी आढळली नाही. मजकूर
                  पुनरावलोकनासाठी पाठवला आहे — समुदाय ते पडताळेल.
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {status.matches.map((match) => (
                    <li key={match.compositionId} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {match.titleMarathi || match.title}
                            {match.saintName ? ` — ${match.saintName}` : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            जुळणी: {(match.score * 100).toFixed(0)}% · पद्धत: {match.method}
                            {match.meetsThreshold ? ' · शिफारस केलेली' : ' · कमी आत्मविश्वास'}
                          </p>
                          {match.matchedText && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              “…{match.matchedText}…”
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {match.status === 'confirmed' ? (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                            ✓ तुम्ही पुष्टी केली
                          </span>
                        ) : match.status === 'rejected' ? (
                          <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                            नाकारले
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleMatchAction(match.compositionId, 'confirm')}
                              disabled={matchBusy !== null}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-saffron hover:bg-saffron/90 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                            >
                              {matchBusy === match.compositionId ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              होय, हीच रचना
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMatchAction(match.compositionId, 'reject')}
                              disabled={matchBusy !== null}
                              className="px-3 py-1.5 border border-border text-foreground hover:bg-muted text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                            >
                              नाही
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Corrected transcript — read-only diff view + manual correction
              box. Original ASR is always preserved verbatim; the user's edit
              is resubmitted through saveTranscriptCorrection with a fresh,
              honest word-level diff. */}
          {phase === 'completed' && status?.correction && (
            <div className="border-t border-saffron/10 pt-5 space-y-4">
              <div className="flex items-center gap-2">
                <PenLine className="w-4 h-4 text-saffron" />
                <h3 className="font-semibold text-foreground text-sm">
                  दुरुस्त केलेला मजकूर — बदल पडताळा
                </h3>
              </div>

              {/* Read-only diff: original ASR vs corrected, word-level highlights */}
              {status.correction.diffJson?.alignedLines?.length ? (
                <div className="rounded-xl border border-border divide-y divide-border overflow-hidden text-sm font-marathi leading-relaxed">
                  {status.correction.diffJson.alignedLines.map((line, i) => {
                    if (line.asr === '') {
                      // Canonical-only line — added by the correction, nothing
                      // in the ASR to compare.
                      return (
                        <div key={i} className="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20">
                          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mr-2">
                            जोडलेली ओळ
                          </span>
                          <span className="text-emerald-800 dark:text-emerald-300">{line.canonical}</span>
                        </div>
                      );
                    }
                    const changedOriginals = new Set((line.wordDiffs ?? []).map((d) => d.original).filter(Boolean));
                    const changedCorrecteds = new Set((line.wordDiffs ?? []).map((d) => d.corrected).filter(Boolean));
                    const hasChanges = (line.wordDiffs?.length ?? 0) > 0;
                    return (
                      <div key={i} className="p-2.5 space-y-1">
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide text-red-500 mt-1 w-14">
                            मूळ ASR
                          </span>
                          <span className="min-w-0">
                            <LineWords line={line.asr} changed={hasChanges ? changedOriginals : new Set()} tone="asr" />
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mt-1 w-14">
                            सुधारित
                          </span>
                          <span className="min-w-0">
                            {hasChanges ? (
                              <LineWords line={line.canonical} changed={changedCorrecteds} tone="corrected" />
                            ) : (
                              <span className="text-muted-foreground">{line.canonical}</span>
                            )}
                          </span>
                        </div>
                        {hasChanges && (
                          <p className="text-[10px] text-muted-foreground pl-16">
                            साम्य: {Math.round(line.similarity * 100)}% · {line.wordDiffs.length} शब्द बदलले
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  ओळ-स्तरीय बदल दाखवण्यासाठी पुरेशी माहिती उपलब्ध नाही.
                </p>
              )}

              <p className="text-xs text-muted-foreground space-y-1">
                <span className="block">
                  आत्मविश्वास: {status.correction.confidence != null ? `${(status.correction.confidence * 100).toFixed(0)}%` : '—'}
                  {status.correction.errorType ? ` · त्रुटी प्रकार: ${status.correction.errorType}` : ''}
                  {' · '}स्थिती:{' '}
                  {status.correction.status === 'approved'
                    ? 'मंजूर'
                    : status.correction.status === 'rejected'
                      ? 'नाकारले'
                      : 'पडताळणी प्रतीक्षेत'}
                </span>
                <span className="block">
                  मूळ ASR मजकूर कधीही बदलला जात नाही — वरील दुरुस्त्या फक्त उच्च-आत्मविश्वासाच्या
                  ओळींवर लागू झाल्या. खाली तुम्ही स्वतः मजकूर दुरुस्त करून पुन्हा पाठवू शकता.
                </span>
              </p>

              {/* Manual correction box */}
              <div className="space-y-2">
                <label htmlFor="record-manual-correction" className="text-sm font-medium text-muted-foreground block">
                  मजकूर दुरुस्त करा (ऐच्छिक) — मूळ ASR जसेच्या तसे जतन राहते
                </label>
                <textarea
                  id="record-manual-correction"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  className="w-full h-48 p-4 border border-saffron/30 focus:border-saffron focus:ring-2 focus:ring-saffron/20 bg-background rounded-lg text-sm outline-none font-marathi leading-relaxed resize-y transition-all"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleResubmitCorrection}
                    disabled={savingCorrection}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-saffron hover:bg-saffron/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {savingCorrection ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    दुरुस्ती पाठवा
                  </button>
                  {correctionMsg && (
                    <p
                      className={`text-xs ${
                        correctionMsg.startsWith('दुरुस्ती जतन झाली')
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {correctionMsg}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Result transcript */}
          {phase === 'completed' && status?.extractedText && (
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground text-sm">ट्रान्सक्राइब केलेला मजकूर</h3>
              <textarea
                readOnly
                value={status.extractedText}
                className="w-full h-56 p-4 border border-saffron/20 bg-muted/10 rounded-lg text-sm outline-none font-marathi leading-relaxed resize-y"
              />
              <p className="text-xs text-muted-foreground">
                {status.extractionConfidence != null
                  ? `ट्रान्सक्रिप्शन आत्मविश्वास: ${(status.extractionConfidence * 100).toFixed(0)}% — हे अंदाजे आहे, १००% अचूकतेचा दावा केला जात नाही.`
                  : 'ट्रान्सक्रिप्शन पूर्ण झाले.'}
              </p>
            </div>
          )}
        </div>

        {/* ── My Recordings ── */}
        <div className="bg-card border border-saffron/10 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-saffron" />
            <h2 className="font-marathiHeading text-lg font-bold text-maroon dark:text-saffron">
              माझ्या रेकॉर्डिंग्ज
            </h2>
            {recordingsLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Link
              href="/library/recordings"
              className="ml-auto text-xs font-bold text-saffron hover:underline flex items-center gap-1"
            >
              सर्व पहा
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recordings.length === 0 && !recordingsLoading ? (
            <p className="text-sm text-muted-foreground">
              अजून कोणत्याही रेकॉर्डिंग्ज नाहीत. वर रेकॉर्ड करून सुरुवात करा.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {recordings
                .filter((r) => r.format === 'audio')
                .slice(0, 10)
                .map((recording) => (
                  <li key={recording.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{recording.originalName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatDateTime(recording.createdAt)}
                        {recording.transcriptPreview ? ` — ${recording.transcriptPreview}…` : ''}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        recording.processingStatus === 'completed'
                          ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                          : recording.processingStatus === 'transcribing'
                            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                            : 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400'
                      }`}
                    >
                      {STATUS_LABELS[recording.processingStatus] ?? recording.processingStatus}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
