import * as React from 'react';
import {
  Cpu,
  RefreshCw,
  Loader2,
  Database,
  BarChart3,
  CheckCircle2,
  RotateCcw,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import type { AudioDashboardData, ModelRegistryData, TabId } from '../types';
import { fmtDate } from './StatusBadges';

interface ModelRegistryTabProps {
  data: AudioDashboardData;
  modelsData: ModelRegistryData | null;
  modelsLoading: boolean;
  modelsAction: string | null;
  onFetchModels: () => Promise<void>;
  onModelLifecycle: (action: string, modelVersionId?: string) => Promise<void>;
  onEvaluate: (modelVersionId: string) => Promise<void>;
  onNavigateTab: (tab: TabId) => void;
}

export function ModelRegistryTab({
  data,
  modelsData,
  modelsLoading,
  modelsAction,
  onFetchModels,
  onModelLifecycle,
  onEvaluate,
  onNavigateTab,
}: ModelRegistryTabProps) {
  return (
    <div className="p-5 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-purple-600 dark:text-purple-400 flex items-center gap-2">
          <Cpu className="h-4 w-4" /> मॉडेल आवृत्ती नोंदणी व मूल्यांकन (Model Registry + Eval)
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
            सक्रिय ASR:{' '}
            <strong>
              {modelsData?.activeAsr
                ? `${modelsData.activeAsr.modelName}@${modelsData.activeAsr.version}`
                : 'कोणीही नाही'}
            </strong>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400">
            गेट: WER ≤ {(modelsData?.gateThresholds?.wer ?? 0.3) * 100}% · CER ≤{' '}
            {(modelsData?.gateThresholds?.cer ?? 0.15) * 100}%
          </span>
          <button
            onClick={onFetchModels}
            disabled={modelsLoading}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground font-semibold transition-colors disabled:opacity-50"
          >
            {modelsLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
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
            onClick={() => onNavigateTab('discovery')}
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
              पुनरावलोकन रांग{' '}
              <span className="text-foreground font-semibold">
                (OCR {data.discovery.reviewQueue.ocr})
              </span>
            </p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {data.discovery.variants.total}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              व्हेरिएंट नोंदी{' '}
              <span className="text-foreground font-semibold">
                (OCR {data.discovery.variants.ocrVariant})
              </span>
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
          {(modelsData?.models ?? []).map((m) => {
            const latest = m.latestRun;
            const canActivate =
              (m.status === 'candidate' || m.status === 'rolled_back' || m.status === 'retired') &&
              latest?.status === 'passed';
            const busy =
              modelsAction === `activate:${m.id}` ||
              modelsAction === `rollback:${m.id}` ||
              modelsAction === `retire:${m.id}` ||
              modelsAction === `evaluate:${m.id}`;
            return (
              <li key={m.id} className="p-3 text-sm space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {m.modelName} <span className="text-muted-foreground">v{m.version}</span>
                      <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                        key: {m.versionKey}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.modelType} · {m.provider}
                      {m.notes ? ` · ${m.notes}` : ''}
                    </p>
                    {latest && (
                      <p className="text-xs mt-1 space-x-2">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            latest.status === 'passed'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : latest.status === 'failed'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {latest.status === 'passed' ? '✓' : latest.status === 'failed' ? '✗' : '~'}{' '}
                          शेवटचे मूल्यांकन: {latest.status}
                        </span>
                        <span className="text-muted-foreground">
                          WER {latest.wer != null ? `${(latest.wer * 100).toFixed(1)}%` : '—'} ·
                          CER {latest.cer != null ? `${(latest.cer * 100).toFixed(1)}%` : '—'} ·{' '}
                          {latest.samplesEvaluated} नमुने
                        </span>
                        {latest.datasetName && (
                          <span className="text-muted-foreground">· {latest.datasetName}</span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        m.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : m.status === 'candidate'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                            : m.status === 'rolled_back'
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
                              : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {m.status === 'active'
                        ? 'सक्रिय'
                        : m.status === 'candidate'
                          ? 'उमेदवार'
                          : m.status === 'rolled_back'
                            ? 'रोलबॅक'
                            : 'निवृत्त'}
                    </span>
                    {m.status !== 'active' && (
                      <button
                        onClick={() => onEvaluate(m.id)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {modelsAction === `evaluate:${m.id}` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Activity className="h-3 w-3" />
                        )}
                        मूल्यांकन
                      </button>
                    )}
                    {canActivate && (
                      <button
                        onClick={() => onModelLifecycle('activate', m.id)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {modelsAction === `activate:${m.id}` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        सक्रिय करा
                      </button>
                    )}
                    {!canActivate && m.status !== 'active' && latest && latest.status !== 'passed' && (
                      <span
                        className="text-[11px] text-muted-foreground"
                        title="सक्रियतेसाठी उत्तीर्ण मूल्यांकन आवश्यक"
                      >
                        (गेट उत्तीर्ण नाही)
                      </span>
                    )}
                    {m.status === 'active' && (
                      <button
                        onClick={() => onModelLifecycle('rollback', m.id)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {modelsAction === `rollback:${m.id}` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        रोलबॅक
                      </button>
                    )}
                    {m.status !== 'active' && m.status !== 'retired' && (
                      <button
                        onClick={() => onModelLifecycle('retire', m.id)}
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
            onClick={() => onModelLifecycle('seed')}
            disabled={modelsAction === 'seed:'}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {modelsAction === 'seed:' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            गोल्डन डेटासेट बियाणे
          </button>
        </div>
        {(modelsData?.datasets ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            अद्याप कोणतेही डेटासेट नाहीत. 'गोल्डन डेटासेट बियाणे' दाबून कॅटलॉगमधून गोठवलेला सेट तयार करा.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {(modelsData?.datasets ?? []).map((d) => (
              <li key={d.id} className="p-3 text-sm space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">
                    {d.name} <span className="text-muted-foreground">v{d.version}</span>
                  </p>
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      d.status === 'frozen'
                        ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    }`}
                  >
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
            {(modelsData?.recentRuns ?? []).slice(0, 10).map((r) => (
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
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
                      r.status === 'passed'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : r.status === 'failed'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {r.status}
                  </span>
                  <p className="text-muted-foreground mt-0.5">
                    WER {r.wer != null ? `${(r.wer * 100).toFixed(1)}%` : '—'} · CER{' '}
                    {r.cer != null ? `${(r.cer * 100).toFixed(1)}%` : '—'} · {r.samplesEvaluated} नमुने
                    {r.baseline?.wer != null && r.wer != null && (
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
                <span
                  key={v}
                  className="text-xs font-mono px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400"
                >
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
              <p>
                विश्लेषित अॅसेट्स: <strong>{data.audioQuality.analyzedCount}</strong>
              </p>
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
  );
}
