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
  Activity,
  FileDiff,
  BarChart3,
} from 'lucide-react';

import type { TabConfig } from './types';
import { RIGHTS_STATUS_LABELS } from './components/StatusBadges';
import { useAdminAudioDashboard } from './hooks/useAdminAudioDashboard';
import { RecordingsTab } from './components/RecordingsTab';
import { ProcessingQueueTab } from './components/ProcessingQueueTab';
import { FailedUploadsTab } from './components/FailedUploadsTab';
import { LowConfidenceTab } from './components/LowConfidenceTab';
import { RightsRecordsTab } from './components/RightsRecordsTab';
import { ModelRegistryTab } from './components/ModelRegistryTab';
import { CorrectionsTab } from './components/CorrectionsTab';
import { DiscoveryMetricsTab } from './components/DiscoveryMetricsTab';
import { CorrectionReviewModal } from './components/CorrectionReviewModal';

const TABS: TabConfig[] = [
  { id: 'recordings', label: 'रेकॉर्डिंग रांग', icon: <Mic className="h-4 w-4" /> },
  { id: 'processing', label: 'प्रोसेसिंग रांग', icon: <AudioLines className="h-4 w-4" /> },
  { id: 'failed', label: 'अयशस्वी', icon: <AlertTriangle className="h-4 w-4" /> },
  { id: 'lowconfidence', label: 'कमी आत्मविश्वास', icon: <Activity className="h-4 w-4" /> },
  { id: 'rights', label: 'राइट्स स्थिती', icon: <ShieldCheck className="h-4 w-4" /> },
  { id: 'models', label: 'मॉडेल आवृत्त्या', icon: <Cpu className="h-4 w-4" /> },
  { id: 'corrections', label: 'सुधारणा', icon: <FileDiff className="h-4 w-4" /> },
  { id: 'discovery', label: 'डिस्कव्हरी', icon: <BarChart3 className="h-4 w-4" /> },
];

export default function AdminAudioDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const {
    data,
    loading,
    error,
    toast,
    activeTab,
    setActiveTab,
    retrying,
    corrFilter,
    setCorrFilter,
    reviewing,
    setReviewing,
    verifyBusy,
    verifyNotes,
    setVerifyNotes,
    modelsData,
    modelsLoading,
    modelsAction,
    fetchData,
    fetchModels,
    handleModelLifecycle,
    handleEvaluate,
    handleRetry,
    handleVerify,
  } = useAdminAudioDashboard(sessionStatus);

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-saffron" />
      </div>
    );
  }

  const role = (session?.user as { role?: string })?.role;
  if (sessionStatus === 'unauthenticated' || role !== 'ADMIN') {
    router.replace('/');
    return null;
  }

  const stats = data?.stats;

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
              <p className="text-sand-200 text-sm mt-1">
                Audio Dashboard — रेकॉर्डिंग्ज, प्रोसेसिंग, राइट्स व मॉडेल्स
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
            <button onClick={fetchData} className="ml-3 underline font-semibold">
              पुन्हा प्रयत्न करा
            </button>
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
                  <p className="text-sm text-gray-500 dark:text-muted-foreground mt-1">
                    {card.label}
                  </p>
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
                  <span
                    key={status}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-sm"
                  >
                    <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                      {count}
                    </span>
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
                  रचना जुळणी: {stats!.matches.candidate ?? 0} प्रलंबित ·{' '}
                  {stats!.matches.confirmed ?? 0} पुष्टीकृत · {stats!.matches.rejected ?? 0} नाकारलेल्या
                </p>
              )}
            </div>

            {/* Tab navigation bar */}
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

            {/* Tab contents */}
            <div className="bg-white dark:bg-card rounded-xl shadow-sm overflow-hidden">
              {activeTab === 'recordings' && (
                <RecordingsTab recordings={data.recordings} />
              )}

              {activeTab === 'processing' && (
                <ProcessingQueueTab
                  processingQueue={data.processingQueue}
                  retrying={retrying}
                  onRetry={handleRetry}
                />
              )}

              {activeTab === 'failed' && (
                <FailedUploadsTab failedUploads={data.failedUploads} />
              )}

              {activeTab === 'lowconfidence' && (
                <LowConfidenceTab
                  lowConfidence={data.lowConfidence}
                  lowConfidenceThreshold={data.lowConfidenceThreshold}
                />
              )}

              {activeTab === 'rights' && (
                <RightsRecordsTab rightsRecords={data.rightsRecords} />
              )}

              {activeTab === 'models' && (
                <ModelRegistryTab
                  data={data}
                  modelsData={modelsData}
                  modelsLoading={modelsLoading}
                  modelsAction={modelsAction}
                  onFetchModels={fetchModels}
                  onModelLifecycle={handleModelLifecycle}
                  onEvaluate={handleEvaluate}
                  onNavigateTab={setActiveTab}
                />
              )}

              {activeTab === 'corrections' && (
                <CorrectionsTab
                  stats={stats!}
                  corrections={data.corrections}
                  corrFilter={corrFilter}
                  onFilterChange={setCorrFilter}
                  onSelectCorrection={(c) => {
                    setReviewing(c);
                    setVerifyNotes('');
                  }}
                />
              )}

              {activeTab === 'discovery' && (
                <DiscoveryMetricsTab discovery={data.discovery} />
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

      {reviewing && (
        <CorrectionReviewModal
          reviewing={reviewing}
          verifyBusy={verifyBusy}
          verifyNotes={verifyNotes}
          onNotesChange={setVerifyNotes}
          onClose={() => setReviewing(null)}
          onVerify={handleVerify}
        />
      )}
    </div>
  );
}
