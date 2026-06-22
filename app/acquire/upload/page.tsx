'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import {
  Upload,
  FileImage,
  FileText,
  FileAudio,
  FileVideo,
  Youtube,
  File,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  UserCheck,
  BookOpen,
  X,
} from 'lucide-react';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────

type UploadTab = 'file' | 'youtube';

interface UploadResult {
  uploadId: string;
  fileUrl?: string;
  videoId?: string;
  extractedText: string;
  title: string;
  queueId: string;
  format: string;
  formatLabel: string;
  confidence: number;
  textLength: number;
  metadata?: Record<string, unknown>;
  message?: string;
}

interface ProgressStep {
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  image: <FileImage className="w-5 h-5" />,
  pdf: <FileText className="w-5 h-5" />,
  document: <FileText className="w-5 h-5" />,
  ebook: <BookOpen className="w-5 h-5" />,
  audio: <FileAudio className="w-5 h-5" />,
  video: <FileVideo className="w-5 h-5" />,
  youtube: <Youtube className="w-5 h-5" />,
};

const FORMAT_ACCEPTS: Record<string, string> = {
  image: 'image/jpeg,image/png,image/webp,image/tiff,image/bmp,image/heic',
  pdf: 'application/pdf',
  document: '.doc,.docx,.txt,.rtf,.odt,.md',
  ebook: '.epub,.mobi,.azw',
  audio: 'audio/mpeg,audio/wav,audio/aac,audio/ogg,audio/flac,audio/x-m4a',
  video: 'video/mp4,video/quicktime,video/x-matroska,video/avi,video/webm',
};

const FORMAT_DESCRIPTIONS: Record<string, string> = {
  image: 'JPG, PNG, WebP, TIFF, BMP, HEIC (max 20MB)',
  pdf: 'PDF documents (max 100MB)',
  document: 'DOCX, TXT, RTF, ODT, MD (max 25MB)',
  ebook: 'EPUB, MOBI, AZW (max 50MB)',
  audio: 'MP3, WAV, AAC, OGG, FLAC, M4A (max 200MB)',
  video: 'MP4, MOV, MKV, AVI, WebM (max 500MB)',
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const { data: session, status } = useSession();

  // ── State ──
  const [activeTab, setActiveTab] = React.useState<UploadTab>('file');
  const [selectedFormat, setSelectedFormat] = React.useState<string | null>(null);

  // File upload state
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState('');

  // YouTube state
  const [youtubeUrl, setYoutubeUrl] = React.useState('');

  // Processing state
  const [loading, setLoading] = React.useState(false);
  const [progressSteps, setProgressSteps] = React.useState<ProgressStep[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<UploadResult | null>(null);

  // Drag state
  const [isDragActive, setIsDragActive] = React.useState(false);

  // ── Helpers ──

  const getProgressStepsForFormat = (format: string): ProgressStep[] => {
    const base = [
      { label: 'फाइल अपलोड करत आहे...', status: 'pending' as const },
    ];
    if (format === 'image') {
      base.push(
        { label: 'प्रतिमा सुधारणा (Enhancement)...', status: 'pending' as const },
        { label: 'ओसीआर इंजिन चालवित आहे (OCR)...', status: 'pending' as const },
        { label: 'बहु-इंजिन निकाल एकत्र करत आहे (Consensus)...', status: 'pending' as const },
      );
    } else if (format === 'pdf') {
      base.push(
        { label: 'पीडीएफ विश्लेषण करत आहे...', status: 'pending' as const },
        { label: 'मजकूर काढत आहे...', status: 'pending' as const },
      );
    } else if (format === 'youtube') {
      base.push(
        { label: 'यूट्यूब मेटाडेटा मिळवत आहे...', status: 'pending' as const },
        { label: 'कॅप्शन / लिरिक्स काढत आहे...', status: 'pending' as const },
      );
    } else if (format === 'audio') {
      base.push(
        { label: 'ऑडिओ प्रक्रिया करत आहे...', status: 'pending' as const },
        { label: 'स्पीच-टू-टेक्स्ट (व्हिस्पर)...', status: 'pending' as const },
        { label: 'श्लोक शोधत आहे...', status: 'pending' as const },
      );
    } else {
      base.push({ label: 'मजकूर काढत आहे...', status: 'pending' as const });
    }
    base.push(
      { label: 'मेटाडेटा तयार करत आहे...', status: 'pending' as const },
      { label: 'पुनरावलोकन श्रेणीत पाठवत आहे...', status: 'pending' as const },
    );
    return base;
  };

  const updateProgress = (index: number, status: ProgressStep['status']) => {
    setProgressSteps(prev =>
      prev.map((step, i) => (i === index ? { ...step, status } : step))
    );
  };

  const simulateProgress = async (steps: ProgressStep[]) => {
    for (let i = 0; i < steps.length; i++) {
      updateProgress(i, 'active');
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
      updateProgress(i, 'done');
    }
  };

  // ── File Handlers ──

  const handleFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setResult(null);

    // Detect format from extension
    const ext = selectedFile.name.split('.').pop()?.toLowerCase() ?? '';
    const detectedFormat = detectFormat(ext, selectedFile.type);
    setSelectedFormat(detectedFormat);

    // Generate preview for images
    if (detectedFormat === 'image' && selectedFile.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else if (detectedFormat === 'audio') {
      setPreviewUrl(null);
    } else {
      setPreviewUrl(null);
    }
  };

  const detectFormat = (ext: string, mime: string): string => {
    const formatMap: Record<string, string> = {
      'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'webp': 'image',
      'tiff': 'image', 'tif': 'image', 'bmp': 'image', 'heic': 'image',
      'pdf': 'pdf',
      'doc': 'document', 'docx': 'document', 'txt': 'document',
      'rtf': 'document', 'odt': 'document', 'md': 'document',
      'epub': 'ebook', 'mobi': 'ebook', 'azw': 'ebook',
      'mp3': 'audio', 'wav': 'audio', 'aac': 'audio',
      'ogg': 'audio', 'flac': 'audio', 'm4a': 'audio',
      'mp4': 'video', 'mov': 'video', 'mkv': 'video',
      'avi': 'video', 'webm': 'video',
    };

    if (formatMap[ext]) return formatMap[ext];
    if (mime.startsWith('image/')) return 'image';
    if (mime === 'application/pdf') return 'pdf';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime.startsWith('video/')) return 'video';
    return 'document';
  };

  const removeFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setSelectedFormat(null);
    setError(null);
  };

  // ── Drag Handlers ──

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // ── Submit ──

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !youtubeUrl) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      const format = activeTab === 'youtube' ? 'youtube' : selectedFormat || 'document';

      const steps = getProgressStepsForFormat(format);
      setProgressSteps(steps);
      updateProgress(0, 'active');

      if (activeTab === 'youtube') {
        formData.append('url', youtubeUrl);
      } else if (file) {
        formData.append('file', file);
      }

      if (title) formData.append('title', title);

      // Small delay for first step visibility
      await new Promise(r => setTimeout(r, 400));
      updateProgress(0, 'done');

      // Trigger background progress simulation
      const progressPromise = simulateProgress(steps.slice(1));

      // Actual API call
      const response = await fetch('/api/acquire/upload', {
        method: 'POST',
        body: formData,
      });

      await progressPromise;

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'प्रक्रिया अयशस्वी झाली.');
      }

      setResult({
        uploadId: data.uploadId,
        fileUrl: data.fileUrl,
        videoId: data.videoId,
        extractedText: data.extractedText,
        title: data.title || 'अज्ञात शीर्षक',
        queueId: data.queueId,
        format: data.format || format,
        formatLabel: data.formatLabel || format,
        confidence: data.confidence || 0,
        textLength: data.textLength || 0,
        metadata: data.metadata,
        message: data.message,
      });

      setError(null);
    } catch (err: any) {
      setError(err.message || 'फाइल प्रक्रिया करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setTitle('');
    setYoutubeUrl('');
    setSelectedFormat(null);
    setProgressSteps([]);
  };

  // ── Auth States ──

  if (status === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-saffron" />
      </div>
    );
  }

  if (status === 'unauthenticated' || !session) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
        <div className="bg-card border-2 border-saffron/20 p-10 rounded-2xl shadow-xl space-y-6">
          <div className="w-20 h-20 bg-saffron/10 text-saffron rounded-full flex items-center justify-center mx-auto">
            <Upload className="w-10 h-10" />
          </div>
          <h1 className="font-marathiHeading text-2xl sm:text-3xl font-bold text-maroon dark:text-saffron">
            योगदान देण्यासाठी लॉग इन करा
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            डिजिटल पंढरपूर हा एक सामूहिक वारकरी प्रकल्प आहे.
            भक्ती साहित्य अपलोड करण्यासाठी कृपया लॉग इन करा.
          </p>
          <div className="pt-4">
            <Link
              href={`/auth/signin?callbackUrl=${encodeURIComponent('/acquire/upload')}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-saffron hover:bg-saffron/90 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              <UserCheck className="w-5 h-5" />
              <span>लॉगिन करा आणि योगदान द्या</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Main UI ──

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="ब्रेडक्रंब">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-saffron">मुख्यपृष्ठ</Link>
          </li>
          <li aria-hidden="true">›</li>
          <li className="text-foreground">योगदान</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl sm:text-4xl font-marathiHeading text-maroon dark:text-saffron font-bold">
          भक्ती साहित्य अपलोड करा
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
            प्रतिमा, पीडीएफ, डॉक्युमेंट, ई-पुस्तक, ऑडिओ, व्हिडिओ किंवा यूट्यूब लिंक — कोणतेही भक्ती साहित्य अपलोड करा.
            AI आपोआप मजकूर, मेटाडेटा आणि वर्गीकरण काढेल.
          </p>
        </header>

      {/* Main Content */}
      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tabs */}
          <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => { setActiveTab('file'); setError(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'file' ? 'bg-saffron text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>फाइल अपलोड</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('youtube'); setError(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'youtube' ? 'bg-saffron text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Youtube className="w-4 h-4" />
              <span>YouTube URL</span>
            </button>
          </div>

          {/* Tab: YouTube */}
          {activeTab === 'youtube' && (
            <div className="bg-card border border-saffron/10 rounded-2xl p-6 space-y-4 shadow-sm">
              <label className="text-sm font-semibold text-maroon dark:text-saffron block">
                YouTube लिंक टाका
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="flex-1 px-4 py-3 border border-saffron/20 focus:border-saffron focus:ring-2 focus:ring-saffron/20 bg-background rounded-lg text-sm outline-none transition-all"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                कोणत्याही YouTube व्हिडिओची लिंक टाका. AI आपोआप मेटाडेटा, कॅप्शन आणि लिरिक्स काढेल.
              </p>
            </div>
          )}

          {/* Tab: File */}
          {activeTab === 'file' && (
            <>
              {/* Format selector chips */}
              <div className="flex flex-wrap gap-2">
                {['image', 'pdf', 'document', 'ebook', 'audio', 'video'].map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setSelectedFormat(fmt)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                      selectedFormat === fmt
                        ? 'bg-saffron/10 border-saffron text-saffron'
                        : 'bg-card border-saffron/10 text-muted-foreground hover:border-saffron/30 hover:text-foreground'
                    }`}
                  >
                    {FORMAT_ICONS[fmt]}
                    <span className="capitalize">{fmt}</span>
                  </button>
                ))}
              </div>

              {/* Dropzone */}
              <div className="bg-card border border-saffron/10 rounded-2xl p-6 space-y-6 shadow-sm">
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-input')?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? 'border-saffron bg-saffron/5'
                      : 'border-saffron/20 hover:border-saffron/50 hover:bg-muted/30'
                  }`}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept={
                      selectedFormat
                        ? FORMAT_ACCEPTS[selectedFormat] ?? '*'
                        : 'image/*,application/pdf,.doc,.docx,.txt,.epub,.mobi,.mp3,.wav,.mp4'
                    }
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                  />

                  {file ? (
                    <div className="space-y-3">
                      {/* Image preview */}
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="प्रिव्ह्यू"
                          className="max-h-[200px] mx-auto rounded border border-saffron/20 shadow-md object-contain"
                        />
                      ) : (
                        <div className="flex justify-center">
                          <div className="w-20 h-20 rounded-full bg-saffron/10 flex items-center justify-center">
                            {FORMAT_ICONS[selectedFormat ?? 'document'] ?? <File className="w-8 h-8 text-saffron" />}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm font-medium">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / 1024 / 1024).toFixed(1)}MB)
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeFile(); }}
                          className="p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 py-4">
                      <Upload className="w-12 h-12 text-saffron mx-auto" />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          फाइल येथे ड्रॅग करा किंवा क्लिक करा
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedFormat
                            ? FORMAT_DESCRIPTIONS[selectedFormat]
                            : 'सर्व फॉरमॅट्स स्वीकारले जातात (प्रतिमा, PDF, DOCX, EPUB, ऑडिओ, व्हिडिओ)'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Title field */}
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-semibold text-maroon dark:text-saffron">
                    शीर्षक (Title) — ऐच्छिक
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="AI स्वयंचलितपणे शीर्षक शोधेल"
                    className="w-full px-4 py-2 border border-saffron/20 focus:border-saffron focus:ring-2 focus:ring-saffron/20 bg-background rounded-lg text-sm outline-none transition-all"
                  />
                </div>
              </div>
            </>
          )}

          {/* Error display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3 flex gap-2 items-start text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Submit button */}
          <div className="flex justify-end gap-3">
            {(file || youtubeUrl) && (
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="px-5 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted text-foreground transition-colors disabled:opacity-50"
              >
                साफ करा
              </button>
            )}
            <button
              type="submit"
              disabled={
                loading ||
                (activeTab === 'file' && !file) ||
                (activeTab === 'youtube' && !youtubeUrl)
              }
              className="flex items-center gap-2 px-6 py-2.5 bg-saffron hover:bg-saffron/90 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>प्रक्रिया सुरू आहे...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>अपलोड करा आणि प्रक्रिया सुरू करा</span>
                </>
              )}
            </button>
          </div>

          {/* Progress steps */}
          {loading && progressSteps.length > 0 && (
            <div className="bg-saffron/5 border border-saffron/20 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-saffron font-bold text-sm mb-2">
                <Sparkles className="w-4 h-4" />
                <span>डिजिटल पंढरपूर AI प्रक्रिया:</span>
              </div>
              <div className="space-y-2">
                {progressSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {step.status === 'pending' && (
                      <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    {step.status === 'active' && (
                      <Loader2 className="w-5 h-5 animate-spin text-saffron" />
                    )}
                    {step.status === 'done' && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    )}
                    {step.status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className={
                      step.status === 'active' ? 'text-saffron font-medium' :
                      step.status === 'done' ? 'text-emerald-600 dark:text-emerald-400' :
                      'text-muted-foreground'
                    }>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      ) : (
        /* ── RESULT VIEW ── */
        <div className="space-y-6">
          {/* Success banner */}
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-xl p-4 flex gap-3 items-start text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
            <div className="space-y-1">
              <p className="font-bold">फाइल यशस्वीरित्या प्रक्रिया केली गेली!</p>
              <p className="text-xs text-muted-foreground">
                {result.message || `प्रकार: ${result.formatLabel} | आत्मविश्वास: ${(result.confidence * 100).toFixed(0)}% | पुनरावलोकन क्यू ID: ${result.queueId}`}
              </p>
            </div>
          </div>

          {/* Content display */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Source info */}
            <div className="bg-card border border-saffron/10 rounded-2xl p-5 space-y-3">
              <h2 className="font-marathiHeading text-md font-bold text-maroon dark:text-saffron flex items-center gap-2">
                {FORMAT_ICONS[result.format] ?? <File className="w-5 h-5" />}
                <span>अपलोड माहिती</span>
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">शीर्षक:</span>
                  <span className="font-medium text-right">{result.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">प्रकार:</span>
                  <span className="font-medium">{result.formatLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">आत्मविश्वास:</span>
                  <span className="font-medium">{(result.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">मजकूर लांबी:</span>
                  <span className="font-medium">{result.textLength} अक्षरे</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">स्थिती:</span>
                  <span className="font-medium text-amber-600">पुनरावलोकन प्रतीक्षेत</span>
                </div>
              </div>

              {result.metadata && (
                <div className="pt-2 border-t border-saffron/10 space-y-1">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    मेटाडेटा
                  </h3>
                  {Object.entries(result.metadata).slice(0, 6).map(([key, val]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="font-medium truncate ml-2 max-w-[200px]">
                        {String(val ?? '-')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Extracted text */}
            <div className="bg-card border border-saffron/10 rounded-2xl p-5 space-y-3 flex flex-col">
              <h2 className="font-marathiHeading text-md font-bold text-maroon dark:text-saffron">
                काढलेला मजकूर
              </h2>
              <div className="flex-1">
                <textarea
                  readOnly
                  value={result.extractedText || '(कोणताही मजकूर आढळला नाही)'}
                  className="w-full h-[300px] p-4 border border-saffron/20 bg-muted/10 rounded-lg text-sm outline-none font-marathi leading-relaxed resize-y"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleReset}
              className="px-5 py-2 bg-saffron text-white text-sm font-semibold rounded-lg hover:bg-saffron/90 transition-colors shadow"
            >
              आणखी एक अपलोड करा
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-5 py-2 border border-border text-foreground hover:bg-muted text-sm font-semibold rounded-lg transition-colors"
            >
              <span>मुख्यपृष्ठ जा</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
