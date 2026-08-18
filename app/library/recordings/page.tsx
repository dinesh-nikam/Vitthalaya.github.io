'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Mic,
  Loader2,
  Play,
  Pause,
  Trash2,
  PenLine,
  Bookmark,
  BookmarkCheck,
  Clock,
  AlertCircle,
  FileAudio,
  Music,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

interface RecordingVersion {
  id: string;
  label: string;
  url: string;
  sizeBytes: number;
}

interface RecordingDto {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  processingStatus: string;
  createdAt: string;
  audioUrl: string | null;
  versions: RecordingVersion[];
  transcript: string | null;
  extractionConfidence: number | null;
  transcriptionMethod: string | null;
  bookmarked: boolean;
  lastPlayedAt: string | null;
  durationSeconds: number | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'प्रतीक्षेत',
  uploading: 'अपलोड होत आहे',
  processing: 'प्रक्रिया चालू आहे',
  transcribing: 'लिप्यंतरण होत आहे',
  completed: 'पूर्ण',
  failed: 'अयशस्वी',
};

export default function MyRecordingsPage() {
  const { status } = useSession();
  const [recordings, setRecordings] = React.useState<RecordingDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState('');
  const [nowPlayingId, setNowPlayingId] = React.useState<string | null>(null);
  const [deletedId, setDeletedId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/library/recordings');
      if (res.status === 401) {
        setError('कृपया लॉगिन करा.');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { recordings: RecordingDto[] };
      setRecordings(data.recordings);
    } catch {
      setError('रेकॉर्डिंग्स लोड करता आल्या नाहीत.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (status === 'authenticated') void load();
    if (status === 'unauthenticated') {
      setLoading(false);
      setError('कृपया लॉगिन करा.');
    }
  }, [status, load]);

  // Cleanup the "deleted" banner after a few seconds.
  React.useEffect(() => {
    if (!deletedId) return;
    const t = setTimeout(() => setDeletedId(null), 4000);
    return () => clearTimeout(t);
  }, [deletedId]);

  const playRecording = (rec: RecordingDto) => {
    if (!rec.audioUrl) return;
    window.dispatchEvent(
      new CustomEvent('play-track', {
        detail: {
          track: {
            id: rec.id,
            titleMarathi: rec.originalName,
            titleTranslit: rec.originalName,
            saintName: 'माझी रेकॉर्डिंग',
            audioUrl: rec.audioUrl,
            lyrics: rec.transcript
              ? rec.transcript
                  .split('\n')
                  .filter((l) => l.trim().length > 0)
                  .map((text) => ({ text: text.trim() }))
              : [],
          },
        },
      })
    );
    setNowPlayingId(rec.id);
  };

  const toggleBookmark = async (rec: RecordingDto) => {
    setBusyId(rec.id);
    try {
      const res = await fetch(`/api/library/recordings/${rec.id}/bookmark`, { method: 'POST' });
      if (!res.ok) throw new Error('bookmark failed');
      const data = (await res.json()) as { bookmarked: boolean };
      setRecordings((prev) =>
        prev.map((r) => (r.id === rec.id ? { ...r, bookmarked: data.bookmarked } : r))
      );
    } catch {
      // keep UI stable
    } finally {
      setBusyId(null);
    }
  };

  const startRename = (rec: RecordingDto) => {
    setRenamingId(rec.id);
    setRenameValue(rec.originalName);
  };

  const submitRename = async (rec: RecordingDto) => {
    const name = renameValue.trim();
    if (!name || name === rec.originalName) {
      setRenamingId(null);
      return;
    }
    setBusyId(rec.id);
    try {
      const res = await fetch(`/api/library/recordings/${rec.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('rename failed');
      setRecordings((prev) => prev.map((r) => (r.id === rec.id ? { ...r, originalName: name } : r)));
    } catch {
      // keep UI stable
    } finally {
      setBusyId(null);
      setRenamingId(null);
    }
  };

  const deleteRecording = async (rec: RecordingDto) => {
    if (!window.confirm(`'${rec.originalName}' कायमचे हटवायचे? (ऑडिओ, वर्धित आवृत्ती आणि लिप्यंतरण सर्व हटवले जाईल)`)) {
      return;
    }
    setBusyId(rec.id);
    try {
      const res = await fetch(`/api/library/recordings/${rec.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      setRecordings((prev) => prev.filter((r) => r.id !== rec.id));
      setDeletedId(rec.id);
    } catch {
      // keep UI stable
    } finally {
      setBusyId(null);
    }
  };

  const formatBytes = (b: number) => {
    if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.round(b / 1024)} KB`;
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('mr-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-marathiHeading text-foreground flex items-center gap-2">
              <Mic className="w-6 h-6 text-saffron" /> माझ्या रेकॉर्डिंग्ज
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              तुमच्या रेकॉर्डिंग्स — प्ले, नाव बदला, बुकमार्क करा, हटवा.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/record"
              className="px-4 py-2 rounded-lg bg-saffron text-white text-sm font-bold hover:bg-saffron/90 transition-colors"
            >
              नवीन रेकॉर्डिंग
            </Link>
            <Link
              href="/library"
              className="px-4 py-2 rounded-lg border border-border text-sm font-bold hover:bg-muted transition-colors"
            >
              रचना लायब्ररी
            </Link>
          </div>
        </header>

        {deletedId && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> रेकॉर्डिंग हटवली गेली.
          </div>
        )}

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
            {status === 'unauthenticated' && (
              <Link href="/login" className="underline font-bold ml-1">
                लॉगिन करा
              </Link>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-saffron" />
          </div>
        ) : recordings.length === 0 && !error ? (
          <div className="py-16 text-center">
            <FileAudio className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-lg font-bold font-marathi text-foreground">अजून कोणतीही रेकॉर्डिंग नाही</p>
            <p className="text-sm text-muted-foreground mt-1">
              पहिली रेकॉर्डिंग करून तुमची खाजगी लायब्ररी सुरू करा.
            </p>
            <Link
              href="/record"
              className="inline-block mt-4 px-5 py-2.5 rounded-lg bg-saffron text-white text-sm font-bold hover:bg-saffron/90 transition-colors"
            >
              रेकॉर्ड करा
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recordings.map((rec) => (
              <div
                key={rec.id}
                className="rounded-xl border border-border bg-card p-4 hover:border-saffron/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => playRecording(rec)}
                    disabled={!rec.audioUrl}
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      rec.audioUrl
                        ? 'bg-saffron text-white hover:scale-105'
                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                    title={rec.audioUrl ? 'प्ले करा' : 'ऑडिओ तयार नाही अजून'}
                  >
                    {nowPlayingId === rec.id ? (
                      <Pause className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white translate-x-0.5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    {renamingId === rec.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && submitRename(rec)}
                          className="flex-1 px-2 py-1 rounded-md border border-saffron/40 bg-background text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => submitRename(rec)}
                          className="px-3 py-1 rounded-md bg-saffron text-white text-xs font-bold"
                        >
                          जतन करा
                        </button>
                        <button
                          onClick={() => setRenamingId(null)}
                          className="px-2 py-1 rounded-md border border-border text-xs"
                        >
                          रद्द
                        </button>
                      </div>
                    ) : (
                      <h3 className="font-bold font-marathi text-foreground truncate">
                        {rec.originalName}
                      </h3>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.processingStatus === 'completed'
                            ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
                            : rec.processingStatus === 'failed'
                              ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {STATUS_LABELS[rec.processingStatus] ?? rec.processingStatus}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(rec.createdAt)}
                      </span>
                      <span>{formatBytes(rec.sizeBytes)}</span>
                      {rec.transcriptionMethod && <span>{rec.transcriptionMethod}</span>}
                      {rec.extractionConfidence !== null && (
                        <span>विश्वास {Math.round(rec.extractionConfidence * 100)}%</span>
                      )}
                      {rec.versions.length > 0 && (
                        <span className="text-[10px] text-muted-foreground/70">
                          {rec.versions.map((v) => (v.label === 'enhanced' ? 'वर्धित' : 'मूळ')).join(' + ')}
                        </span>
                      )}
                    </div>

                    {rec.transcript && (
                      <details className="mt-2">
                        <summary className="text-xs text-saffron font-bold cursor-pointer">
                          लिप्यंतरण पहा ({rec.transcript.split('\n').filter(Boolean).length} ओळी)
                        </summary>
                        <pre className="mt-2 p-3 rounded-lg bg-muted/50 font-marathi text-sm whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                          {rec.transcript}
                        </pre>
                      </details>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => startRename(rec)}
                      className="p-1.5 rounded-md border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="नाव बदला"
                    >
                      <PenLine className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleBookmark(rec)}
                      disabled={busyId === rec.id}
                      className={`p-1.5 rounded-md border transition-colors ${
                        rec.bookmarked
                          ? 'bg-saffron/10 border-saffron/40 text-saffron'
                          : 'border-border hover:bg-muted text-muted-foreground'
                      }`}
                      title={rec.bookmarked ? 'बुकमार्क काढा' : 'बुकमार्क करा'}
                    >
                      {rec.bookmarked ? (
                        <BookmarkCheck className="w-4 h-4" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteRecording(rec)}
                      disabled={busyId === rec.id}
                      className="p-1.5 rounded-md border border-border hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                      title="हटवा"
                    >
                      {busyId === rec.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {recordings.length > 0 && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Music className="w-3 h-3 inline mr-1" />
            रेकॉर्डिंग्स खाजगी आहेत — फक्त तुम्हीच पाहू शकता.
          </p>
        )}
      </div>
    </div>
  );
}
